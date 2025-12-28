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
   * @param tableName - Name of the table to sync (used for both shape name and table name)
   * @param additionalParams - Additional query params (offset, live, etc)
   */
  const syncTable = async (
    tableName: string,
    additionalParams: Record<string, string> = {}
  ) => {
    if (!tableName) {
      throw new Error('[Secure Sync] Table name is required')
    }

    // Build proxy URL
    const params = new URLSearchParams({
      table: tableName,
      offset: '-1',
      ...additionalParams
    })

    const proxyUrl = `/api/electric/shape?${params.toString()}`

    console.log(`[Secure Sync] Syncing ${tableName} via proxy`)

    // Sync through proxy (server handles auth & filtering)
    // Use table name as both shape name and local table name
    await electric.syncShape(tableName, tableName, proxyUrl)

    return { tableName }
  }

  /**
   * Sync all user's data (common tables)
   * 
   * This syncs the most commonly used tables with proper security
   */
  const syncUserWorkspace = async () => {
    console.log('[Secure Sync] Starting full workspace sync...')

    // Sync workspaces
    await syncTable('workspaces')
    console.log('[Secure Sync] ✓ Workspaces synced')

    // TODO: Add more tables as needed
    // await syncTable('data_tables')
    // await syncTable('data_table_columns')
    // await syncTable('data_table_views')

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
    await syncTable('data_tables')

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
    
    // Database access
    getDB: electric.getDB,
    
    // Query methods
    query: electric.query,
    watchQuery: electric.watchQuery,
    useLiveQuery: electric.useLiveQuery,
  }
}

