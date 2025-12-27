/**
 * DocPal Database SharedWorker
 * 
 * A SharedWorker that manages PGlite with OPFS storage.
 * This worker is shared across all browser tabs for:
 * - Single database instance
 * - Efficient resource usage
 * - Consistent state across tabs
 * - Background sync operations
 * 
 * @see https://pglite.dev/docs/multi-tab-worker
 */

// PGlite import - will be loaded dynamically to handle WASM properly
let PGliteClass: any = null

// ============================================
// Types
// ============================================

interface WorkerState {
  db: any // PGlite instance
  isReady: boolean
  isInitializing: boolean
  ports: Set<MessagePort>
  error: string | null
}

interface WorkerMessage {
  type: string
  id: number
  [key: string]: any
}

// ============================================
// State
// ============================================

const state: WorkerState = {
  db: null,
  isReady: false,
  isInitializing: false,
  ports: new Set(),
  error: null
}

// ============================================
// API Fetching (with cookie auth)
// ============================================

/**
 * Fetch from API with cookie authentication
 * Cookies are automatically sent with credentials: 'include'
 */
async function fetchAPI<T = any>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    credentials: 'include', // ✅ This sends session cookies!
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })
  
  if (!response.ok) {
    if (response.status === 401) {
      // Session expired - notify all tabs
      broadcast({ type: 'AUTH_EXPIRED' })
      throw new Error('Authentication expired')
    }
    
    const errorText = await response.text()
    throw new Error(`API error ${response.status}: ${errorText}`)
  }
  
  return response.json()
}



// ============================================
// Database Initialization
// ============================================

async function initDB(): Promise<any> {
  if (state.db) return state.db
  if (state.isInitializing) {
    // Wait for initialization to complete
    return new Promise((resolve, reject) => {
      const check = setInterval(() => {
        if (state.db) {
          clearInterval(check)
          resolve(state.db)
        }
        if (state.error) {
          clearInterval(check)
          reject(new Error(state.error))
        }
      }, 100)
    })
  }
  
  state.isInitializing = true
  console.log('[Worker] Initializing PGlite...')
  
  try {
    console.log('[Worker] Step 1: Dynamically importing PGlite...')
    
    // Dynamic import to handle WASM loading in worker context
    if (!PGliteClass) {
      const module = await import('@electric-sql/pglite')
      PGliteClass = module.PGlite
      console.log('[Worker] PGlite module loaded')
    }
    
    console.log('[Worker] Step 2: Creating PGlite instance...')
    
    // Try IndexedDB for persistent storage, fall back to in-memory
    try {
      state.db = new PGliteClass('idb://docpal-db')
      console.log('[Worker] Using IndexedDB storage (persistent)')
    } catch (idbError) {
      console.warn('[Worker] IndexedDB failed, using in-memory:', idbError)
      state.db = new PGliteClass()
      console.log('[Worker] Using in-memory storage (data will be lost on refresh)')
    }
    
    console.log('[Worker] Step 2: Waiting for DB to be ready...')
    
    // Wait for DB to be ready
    await state.db.waitReady
    
    console.log('[Worker] Step 3: PGlite ready! Creating system tables...')
    
    // Create system tables
    await state.db.exec(`
      -- Cache metadata
      CREATE TABLE IF NOT EXISTS _cache_meta (
        key TEXT PRIMARY KEY,
        data JSONB,
        timestamp BIGINT,
        ttl BIGINT
      );
      
      -- Sync status for tables
      CREATE TABLE IF NOT EXISTS _sync_status (
        table_id TEXT PRIMARY KEY,
        view_id TEXT,
        last_sync BIGINT,
        row_count INTEGER,
        is_syncing BOOLEAN DEFAULT false
      );
      
      -- User session data
      CREATE TABLE IF NOT EXISTS _session (
        key TEXT PRIMARY KEY,
        data JSONB,
        updated_at BIGINT
      );
    `)
    
    state.isReady = true
    state.isInitializing = false
    
    console.log('[Worker] Database initialized successfully!')
    broadcast({ type: 'DB_READY' })
    
    return state.db
    
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : String(error)
    
    state.error = errorMessage
    state.isInitializing = false
    
    console.error('[Worker] Failed to initialize database:', error)
    console.error('[Worker] Error details:', {
      name: (error as Error)?.name,
      message: errorMessage,
      stack: (error as Error)?.stack
    })
    
    broadcast({ type: 'DB_ERROR', error: errorMessage })
    throw error
  }
}

