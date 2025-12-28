/**
 * useDataTables Composable
 * 
 * Provides access to data tables and their columns via Electric sync.
 * Can be scoped to a specific workspace or return all tables.
 * 
 * Lifecycle: Auto-initializes when user logs in, auto-cleans up on logout.
 */

import { getTableSchema } from '~/config/electric-schemas'

export const useDataTables = (workspaceId?: MaybeRef<string | null>) => {
  const { isAuthenticated } = useAuth()
  const { syncTable, watchQuery, getDB } = useSecureElectricSync()
  
  const tables = ref<any[]>([])
  const isLoading = ref(false)
  const isInitialized = ref(false)

  const workspaceIdValue = computed(() => unref(workspaceId))

  const initialize = async () => {
    // Don't init if not authenticated
    if (!isAuthenticated.value) {
      console.log('[useDataTables] Not authenticated, skipping initialization')
      return
    }

    if (isInitialized.value) {
      console.log('[useDataTables] Already initialized')
      return
    }

    isLoading.value = true

    try {
      const db = await getDB()

      // 1. Create schemas (fetched from server)
      console.log('[useDataTables] Fetching schemas...')
      
      const dataTablesSchema = await getTableSchema('data_tables')
      const dataTableColumnsSchema = await getTableSchema('data_table_columns')
      
      if (!dataTablesSchema) {
        throw new Error('Failed to fetch data_tables schema from server')
      }
      if (!dataTableColumnsSchema) {
        throw new Error('Failed to fetch data_table_columns schema from server')
      }
      
      console.log('[useDataTables] Creating data_tables table...')
      await db.exec(dataTablesSchema)
      
      console.log('[useDataTables] Creating data_table_columns table...')
      await db.exec(dataTableColumnsSchema)
      
      console.log('[useDataTables] ✓ Schemas created successfully')

      // 2. Sync tables (both data_tables and data_table_columns)
      await syncTable('data_tables')
      await syncTable('data_table_columns')
      console.log('[useDataTables] Tables synced')

      // 3. Watch for changes
      await updateQuery()
      isInitialized.value = true
      isLoading.value = false
      
      console.log('[useDataTables] ✓ Initialized with', tables.value.length, 'table(s)')

    } catch (error) {
      console.error('[useDataTables] Failed to initialize:', error)
      isLoading.value = false
      throw error
    }
  }

  const updateQuery = async () => {
    const query = workspaceIdValue.value
      ? `
        SELECT * FROM data_tables 
        WHERE workspace_id = $1 
        ORDER BY created_at DESC
      `
      : `
        SELECT * FROM data_tables 
        ORDER BY created_at DESC
      `
    
    const params = workspaceIdValue.value ? [workspaceIdValue.value] : []

    const result = await watchQuery(query, params)

    tables.value = result.value || []

    // Reactively update tables
    watch(result, (newTables) => {
      tables.value = newTables || []
    }, { deep: true })
  }

  const cleanup = () => {
    console.log('[useDataTables] Cleaning up on logout')
    tables.value = []
    isInitialized.value = false
    isLoading.value = false
  }

  // Watch auth state - auto-initialize on login, cleanup on logout
  watch(isAuthenticated, (authenticated) => {
    if (authenticated && !isInitialized.value) {
      console.log('[useDataTables] User authenticated, initializing Electric sync')
      initialize()
    } else if (!authenticated && isInitialized.value) {
      cleanup()
    }
  }, { immediate: true })

  // Re-query when workspace changes
  watch(workspaceIdValue, () => {
    if (isInitialized.value) {
      updateQuery()
    }
  })

  /**
   * Get table by ID
   */
  const getTableById = (tableId: string | null | undefined) => {
    if (!tableId) return null
    return computed(() => tables.value.find(t => t.id === tableId))
  }

  /**
   * Get table by slug within a workspace
   */
  const getTableBySlug = async (slug: string, workspaceIdParam?: string) => {
    const db = await getDB()
    const wsId = workspaceIdParam || workspaceIdValue.value
    
    if (!wsId) {
      throw new Error('workspaceId is required')
    }

    const result = await db.query(`
      SELECT * FROM data_tables 
      WHERE workspace_id = $1 AND slug = $2 
      LIMIT 1
    `, [wsId, slug])

    return result.rows[0] || null
  }

  /**
   * Get columns for a specific table
   * 
   * NOTE: Filters client-side to ensure we only return columns
   * for tables the user has access to (security layer)
   */
  const getTableColumns = async (tableId: string) => {
    const db = await getDB()
    
    // First, verify the table exists and user has access
    // (data_tables is already filtered by company_id server-side)
    const tableCheck = await db.query(`
      SELECT id FROM data_tables WHERE id = $1 LIMIT 1
    `, [tableId])
    
    if (tableCheck.rows.length === 0) {
      console.warn('[useDataTables] Access denied: table not found or no permission')
      return []
    }
    
    // Now fetch columns for this table
    const result = await db.query(`
      SELECT * FROM data_table_columns 
      WHERE data_table_id = $1 
      ORDER BY "order" ASC
    `, [tableId])

    return result.rows
  }

  /**
   * Watch columns for a specific table (reactive)
   */
  const watchTableColumns = async (tableId: MaybeRef<string>) => {
    const tableIdValue = computed(() => unref(tableId))
    
    const result = await watchQuery(`
      SELECT * FROM data_table_columns 
      WHERE data_table_id = $1 
      ORDER BY "order" ASC
    `, [tableIdValue.value])

    // Re-query when tableId changes
    watch(tableIdValue, async (newTableId) => {
      if (newTableId) {
        const newResult = await watchQuery(`
          SELECT * FROM data_table_columns 
          WHERE data_table_id = $1 
          ORDER BY "order" ASC
        `, [newTableId])
        
        result.value = newResult.value
      }
    })

    return result
  }

  return {
    tables: readonly(tables),
    isLoading: readonly(isLoading),
    getTableById,
    getTableBySlug,
    getTableColumns,
    watchTableColumns,
    initialize,
  }
}

