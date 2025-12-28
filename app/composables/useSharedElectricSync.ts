/**
 * Shared Electric Sync Composable
 * 
 * Uses SharedWorker for optimal multi-tab performance:
 * - Single PGlite instance across all tabs
 * - Single WebSocket connection to Electric
 * - Automatic cross-tab synchronization
 * - Efficient memory usage
 */

export const useSharedElectricSync = () => {
  let worker: SharedWorker | null = null
  let messageId = 0
  const pendingMessages = new Map<number, { resolve: Function; reject: Function }>()

  const isConnected = ref(false)
  const isInitializing = ref(false)
  const error = ref<string | null>(null)
  const connectedTabs = ref(0)
  const activeShapes = ref<string[]>([])

  /**
   * Initialize connection to SharedWorker
   */
  const connect = () => {
    if (worker) return worker

    try {
      worker = new SharedWorker(
        new URL('../workers/electric-sync.worker.ts', import.meta.url),
        { type: 'module', name: 'electric-sync' }
      )

      worker.port.onmessage = (event: MessageEvent) => {
        handleMessage(event.data)
      }

      worker.port.onerror = (event: ErrorEvent) => {
        console.error('[Shared Electric] Worker error:', event)
        error.value = event.message
      }

      worker.port.start()
      console.log('[Shared Electric] Connected to worker')

      return worker
    } catch (err) {
      console.error('[Shared Electric] Failed to create worker:', err)
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    }
  }

  /**
   * Handle messages from worker
   */
  const handleMessage = (data: any) => {
    const { type, id, result, error: errorMsg } = data

    // Handle broadcast messages (no id)
    if (!id) {
      switch (type) {
        case 'CONNECTED':
          isConnected.value = true
          isInitializing.value = data.isInitializing
          error.value = data.error
          connectedTabs.value = data.connectedTabs
          console.log('[Shared Electric] Connected, tabs:', data.connectedTabs)
          break

        case 'DB_READY':
          isConnected.value = true
          isInitializing.value = false
          console.log('[Shared Electric] Database ready')
          break

        case 'DB_ERROR':
          error.value = errorMsg
          isInitializing.value = false
          console.error('[Shared Electric] Database error:', errorMsg)
          break

        case 'SHAPE_SYNCED':
          console.log('[Shared Electric] Shape synced:', data.shapeName)
          // Trigger reactivity update
          getStatus()
          break

        default:
          console.log('[Shared Electric] Broadcast:', type, data)
      }
      return
    }

    // Handle response messages (with id)
    const pending = pendingMessages.get(id)
    if (!pending) return

    if (type === 'ERROR') {
      pending.reject(new Error(errorMsg))
    } else {
      pending.resolve(result)
    }

    pendingMessages.delete(id)
  }

  /**
   * Send message to worker and wait for response
   */
  const sendMessage = <T = any>(type: string, payload: any = {}): Promise<T> => {
    if (!worker) connect()

    return new Promise((resolve, reject) => {
      const id = ++messageId
      pendingMessages.set(id, { resolve, reject })

      worker!.port.postMessage({
        type,
        id,
        ...payload,
      })

      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingMessages.has(id)) {
          pendingMessages.delete(id)
          reject(new Error(`Message timeout: ${type}`))
        }
      }, 30000)
    })
  }

  /**
   * Initialize database
   */
  const initialize = async () => {
    await sendMessage('INIT')
    console.log('[Shared Electric] Initialized')
  }

  /**
   * Sync a shape via secure proxy
   */
  const syncShape = async (
    shapeName: string,
    tableName: string,
    proxyUrl: string
  ) => {
    await sendMessage('SYNC_SHAPE', {
      shapeName,
      tableName,
      shapeUrl: proxyUrl,
    })
    console.log(`[Shared Electric] Synced shape: ${shapeName}`)
  }

  /**
   * Execute a query
   */
  const query = async <T = any>(sql: string, params?: any[]): Promise<T[]> => {
    return await sendMessage<T[]>('QUERY', { sql, params })
  }

  /**
   * Execute SQL (INSERT, UPDATE, DELETE)
   */
  const exec = async (sql: string): Promise<void> => {
    await sendMessage('EXEC', { sql })
  }

  /**
   * Get sync status
   */
  const getStatus = async () => {
    const status = await sendMessage('GET_STATUS')
    
    isConnected.value = status.isReady
    isInitializing.value = status.isInitializing
    error.value = status.error
    connectedTabs.value = status.connectedTabs
    activeShapes.value = status.activeShapes
    
    return status
  }

  /**
   * Live query with polling
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
   * Ping worker to check if alive
   */
  const ping = async () => {
    const result = await sendMessage('PING')
    return result
  }

  // Auto-connect on creation
  connect()

  return {
    // State
    isConnected,
    isInitializing,
    error,
    connectedTabs,
    activeShapes,

    // Methods
    initialize,
    syncShape,
    query,
    exec,
    useLiveQuery,
    getStatus,
    ping,
  }
}

