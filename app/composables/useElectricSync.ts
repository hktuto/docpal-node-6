/**
 * ElectricSQL Composable - Real-time database sync
 * 
 * This composable manages the connection to ElectricSQL sync service
 * and provides reactive access to synced data.
 */

import { PGlite } from '@electric-sql/pglite'
import { electricSync } from '@electric-sql/pglite-sync'

interface SyncState {
  db: any | null // PGlite with Electric extension
  isConnected: boolean
  isInitializing: boolean
  error: string | null
  shapes: Map<string, any> // Track active shape subscriptions
}

const state: SyncState = {
  db: null,
  isConnected: false,
  isInitializing: false,
  error: null,
  shapes: new Map(),
}

export const useElectricSync = () => {
  const isConnected = ref(state.isConnected)
  const isInitializing = ref(state.isInitializing)
  const error = ref(state.error)

  /**
   * Initialize PGlite with Electric sync extension
   */
  const initialize = async () => {
    if (state.db) return state.db
    if (state.isInitializing) {
      // Wait for initialization
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
    isInitializing.value = true

    try {
      console.log('[Electric] Initializing PGlite with sync...')

      // Create PGlite instance with Electric sync extension
      state.db = await PGlite.create({
        dataDir: 'idb://docpal-electric',
        extensions: {
          electric: electricSync(),
        },
      })

      console.log('[Electric] PGlite initialized successfully')
      
      // Create workspaces table schema (must match PostgreSQL schema)
      console.log('[Electric] Creating workspaces table schema...')
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
      console.log('[Electric] Schema created successfully')

      state.isConnected = true
      state.isInitializing = false
      isConnected.value = true
      isInitializing.value = false

      return state.db
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error('[Electric] Failed to initialize:', err)

      state.error = errorMessage
      state.isInitializing = false
      error.value = errorMessage
      isInitializing.value = false

      throw err
    }
  }

  /**
   * Sync a table from the server
   * 
   * @param shapeName - Unique name for this shape subscription
   * @param tableName - Name of the table to sync
   * @param shapeUrl - URL of the Electric shape endpoint
   * @param options - Additional shape options (where clause, etc.)
   */
  const syncShape = async (
    shapeName: string,
    tableName: string,
    shapeUrl: string,
    options?: Record<string, any>
  ) => {
    const db = await initialize()
    
    // Convert relative URLs to absolute URLs
    // Electric client requires full URLs
    let fullUrl = shapeUrl
    if (shapeUrl.startsWith('/')) {
      // Relative URL - convert to absolute
      if (typeof window !== 'undefined') {
        fullUrl = `${window.location.origin}${shapeUrl}`
      }
    }

    // Check if already syncing this shape
    if (state.shapes.has(shapeName)) {
      console.log(`[Electric] Shape "${shapeName}" already syncing`)
      return state.shapes.get(shapeName)
    }

    try {
      console.log(`[Electric] Starting sync for shape "${shapeName}"...`, {
        table: tableName,
        url: fullUrl,
      })

      // Create the shape subscription
      const shape = await db.electric.syncShapeToTable({
        shape: {
          url: fullUrl,
          ...options,
        },
        table: tableName,
        primaryKey: ['id'],
      })

      state.shapes.set(shapeName, shape)
      console.log(`[Electric] Shape "${shapeName}" synced successfully`)

      return shape
    } catch (err) {
      console.error(`[Electric] Failed to sync shape "${shapeName}":`, err)
      throw err
    }
  }

  /**
   * Query synced data reactively
   * 
   * @param sql - SQL query to execute
   * @param params - Query parameters
   */
  const query = async <T = any>(sql: string, params?: any[]): Promise<T[]> => {
    const db: any = await initialize()

    try {
      const result = await db.query(sql, params)
      return result.rows as T[]
    } catch (err) {
      console.error('[Electric] Query failed:', err)
      throw err
    }
  }

  /**
   * Execute a SQL statement (INSERT, UPDATE, DELETE)
   */
  const exec = async (sql: string): Promise<void> => {
    const db: any = await initialize()
    await db.exec(sql)
  }

  /**
   * Create a live query that automatically updates
   * 
   * @param sql - SQL query to execute
   * @param params - Query parameters
   * @param intervalMs - Polling interval in milliseconds (default: 1000ms)
   */
  const useLiveQuery = <T = any>(
    sql: string,
    params?: any[],
    intervalMs = 1000
  ) => {
    const data = ref<T[]>([])
    const loading = ref(true)
    const queryError = ref<string | null>(null)

    let intervalId: NodeJS.Timeout | null = null

    const executeQuery = async () => {
      try {
        const result = await query<T>(sql, params)
        data.value = result
        loading.value = false
        queryError.value = null
      } catch (err) {
        queryError.value = err instanceof Error ? err.message : String(err)
        loading.value = false
      }
    }

    // Initial query
    executeQuery()

    // Set up polling
    intervalId = setInterval(executeQuery, intervalMs)

    // Cleanup on unmount
    onUnmounted(() => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    })

    return {
      data,
      loading,
      error: queryError,
      refresh: executeQuery,
    }
  }

  /**
   * Get sync status for all shapes
   */
  const getSyncStatus = () => {
    return {
      connected: state.isConnected,
      initializing: state.isInitializing,
      activeShapes: Array.from(state.shapes.keys()),
      error: state.error,
    }
  }

  /**
   * Unsubscribe from a shape
   */
  const unsubscribeShape = async (shapeName: string) => {
    const shape = state.shapes.get(shapeName)
    if (shape && shape.unsubscribe) {
      await shape.unsubscribe()
      state.shapes.delete(shapeName)
      console.log(`[Electric] Unsubscribed from shape "${shapeName}"`)
    }
  }

  return {
    // State
    isConnected,
    isInitializing,
    error,

    // Methods
    initialize,
    syncShape,
    query,
    exec,
    useLiveQuery,
    getSyncStatus,
    unsubscribeShape,
  }
}

