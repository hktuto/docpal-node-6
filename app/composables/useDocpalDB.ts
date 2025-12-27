/**
 * DocPal Database Composable
 * 
 * Client-side composable to interact with the PGlite SharedWorker.
 * Provides a simple API for database operations across all tabs.
 * 
 * Usage:
 * ```ts
 * const { query, isReady, status } = useDocpalDB()
 * 
 * // Wait for ready
 * await until(isReady).toBe(true)
 * 
 * // Query
 * const users = await query('SELECT * FROM users')
 * ```
 */

// ============================================
// Types
// ============================================

export interface DBStatus {
  isReady: boolean
  isInitializing: boolean
  error: string | null
  connectedTabs: number
}

interface PendingRequest {
  resolve: (value: any) => void
  reject: (error: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

// ============================================
// Singleton State
// ============================================

let sharedWorker: SharedWorker | null = null
let requestId = 0
const pendingRequests = new Map<number, PendingRequest>()

export const useWorkerStatus = () => useState<DBStatus>('docpalDB:status', () => ({
  isReady: false,
  isInitializing: false,
  error: null,
  connectedTabs: 0
}))


// ============================================
// Worker Connection
// ============================================

function initWorker(): SharedWorker | null {
  const status = useWorkerStatus()
  
  if (sharedWorker) return sharedWorker
  
  // Check if SharedWorker is supported (rare case: very old browser)
  if (typeof SharedWorker === 'undefined') {
    console.error('[DocpalDB] SharedWorker not supported in this browser')
    status.value.error = 'SharedWorker not supported'
    return null
  }
  
  console.log('[DocpalDB] Initializing SharedWorker...')
  
  try {
    // Create SharedWorker
    // Vite will compile .ts to .js automatically with this pattern
    sharedWorker = new SharedWorker(
      new URL('../workers/docpal-db.shared-worker.ts', import.meta.url),
      {
        type: 'module',
        name: 'docpal-db'
      }
    )
  } catch (error) {
    console.error('[DocpalDB] Failed to create SharedWorker:', error)
    status.value.error = (error as Error).message
    return null
  }
  
  // Handle messages from worker
  sharedWorker.port.onmessage = (event: MessageEvent) => {
    const { type, id, result, error, ...rest } = event.data
    
    // Handle broadcasts (no id)
    if (!id && id !== 0) {
      handleBroadcast(type, rest)
      return
    }
    
    // Handle request responses
    const pending = pendingRequests.get(id)
    if (!pending) return
    
    clearTimeout(pending.timeout)
    pendingRequests.delete(id)
    
    if (type === 'ERROR') {
      pending.reject(new Error(error))
    } else {
      pending.resolve(result)
    }
  }
  
  sharedWorker.port.onmessageerror = (event) => {
    console.error('[DocpalDB] Message error:', event)
  }
  
  sharedWorker.onerror = (event) => {
    console.error('[DocpalDB] Worker error:', event)
    status.value.error = event.message || 'Worker error'
  }
  
  // Start the port
  sharedWorker.port.start()
  status.value.isReady = true
  console.log('[DocpalDB] SharedWorker connected')
  
  return sharedWorker
}

// Handle broadcast messages from worker
function handleBroadcast(type: string, data: any): void {
  console.log('[DocpalDB] Broadcast:', type, JSON.stringify(data))
  
  const status = useWorkerStatus()
  switch (type) {
    case 'CONNECTED':
      status.value = {
        isReady: data.isReady,
        isInitializing: data.isInitializing,
        error: data.error,
        connectedTabs: data.connectedTabs || 1
      }
      break
      
    case 'DB_READY':
      status.value.isReady = true
      status.value.isInitializing = false
      break
      
    case 'DB_ERROR':
      status.value.error = data.error
      status.value.isInitializing = false
      break
      
    case 'DATA_CHANGED':
      // Emit event for reactive updates
      // TODO: Add event bus or reactive triggers
      console.log('[DocpalDB] Data changed:', data.table)
      break
      
    case 'AUTH_EXPIRED':
      // Session expired - redirect to login
      console.warn('[DocpalDB] Authentication expired')
      window.location.href = '/auth/login?expired=true'
      break
      
    case 'ESSENTIAL_SYNC_COMPLETE':
      console.log('[DocpalDB] Essential data synced successfully')
      break
      
    case 'ESSENTIAL_SYNC_FAILED':
      console.error('[DocpalDB] Essential sync failed:', data.error)
      break
  }
}

// ============================================
// Request Helper
// ============================================

function sendMessage<T = any>(
  type: string, 
  payload: Record<string, any> = {},
  timeoutMs: number = 30000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = initWorker()
    
    if (!worker) {
      reject(new Error('Worker not available'))
      return
    }
    
    const id = ++requestId
    
    // Set timeout
    const timeout = setTimeout(() => {
      pendingRequests.delete(id)
      reject(new Error(`Request timeout: ${type}`))
    }, timeoutMs)
    
    // Store pending request
    pendingRequests.set(id, { resolve, reject, timeout })
    
    // Send message
    worker.port.postMessage({ type, id, ...payload })
  })
}