// ============================================
// Query Execution
// ============================================

async function executeQuery(sql: string, params?: any[]): Promise<any[]> {
  const db = await initDB()
  
  try {
    const result = await db.query(sql, params)
    return result.rows
  } catch (error) {
    console.error('[Worker] Query error:', error)
    throw error
  }
}

async function executeExec(sql: string): Promise<void> {
  const db = await initDB()
  await db.exec(sql)
}

// ============================================
// URL to Local DB Mapping
// URLs in this map will query local PGlite first
// ============================================

interface DBMapping {
  cacheKey: string           // Key used for caching
  // Future: table?: string  // For full table sync
}

const DB_SYNC_MAP: Record<string, DBMapping> = {
  '/api/auth/me': { cacheKey: 'user' },
  '/api/workspaces': { cacheKey: 'workspaces' },
  // Add more mappings as needed:
  // '/api/workspaces/:id': { cacheKey: 'workspace:$id' },
}

// Default cache TTL: 5 minutes
const DEFAULT_CACHE_TTL = 5 * 60 * 1000

// ============================================
// Smart getData - Unified data fetching
// ============================================

interface GetDataOptions {
  forceRefresh?: boolean  // Skip cache, fetch fresh
  cacheTTL?: number       // Custom TTL in ms
}

interface GetDataResult {
  data: any
  source: 'db' | 'cache' | 'api'
  fresh: boolean
}

/**
 * Smart data fetching with automatic caching
 * 
 * Flow:
 * 1. Check if URL is in sync map → query local DB
 * 2. If not synced or DB empty → check cache
 * 3. If cache fresh → return cache
 * 4. If cache stale → return cache + background refresh
 * 5. If no cache → fetch API → cache → return
 */
async function getData(
  url: string, 
  options: GetDataOptions = {}
): Promise<GetDataResult> {
  const { forceRefresh = false, cacheTTL = DEFAULT_CACHE_TTL } = options
  const mapping = DB_SYNC_MAP[url]
  const cacheKey = mapping?.cacheKey || `api:${url}`
  
  console.log('[Worker] getData:', url, { forceRefresh, cacheKey })
  
  // Skip cache check if force refresh
  if (!forceRefresh) {
    // Try to get from cache first
    const cached = await getCache(cacheKey)
    
    if (cached) {
      const age = Date.now() - cached.timestamp
      const isFresh = age < cacheTTL
      
      console.log('[Worker] Cache hit:', cacheKey, { age, isFresh })
      
      if (isFresh) {
        // Fresh cache - return immediately
        return { data: cached.data, source: 'cache', fresh: true }
      }
      
      // Stale cache - return but refresh in background
      refreshInBackground(url, cacheKey)
      return { data: cached.data, source: 'cache', fresh: false }
    }
    
    console.log('[Worker] Cache miss:', cacheKey)
  }
  
  // No cache or force refresh - fetch from API
  console.log('[Worker] Fetching from API:', url)
  const apiResponse = await fetchAPI<{ data: any }>(url)
  const data = apiResponse.data
  
  // Cache the result
  await setCache(cacheKey, data, cacheTTL)
  console.log('[Worker] Cached API response:', cacheKey)
  
  return { data, source: 'api', fresh: true }
}

/**
 * Refresh data in background (fire and forget)
 */
function refreshInBackground(url: string, cacheKey: string): void {
  console.log('[Worker] Background refresh:', url)
  
  fetchAPI<{ data: any }>(url)
    .then(async (response) => {
      await setCache(cacheKey, response.data)
      console.log('[Worker] Background refresh complete:', cacheKey)
      
      // Notify all tabs that data was updated
      broadcast({ type: 'DATA_UPDATED', key: cacheKey })
    })
    .catch((error) => {
      console.error('[Worker] Background refresh failed:', url, error)
    })
}

// ============================================
// Cache Operations
// ============================================

async function setCache(key: string, data: any, ttl?: number): Promise<void> {
  const db = await initDB()
  const now = Date.now()
  
  await db.exec(`
    INSERT INTO _cache_meta (key, data, timestamp, ttl)
    VALUES ('${key}', '${JSON.stringify(data).replace(/'/g, "''")}', ${now}, ${ttl || 0})
    ON CONFLICT (key) DO UPDATE SET 
      data = EXCLUDED.data,
      timestamp = EXCLUDED.timestamp,
      ttl = EXCLUDED.ttl
  `)
}

