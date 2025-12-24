<script setup lang="ts">
import type { DataTable, DataTableColumn, DataTableView } from '#shared/types/db'

definePageMeta({
  layout: 'app'
})

const route = useRoute()
const workspaceSlug = computed(() => route.params.workspaceSlug as string)
const tableSlug = computed(() => route.params.tableSlug as string)

// Track if component is mounted (for Teleport)
const isMounted = ref(false)
onMounted(() => {
  isMounted.value = true
})

// Fetch table metadata (with columns) - only schema, not rows
const { data: table, pending: tablePending, refresh: refreshTable } = await useApi<SuccessResponse<DataTable & { columns: DataTableColumn[] }>>(
  () => `/api/workspaces/${workspaceSlug.value}/tables/${tableSlug.value}`,
  {
    key: `table-${workspaceSlug.value}-${tableSlug.value}`,
  }
)

// Fetch default view (contains view settings + columns)
const { data: currentView, pending: viewPending, refresh: refreshView } = await useApi<SuccessResponse<DataTableView & { 
  columns: DataTableColumn[]
  allColumns: DataTableColumn[] 
}>>(
  () => `/api/workspaces/${workspaceSlug.value}/tables/${tableSlug.value}/views/default`,
  {
    key: `view-${workspaceSlug.value}-${tableSlug.value}-default`,
  }
)

// Grid ref for manual operations
const gridRef = ref()

// Transform columns for DataGrid (use view's visible columns)
const gridColumns = computed(() => {
  if (!currentView.value?.data.columns) return []
  
  // Use columns from the view (already in correct order and filtered)
  return currentView.value.data.columns.map((col: DataTableColumn) => {
    // Get custom width from view config if available
    const customWidths = currentView.value?.data.columnWidths as Record<string, number> | undefined
    const width = customWidths?.[col.id]
    
    return {
      id: col.id, // Include column ID for management operations
    field: col.name,
    title: col.label,
      minWidth: width || 120,
      width: width,
    sortable: true,
      visible: !col.isHidden, // Respect column visibility
    }
  })
})

// Row dialog state
const showRowDialog = ref(false)
const editingRow = ref<any>(null)

// Column dialog state
const showColumnDialog = ref(false)
const editingColumn = ref<DataTableColumn | undefined>(undefined)
const columnPosition = ref<number | null>(null) // Index where column should be inserted

// Refresh rows (works with proxy mode)
async function refreshRows() {
  if (gridRef.value?.refresh) {
    await gridRef.value.refresh()
  }
}

// Add row
function handleAddRow() {
  editingRow.value = null
  showRowDialog.value = true
}

// Edit row
function handleEditRow(row: any) {
  editingRow.value = row
  showRowDialog.value = true
}

// Delete row
async function handleDeleteRow(row: any) {
  try {
    await ElMessageBox.confirm(
      'Are you sure you want to delete this row? This action cannot be undone.',
      'Delete Row',
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )

    const {$api} = useNuxtApp()
    await $api(
      `/api/workspaces/${workspaceSlug.value}/tables/${tableSlug.value}/rows/${row.id}`,
      { method: 'DELETE' }
    )

    ElMessage.success('Row deleted successfully')
    await refreshRows()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Error deleting row:', error)
      ElMessage.error('Failed to delete row')
    }
  }
}

// Row saved
async function handleRowSaved() {
  await refreshRows()
  showRowDialog.value = false
  editingRow.value = null
}

// Navigate to settings
function navigateToSettings() {
  navigateTo(`/workspaces/${workspaceSlug.value}/tables/${tableSlug.value}/settings`)
}

// Column management handlers
function handleAddColumnLeft(column: any) {
  console.log('Add column left of:', column)
  editingColumn.value = undefined
  
  // Find the index of the clicked column
  const columnIndex = currentView.value?.data.columns.findIndex((col: DataTableColumn) => col.id === column.id)
  if (columnIndex !== undefined && columnIndex !== -1) {
    columnPosition.value = columnIndex // Insert before this column
  } else {
    columnPosition.value = 0 // Default to beginning
  }
  
  showColumnDialog.value = true
}

