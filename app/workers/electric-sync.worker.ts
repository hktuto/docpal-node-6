/**
 * Electric Sync SharedWorker
 * 
 * A SharedWorker that manages PGlite with Electric sync extension.
 * Benefits:
 * - Single database instance shared across all tabs
 * - Single WebSocket connection to Electric
 * - Efficient memory usage
 * - Automatic cross-tab synchronization
 * - Background sync operations
 */

import { PGlite } from '@electric-sql/pglite'
import { electricSync } from '@electric-sql/pglite-sync'

// ============================================
// Types
// ============================================

interface WorkerState {
  db: any | null // PGlite with Electric extension
  isReady: boolean
  isInitializing: boolean
  ports: Set<MessagePort>
  error: string | null
  activeShapes: Map<string, any> // Track active shape subscriptions
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
  error: null,
  activeShapes: new Map(),
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
  console.log('[Electric Worker] Initializing PGlite with Electric sync...')
  
  try {
    // Create PGlite instance with Electric sync extension
    state.db = await PGlite.create({
      dataDir: 'idb://docpal-electric',
      extensions: {
        electric: electricSync(),
      },
    })

    console.log('[Electric Worker] PGlite initialized')
    
    // Create workspaces table schema (must match PostgreSQL)
    await state.db.exec(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        icon TEXT,
        description TEXT,
        menu JSONB,
        company_id UUID NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      );
    `)
    
    console.log('[Electric Worker] Schema created')
    
    state.isReady = true
    state.isInitializing = false
    
    console.log('[Electric Worker] ✅ Ready!')
    broadcast({ type: 'DB_READY' })
    
    return state.db
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    state.error = errorMessage
    state.isInitializing = false
    
    console.error('[Electric Worker] Failed to initialize:', error)
    broadcast({ type: 'DB_ERROR', error: errorMessage })
    
    throw error
  }
}

// ============================================
// Shape Subscription
// ============================================

async function syncShape(
  shapeName: string,
  tableName: string,
  shapeUrl: string
): Promise<void> {
  const db = await initDB()
  
  // Check if already syncing
  if (state.activeShapes.has(shapeName)) {
    console.log(`[Electric Worker] Shape "${shapeName}" already syncing`)
    return
  }
  
  // Convert relative URLs to absolute URLs
  // Electric client requires full URLs
  let fullUrl = shapeUrl
  if (shapeUrl.startsWith('/')) {
    // In worker context, we need to construct the full URL
    // Use the origin from the worker's location
    fullUrl = `${self.location.origin}${shapeUrl}`
  }
  
  try {
    console.log(`[Electric Worker] Starting sync for "${shapeName}"...`, fullUrl)
    
    // Subscribe to shape
    const shape = await db.electric.syncShapeToTable({
      shape: {
        url: fullUrl,
      },
      table: tableName,
      primaryKey: ['id'],
    })
    
    state.activeShapes.set(shapeName, shape)
    console.log(`[Electric Worker] ✅ Shape "${shapeName}" synced`)
    
    // Notify all tabs
    broadcast({
      type: 'SHAPE_SYNCED',
      shapeName,
      tableName,
    })
    
  } catch (error) {
    console.error(`[Electric Worker] Failed to sync shape "${shapeName}":`, error)
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
    console.error('[Electric Worker] Query error:', error)
    throw error
  }
}

async function executeExec(sql: string): Promise<void> {
  const db = await initDB()
  await db.exec(sql)
}

// ============================================
// Message Handler
// ============================================

async function handleMessage(port: MessagePort, message: WorkerMessage): Promise<void> {
  const { type, id, ...payload } = message
  
  console.log('[Electric Worker] Received:', type)
  
  try {
    let result: any
    
    switch (type) {
      case 'INIT':
        await initDB()
        result = { success: true }
        break
        
      case 'SYNC_SHAPE':
        await syncShape(payload.shapeName, payload.tableName, payload.shapeUrl)
        result = { success: true }
        break
        
      case 'QUERY':
        result = await executeQuery(payload.sql, payload.params)
        break
        
      case 'EXEC':
        await executeExec(payload.sql)
        result = { success: true }
        break
        
      case 'GET_STATUS':
        result = {
          isReady: state.isReady,
          isInitializing: state.isInitializing,
          error: state.error,
          connectedTabs: state.ports.size,
          activeShapes: Array.from(state.activeShapes.keys()),
        }
        break
        
      case 'PING':
        result = { pong: true, timestamp: Date.now() }
        break
        
      default:
        throw new Error(`Unknown message type: ${type}`)
    }
    
    port.postMessage({ type: `${type}_RESULT`, id, result })
    
  } catch (error) {
    console.error('[Electric Worker] Error handling message:', error)
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
    console.error('[Electric Worker] No port in connect event')
    return
  }
  
  state.ports.add(port)
  console.log('[Electric Worker] Tab connected. Total:', state.ports.size)
  
  port.onmessage = (event: MessageEvent) => {
    handleMessage(port, event.data)
  }
  
  port.onmessageerror = () => {
    console.log('[Electric Worker] Tab disconnected')
    state.ports.delete(port)
  }
  
  port.start()
  
  // Send initial status
  port.postMessage({
    type: 'CONNECTED',
    isReady: state.isReady,
    isInitializing: state.isInitializing,
    error: state.error,
    connectedTabs: state.ports.size,
  })
  
  // Auto-initialize if not already
  if (!state.db && !state.isInitializing) {
    initDB().catch(console.error)
  }
}

console.log('[Electric Worker] SharedWorker started')