async function getCache(key: string): Promise<{ data: any, timestamp: number } | null> {
  const db = await initDB()
  
  const result = await db.query(`
    SELECT data, timestamp, ttl FROM _cache_meta WHERE key = $1
  `, [key])
  
  if (result.rows.length === 0) return null
  
  const row = result.rows[0] as any
  const now = Date.now()
  
  // Check if expired
  if (row.ttl > 0 && (now - row.timestamp) > row.ttl) {
    // Expired - delete and return null
    await db.exec(`DELETE FROM _cache_meta WHERE key = '${key}'`)
    return null
  }
  
  return {
    data: row.data,
    timestamp: row.timestamp
  }
}

async function clearCache(key?: string): Promise<void> {
  const db = await initDB()
  
  if (key) {
    await db.exec(`DELETE FROM _cache_meta WHERE key = '${key}'`)
  } else {
    await db.exec(`DELETE FROM _cache_meta`)
  }
}

// ============================================
// Message Handler
// ============================================

async function handleMessage(port: MessagePort, message: WorkerMessage): Promise<void> {
  const { type, id, ...payload } = message
  
  console.log('[Worker] Received message:', type)
  
  try {
    let result: any
    
    switch (type) {
      case 'INIT':
        await initDB()
        result = { success: true }
        break
        
      case 'QUERY':
        result = await executeQuery(payload.sql, payload.params)
        break
        
      case 'EXEC':
        await executeExec(payload.sql)
        result = { success: true }
        break
        
      case 'SET_CACHE':
        await setCache(payload.key, payload.data, payload.ttl)
        result = { success: true }
        break
        
      case 'GET_CACHE':
        result = await getCache(payload.key)
        break
        
      case 'CLEAR_CACHE':
        await clearCache(payload.key)
        result = { success: true }
        break
        
      case 'GET_STATUS':
        result = {
          isReady: state.isReady,
          isInitializing: state.isInitializing,
          error: state.error,
          connectedTabs: state.ports.size
        }
        break
        
      case 'PING':
        result = { pong: true, timestamp: Date.now() }
        break
        
      // ========== API Operations ==========
      
      case 'CHECK_AUTH':
        // Verify auth is still valid
        try {
          await fetchAPI('/api/auth/me')
          result = { valid: true }
        } catch {
          result = { valid: false }
        }
        break
        
      // ========== Smart Data Fetching ==========
      
      case 'GET_DATA':
        // Unified data fetching with smart caching
        result = await getData(payload.url, {
          forceRefresh: payload.forceRefresh,
          cacheTTL: payload.cacheTTL
        })
        break
        
      default:
        throw new Error(`Unknown message type: ${type}`)
    }
    
    port.postMessage({ type: `${type}_RESULT`, id, result })
    
  } catch (error) {
    console.error('[Worker] Error handling message:', error)
    port.postMessage({ 
      type: 'ERROR', 
      id, 
      error: (error as Error).message 
    })
  }
}

// ============================================
// Broadcast to All Tabs
// ============================================

function broadcast(message: any): void {
  for (const port of state.ports) {
    try {
      port.postMessage(message)
    } catch {
      // Port might be closed, remove it
      state.ports.delete(port)
    }
  }
}

// ============================================
// Connection Handler
// ============================================

// @ts-ignore - SharedWorker global scope
self.onconnect = (e: MessageEvent) => {
  const port = e.ports?.[0]
  
  if (!port) {
    console.error('[Worker] No port in connect event')
    return
  }
  
  state.ports.add(port)
  
  console.log('[Worker] New tab connected. Total:', state.ports.size)
  
  port.onmessage = (event: MessageEvent) => {
    handleMessage(port, event.data)
  }
  
  port.onmessageerror = () => {
    console.log('[Worker] Tab disconnected')
    state.ports.delete(port)
  }
  
  port.start()
  
  // Send initial status to the new connection
  port.postMessage({
    type: 'CONNECTED',
    isReady: state.isReady,
    isInitializing: state.isInitializing,
    error: state.error
  })
  
  // Auto-initialize if not already
  if (!state.db && !state.isInitializing) {
    initDB().catch(console.error)
  }
}

console.log('[Worker] DocPal DB SharedWorker started')