function handleAddColumnRight(column: any) {
  console.log('Add column right of:', column)
  editingColumn.value = undefined
  
  // Find the index of the clicked column
  const columnIndex = currentView.value?.data.columns.findIndex((col: DataTableColumn) => col.id === column.id)
  if (columnIndex !== undefined && columnIndex !== -1) {
    columnPosition.value = columnIndex + 1 // Insert after this column
  } else {
    columnPosition.value = currentView.value?.data.columns.length || 0 // Default to end
  }
  
  showColumnDialog.value = true
}

function handleEditColumn(column: any) {
  console.log('Edit column:', column)
  // Find full column data from view
  const fullColumn = currentView.value?.data.columns.find((col: DataTableColumn) => col.id === column.id)
  if (fullColumn) {
    editingColumn.value = fullColumn
    columnPosition.value = null
    showColumnDialog.value = true
  } else {
    ElMessage.error('Column not found')
  }
}

async function handleRemoveColumn(column: any) {
  try {
    await ElMessageBox.confirm(
      `Are you sure you want to remove the column "${column.title}"? This action cannot be undone.`,
      'Remove Column',
      {
        confirmButtonText: 'Remove',
        cancelButtonText: 'Cancel',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
    
    const {$api} = useNuxtApp()
    await $api(
      `/api/workspaces/${workspaceSlug.value}/tables/${tableSlug.value}/columns/${column.id}`,
      { method: 'DELETE' as any }
    )
    
    ElMessage.success(`Column "${column.title}" removed`)
    await refreshView()
    await refreshTable()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Error removing column:', error)
      ElMessage.error('Failed to remove column')
    }
  }
}

// Handle column reorder
async function handleColumnReorder({ oldColumn, newColumn, dragPos }: any) {
  console.log('Column reordered:', oldColumn.field, '→', newColumn.field, dragPos)
  
  if (!currentView.value?.data.columns) return
  
  try {
    // Calculate new order on frontend
    const columns = [...currentView.value.data.columns]
    const oldIndex = columns.findIndex(col => col.id === oldColumn.id)
    const newIndex = columns.findIndex(col => col.id === newColumn.id)
    
    if (oldIndex === -1 || newIndex === -1) return
    
    // Remove from old position
    const [movedColumn] = columns.splice(oldIndex, 1)
    
    if (!movedColumn) return
    
    // Insert at new position
    let insertIndex = newIndex
    if (dragPos === 'right') {
      insertIndex = oldIndex < newIndex ? newIndex : newIndex + 1
    } else {
      insertIndex = oldIndex < newIndex ? newIndex - 1 : newIndex
    }
    columns.splice(insertIndex, 0, movedColumn)
    
    // Send ordered column IDs to backend (update view, not column metadata)
    const columnIds = columns.map(col => col.id)
    
    const {$api} = useNuxtApp()
    await $api(
      `/api/workspaces/${workspaceSlug.value}/tables/${tableSlug.value}/columns/reorder`,
      {
        method: 'PUT',
        body: { 
          viewId: currentView.value.data.id,
          columnIds 
        }
      }
    )
    
    ElMessage.success('Column order updated')
  } catch (error: any) {
    console.error('Error reordering column:', error)
    ElMessage.error('Failed to update column order')
  }
}

// Column saved
async function handleColumnSaved(savedColumn: DataTableColumn) {
  if (savedColumn && currentView.value?.data && !editingColumn.value) {
    // Only add to view if it's a new column (not editing)
    try {
      const visibleColumns = (currentView.value.data.columns?.map((col: DataTableColumn) => col.id) || []) as string[]
      
      // Use the columnPosition index directly
      const insertIndex = columnPosition.value !== null ? columnPosition.value : visibleColumns.length
      
      // Insert column at the specified position
      visibleColumns.splice(insertIndex, 0, savedColumn.id)
      
      // Update the view
      await $fetch(
        `/api/workspaces/${workspaceSlug.value}/tables/${tableSlug.value}/views/${currentView.value.data.id}`,
        {
          // @ts-ignore - Nuxt $fetch PUT method type issue
          method: 'PUT',
          body: {
            visibleColumns
          }
        }
      )
    } catch (error) {
      console.error('Error adding column to view:', error)
      ElMessage.warning('Column created but failed to add to view. Please refresh the page.')
    }
  }
  
  await refreshView()
  await refreshTable()
  handleCloseColumnDialog()
}

// Close column dialog and reset state
function handleCloseColumnDialog() {
  showColumnDialog.value = false
  editingColumn.value = undefined
  columnPosition.value = null
}


// Dynamic page title based on table name
const pageTitle = computed(() => {
  const tableName = table.value?.data.name
  return tableName ? `${tableName} - DocPal` : 'Table - DocPal'
})

useHead({
  title: pageTitle
})

</script>

<template>
  <div class="table-view-page">
    <!-- Teleport: Page Actions -->
    <Teleport v-if="table && isMounted" to="#app-page-actions">
      <nuxt-link :to="`/workspaces/${workspaceSlug}/tables/${tableSlug}/settings`">
        <el-button size="small">
          <Icon name="lucide:settings" />
          Settings
        </el-button>
      </nuxt-link>
      <el-button size="small" type="primary" @click="handleAddRow">
        <Icon name="lucide:plus" />
        Add Row
      </el-button>
    </Teleport>
    
    <!-- Loading State -->
    <div v-if="tablePending || viewPending" class="loading-state">
      <el-skeleton :rows="5" animated />
    </div>
    
    <!-- Error State -->
    <div v-else-if="!table || !currentView" class="error-state">
      <Icon name="lucide:alert-circle" size="48" />
      <h3>{{ !table ? 'Table not found' : 'View not found' }}</h3>
      <p>{{ !table ? "The table you're looking for doesn't exist or has been deleted." : "The default view for this table is missing." }}</p>
    </div>
    
    <!-- Table Content -->
    <div v-else class="table-content">
      
      <!-- Data Grid with Auto Proxy & Virtual Scroll -->
      <div class="table-data">
        <DataGrid
          ref="gridRef"
          :columns="gridColumns"
          :workspace-slug="workspaceSlug"
          :table-slug="tableSlug"
          :auto-proxy="true"
          :allow-column-management="true"
          :virtual-scroll="true"
          :scroll-y-load="false"
          :page-size="50"
          height="100%"
          @edit="handleEditRow"
          @delete="handleDeleteRow"
          @add-column-left="handleAddColumnLeft"
          @add-column-right="handleAddColumnRight"
          @edit-column="handleEditColumn"
          @remove-column="handleRemoveColumn"
          @column-reorder="handleColumnReorder"
        />
      </div>
    </div>
    
    <!-- Column Dialog -->
    <AppTableColumnDialog
      v-if="table && currentView"
      v-model:visible="showColumnDialog"
      :column="editingColumn"
      :position="columnPosition"
      :workspace-slug="workspaceSlug"
      :table-slug="tableSlug"
      @saved="handleColumnSaved"
      @update:visible="(val) => { if (!val) handleCloseColumnDialog() }"
    />
    
    <!-- Row Dialog -->
    <AppTableRowDialog
      v-if="table && currentView"
      v-model:visible="showRowDialog"
      :workspace-slug="workspaceSlug"
      :table-slug="tableSlug"
      :table="table.data"
      :row="editingRow"
      @saved="handleRowSaved"
    />
  </div>
</template>

<style lang="scss" scoped>
.table-view-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: var(--app-space-xl);
  
  h3 {
    margin: var(--app-space-m) 0 var(--app-space-s) 0;
    font-size: var(--app-font-size-xl);
    color: var(--app-text-color-primary);
  }
  
  p {
    margin: 0;
    color: var(--app-text-color-secondary);
    text-align: center;
  }
}

.table-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-data {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--app-bg-color-page);
  padding: var(--app-space-m);
}
</style>

