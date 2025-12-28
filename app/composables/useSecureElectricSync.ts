/**
 * Secure Electric Sync Composable
 * 
 * Uses proxy authentication approach:
 * - Client never accesses Electric directly
 * - Server validates auth and adds WHERE conditions
 * - Client can't bypass security by manipulating URLs
 * - All data is filtered by company_id automatically
 */

export const useSecureElectricSync = () => {
  const electric = useElectricSync()
  const { $fetch } = useNuxtApp()

  /**
   * Sync a table with automatic security filtering
   * 
   * @param shapeName - Unique name for this shape
   * @param tableName - Name of the local table
   * @param remoteTable - Name of the remote table (usually same as tableName)
   * @param additionalParams - Additional query params (offset, live, etc)
   */
  const syncTable = async (
    shapeName: string,
    tableName: string,
    remoteTable: string = tableName,
    additionalParams: Record<string, string> = {}
  ) => {
    // Build proxy URL
    const params = new URLSearchParams({
      table: remoteTable,
      offset: '-1',
      ...additionalParams
    })

    const proxyUrl = `/api/electric/shape?${params.toString()}`

    console.log(`[Secure Sync] Syncing ${shapeName} via proxy`)

    // Sync through proxy (server handles auth & filtering)
    await electric.syncShape(shapeName, tableName, proxyUrl)

    return { shapeName, tableName }
  }

  /**
   * Sync all user's data (common tables)
   * 
   * This syncs the most commonly used tables with proper security
   */
  const syncUserWorkspace = async () => {
    console.log('[Secure Sync] Starting full workspace sync...')

    // Sync workspaces
    await syncTable('workspaces', 'workspaces')
    console.log('[Secure Sync] ✓ Workspaces synced')

    // TODO: Add more tables as needed
    // await syncTable('data_tables', 'data_tables')
    // await syncTable('data_table_columns', 'data_table_columns')
    // await syncTable('data_table_views', 'data_table_views')

    console.log('[Secure Sync] ✓ Full workspace sync complete')

    return {
      success: true,
      tables: ['workspaces']
    }
  }

  /**
   * Sync a specific workspace's tables
   */
  const syncWorkspaceTables = async (workspaceId: string) => {
    console.log(`[Secure Sync] Syncing tables for workspace ${workspaceId}`)

    // Sync tables for this workspace
    // Server will filter by company_id automatically
    await syncTable('data_tables', 'data_tables')

    // Optionally add workspace-specific filtering in the future
    // The server can be enhanced to support workspace_id filtering

    return {
      success: true,
      workspaceId
    }
  }

  /**
   * Get sync status
   */
  const getSyncStatus = () => {
    return electric.getSyncStatus()
  }

  /**
   * Unsubscribe from a shape
   */
  const unsubscribe = async (shapeName: string) => {
    await electric.unsubscribeShape(shapeName)
  }

  return {
    // Core methods
    syncTable,
    syncUserWorkspace,
    syncWorkspaceTables,
    
    // Status & control
    getSyncStatus,
    unsubscribe,
    
    // State from base composable
    isConnected: electric.isConnected,
    isInitializing: electric.isInitializing,
    error: electric.error,
    
    // Query methods
    query: electric.query,
    useLiveQuery: electric.useLiveQuery,
  }
}

