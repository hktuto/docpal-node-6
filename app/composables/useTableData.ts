/**
 * useTableData Composable
 * 
 * Provides access to data from dynamic user-created tables.
 * Handles schema evolution by watching data_table_columns for changes.
 * 
 * Features:
 * - Auto-syncs table when viewed
 * - Detects schema changes and recreates table
 * - Provides reactive query to table rows
 */

import { createDynamicTableSchema } from '~/config/electric-schemas'

export const useTableData = (tableSlug: MaybeRef<string>, workspaceId: MaybeRef<string>) => {
  const { syncTable, watchQuery, getDB } = useSecureElectricSync()
  const { getTableBySlug, watchTableColumns } = useDataTables()
  
  const rows = ref<any[]>([])
  const dataTable = ref<any>(null)
  const isLoading = ref(true)
  const isResyncing = ref(false)
  const isInitialized = ref(false)

  const tableSlugValue = computed(() => unref(tableSlug))
  const workspaceIdValue = computed(() => unref(workspaceId))

  let currentSchemaHash = ''

  const initialize = async () => {
    if (isInitialized.value) return
    if (!tableSlugValue.value || !workspaceIdValue.value) {
      console.warn('[useTableData] Missing tableSlug or workspaceId')
      isLoading.value = false
      return
    }

    try {
      // 1. Get data_table metadata
      dataTable.value = await getTableBySlug(tableSlugValue.value, workspaceIdValue.value)
      
      if (!dataTable.value) {
        console.error('[useTableData] Table not found:', tableSlugValue.value)
        isLoading.value = false
        return
      }

      console.log('[useTableData] Found table:', dataTable.value.name, '→', dataTable.value.table_name)

      // 2. Watch columns for schema changes
      const columnsResult = await watchTableColumns(dataTable.value.id)
      
      // 3. Initial schema setup
      await setupTableSchema(columnsResult.value || [])

      // 4. Watch for column changes (schema evolution)
      watch(columnsResult, async (newColumns, oldColumns) => {
        if (!oldColumns || oldColumns.length === 0) return

        const newHash = calculateSchemaHash(newColumns || [])
        
        if (currentSchemaHash && currentSchemaHash !== newHash) {
          console.log('[useTableData] Schema changed, resyncing...', {
            old: currentSchemaHash,
            new: newHash
          })
          
          isResyncing.value = true
          
          // Drop and recreate table
          await dropTable(dataTable.value.table_name)
          await setupTableSchema(newColumns || [])
          
          isResyncing.value = false
        }
      }, { deep: true })

      isInitialized.value = true

    } catch (error) {
      console.error('[useTableData] Failed to initialize:', error)
      isLoading.value = false
      throw error
    }
  }

  /**
   * Setup table schema and sync data
   */
  const setupTableSchema = async (columns: any[]) => {
    if (!dataTable.value) return

    const db = await getDB()
    const tableName = dataTable.value.table_name

    // Calculate schema hash
    currentSchemaHash = calculateSchemaHash(columns)

    // Create table schema in PGlite
    const schemaSQL = createDynamicTableSchema(tableName, columns)
    await db.exec(schemaSQL)
    console.log('[useTableData] Created schema for:', tableName)

    // Sync table data
    await syncTable(tableName)
    console.log('[useTableData] Synced data for:', tableName)

    // Watch table data
    const dataResult = await watchQuery(`
      SELECT * FROM "${tableName}"
      ORDER BY created_at DESC
    `)

    rows.value = dataResult.value || []
    isLoading.value = false

    // Reactively update rows
    watch(dataResult, (newRows) => {
      rows.value = newRows || []
    }, { deep: true })

    console.log('[useTableData] Initialized with', rows.value.length, 'rows')
  }

  /**
   * Drop table from PGlite
   */
  const dropTable = async (tableName: string) => {
    const db = await getDB()
    try {
      await db.exec(`DROP TABLE IF EXISTS "${tableName}"`)
      console.log('[useTableData] Dropped table:', tableName)
    } catch (err) {
      console.error('[useTableData] Failed to drop table:', err)
    }
  }

  /**
   * Calculate schema hash from columns
   */
  const calculateSchemaHash = (columns: any[]) => {
    const columnDef = columns
      .sort((a, b) => a.order - b.order)
      .map(c => `${c.id}:${c.name}:${c.type}:${c.required}:${c.is_unique}`)
      .join('|')
    
    // Simple base64 hash
    return btoa(columnDef)
  }

  // Auto-initialize on mount
  onMounted(() => {
    initialize()
  })

  // Re-initialize when table or workspace changes
  watch([tableSlugValue, workspaceIdValue], () => {
    if (tableSlugValue.value && workspaceIdValue.value) {
      isInitialized.value = false
      rows.value = []
      dataTable.value = null
      isLoading.value = true
      initialize()
    }
  })

  return {
    rows: readonly(rows),
    dataTable: readonly(dataTable),
    isLoading: readonly(isLoading),
    isResyncing: readonly(isResyncing),
    initialize,
  }
}