// ============================================
// Public API
// ============================================

/**
 * Initialize the worker (can be called from middleware)
 * Safe to call multiple times - will only initialize once
 */
export function initDocpalDB(): boolean {
  const worker = initWorker()
  return worker !== null
}


/**
 * Get current status (non-reactive, for middleware)
 */
export function getDocpalDBStatus(): DBStatus {
  const status = useWorkerStatus()
  return { ...status.value }
}

export function useDocpalDB() {
  const status = useWorkerStatus()
  // Initialize on first use
  initWorker()
  
  /**
   * Initialize the database
   */
  async function init(): Promise<void> {
    await sendMessage('INIT')
  }
  
  /**
   * Execute a SQL query and return rows
   */
  async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    return sendMessage('QUERY', { sql, params })
  }
  
  /**
   * Execute a SQL statement (no return value)
   */
  async function exec(sql: string): Promise<void> {
    await sendMessage('EXEC', { sql })
  }
  
  /**
   * Set a cache value
   */
  async function setCache(key: string, data: any, ttl?: number): Promise<void> {
    await sendMessage('SET_CACHE', { key, data, ttl })
  }
  
  /**
   * Get a cache value
   */
  async function getCache<T = any>(key: string): Promise<{ data: T, timestamp: number } | null> {
    return sendMessage('GET_CACHE', { key })
  }
  
  /**
   * Clear cache (optionally by key)
   */
  async function clearCache(key?: string): Promise<void> {
    await sendMessage('CLEAR_CACHE', { key })
  }
  
  /**
   * Get worker status
   */
  async function getStatus(): Promise<DBStatus> {
    return sendMessage('GET_STATUS')
  }
  
  /**
   * Ping the worker (health check)
   */
  async function ping(): Promise<{ pong: boolean, timestamp: number }> {
    return sendMessage('PING')
  }
  
  /**
   * Wait for database to be ready
   */
  async function waitForReady(timeoutMs: number = 10000): Promise<void> {
    const start = Date.now()
    
    while (!status.value.isReady) {
      if (status.value.error) {
        throw new Error(status.value.error)
      }
      
      if (Date.now() - start > timeoutMs) {
        throw new Error('Timeout waiting for database')
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  // ========== Smart Data Fetching ==========
  
  interface GetDataOptions {
    forceRefresh?: boolean  // Skip cache, fetch fresh from API
    cacheTTL?: number       // Custom cache TTL in ms (default 5 min)
  }
  
  interface GetDataResult<T = any> {
    data: T
    source: 'db' | 'cache' | 'api'
    fresh: boolean
  }
  
  /**
   * 🎯 MAIN API: Smart data fetching with automatic caching
   * 
   * This is the primary way to fetch data. The worker handles:
   * 1. Check if URL is synced to local DB → return local data
   * 2. If not synced → check cache → return if fresh
   * 3. If stale → return stale + background refresh
   * 4. If no cache → fetch API → cache → return
   * 
   * @example
   * ```ts
   * const { getData } = useDocpalDB()
   * 
   * // Simple usage
   * const { data, source, fresh } = await getData('/api/workspaces')
   * 
   * // Force refresh
   * const { data } = await getData('/api/workspaces', { forceRefresh: true })
   * 
   * // Custom cache TTL (1 hour)
   * const { data } = await getData('/api/users', { cacheTTL: 60 * 60 * 1000 })
   * ```
   */
  async function getData<T = any>(
    url: string, 
    options?: GetDataOptions
  ): Promise<GetDataResult<T>> {
    return sendMessage('GET_DATA', { 
      url, 
      forceRefresh: options?.forceRefresh,
      cacheTTL: options?.cacheTTL
    })
  }
  
  /**
   * Check if authentication is still valid
   */
  async function checkAuth(): Promise<boolean> {
    const result = await sendMessage<{ valid: boolean }>('CHECK_AUTH')
    return result.valid
  }
  
  return {
    // 🎯 Main API - use this for data fetching
    getData,
    
    // Database methods
    init,
    query,
    exec,
    setCache,
    getCache,
    clearCache,
    getStatus,
    ping,
    waitForReady,
    checkAuth,
    
    // Reactive state
    status,
  }
}

