<script setup lang="ts">
import type { DataTableView, DataTableColumn } from '#shared/types/db'
import { TableContextKey, type TableContext } from '~/composables/useTableContext'

definePageMeta({
  layout: 'app'
})

const route = useRoute()
const router = useRouter()
const workspaceSlug = computed(() => route.params.workspaceSlug as string)
const tableSlug = computed(() => route.params.tableSlug as string)
const viewSlug = computed(() => route.params.viewSlug as string)

// Track if component is mounted (for Teleport)
const isMounted = ref(false)
onMounted(() => {
  isMounted.value = true
})

// Fetch workspace (for menu refresh)
const { data: workspace, refresh: refreshWorkspace } = await useApi<SuccessResponse<any>>(
  () => `/api/workspaces/${workspaceSlug.value}`,
  {
    key: `workspace-${workspaceSlug.value}`,
  }
)

// Fetch table metadata first (for breadcrumbs and dialogs)
const { data: table } = await useApi<SuccessResponse<any>>(
  () => `/api/workspaces/${workspaceSlug.value}/tables/${tableSlug.value}`,
  {
    key: `table-${workspaceSlug.value}-${tableSlug.value}`,
  }
)

// Fetch view (uses existing table-based endpoint)
const { data: viewData, pending: viewPending, refresh: refreshView } = await useApi<SuccessResponse<DataTableView & { 
  columns: DataTableColumn[]
  allColumns: DataTableColumn[]
}>>(
  () => `/api/workspaces/${workspaceSlug.value}/tables/${tableSlug.value}/views/${viewSlug.value}`,
  {
    key: `view-${workspaceSlug.value}-${tableSlug.value}-${viewSlug.value}`,
  }
)

// Extract table info
const tableName = computed(() => table.value?.data.name || '')

// Row dialog state
const showRowDialog = ref(false)
const editingRow = ref<any>(null)

// Column dialog state
const showColumnDialog = ref(false)
const editingColumn = ref<DataTableColumn | undefined>(undefined)
const columnPosition = ref<number | null>(null)

// View dialog states
const showViewSettingsDialog = ref(false)

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
    // DataGrid auto-refreshes via proxy
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Error deleting row:', error)
      ElMessage.error('Failed to delete row')
    }
  }
}

// Row saved
async function handleRowSaved() {
  // DataGrid auto-refreshes via proxy
  showRowDialog.value = false
  editingRow.value = null
}

// Column management handlers
function handleAddColumnLeft(column: any) {
  console.log('Add column left of:', column)
  editingColumn.value = undefined
  
  // Find the index of the clicked column
  const columnIndex = viewData.value?.data.columns.findIndex((col: DataTableColumn) => col.id === column.id)
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
  const columnIndex = viewData.value?.data.columns.findIndex((col: DataTableColumn) => col.id === column.id)
  if (columnIndex !== undefined && columnIndex !== -1) {
    columnPosition.value = columnIndex + 1 // Insert after this column
  } else {
    columnPosition.value = viewData.value?.data.columns.length || 0 // Default to end
  }
  
  showColumnDialog.value = true
}

function handleEditColumn(column: any) {
  console.log('Edit column:', column)
  // Find full column data from view
  const fullColumn = viewData.value?.data.columns.find((col: DataTableColumn) => col.id === column.id)
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
  
  if (!viewData.value?.data.columns) return
  
  try {
    // Calculate new order on frontend
    const columns = [...viewData.value.data.columns]
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
          viewSlug: viewData.value.data.slug,
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
  if (savedColumn && viewData.value?.data && !editingColumn.value) {
    // Only add to view if it's a new column (not editing)
    try {
      const visibleColumns = (viewData.value.data.columns?.map((col: DataTableColumn) => col.id) || []) as string[]
      
      // Use the columnPosition index directly
      const insertIndex = columnPosition.value !== null ? columnPosition.value : visibleColumns.length
      
      // Insert column at the specified position
      visibleColumns.splice(insertIndex, 0, savedColumn.id)
      
      // Update the view
      await $fetch(
        `/api/workspaces/${workspaceSlug.value}/tables/${tableSlug.value}/views/${viewData.value.data.slug}`,
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
  handleCloseColumnDialog()
}

// Close column dialog and reset state
function handleCloseColumnDialog() {
  showColumnDialog.value = false
  editingColumn.value = undefined
  columnPosition.value = null
}

// Handle view edit (opens settings dialog)
function handleViewEdit() {
  showViewSettingsDialog.value = true
}

// Handle view settings save
async function handleViewSettingsSave(updates: Partial<DataTableView>) {
  if (!viewData.value?.data) return
  
  try {
    const { $api } = useNuxtApp()
    await $api(
      `/api/workspaces/${workspaceSlug.value}/tables/${tableSlug.value}/views/${viewData.value.data.slug}`,
      {
        method: 'PUT' as any,
        body: updates
      }
    )
    
    // Refresh view data
    await refreshView()
    
    ElMessage.success('View updated')
  } catch (error: any) {
    console.error('Error updating view:', error)
    ElMessage.error('Failed to update view')
  }
}

// State for temporary filters/sorts (applied to query, not saved to view)
const tempFilters = ref<any>(null)
const tempSorts = ref<any>(null)

// Handle temporary filters applied (DON'T save to view, just apply to query)
function handleFiltersApplied(filters: any) {
  console.log('Temporary filters applied:', filters)
  tempFilters.value = filters
  // DataGrid will auto-refresh via proxy with new filters
}

// Handle temporary sorts applied (DON'T save to view, just apply to query)
function handleSortsApplied(sorts: any) {
  console.log('Temporary sorts applied:', sorts)
  tempSorts.value = sorts
  // DataGrid will auto-refresh via proxy with new sorts
}

// Handle view duplicate
async function handleViewDuplicate() {
  if (!viewData.value?.data) return
  
  try {
    const { $api } = useNuxtApp()
    const response = await $api<SuccessResponse<DataTableView>>(
      `/api/workspaces/${workspaceSlug.value}/tables/${tableSlug.value}/views/${viewData.value.data.slug}/duplicate`,
      {
        method: 'POST'
      }
    )
    
    // Navigate to the table page with the duplicated view
    if (response.data) {
      await navigateTo(`/workspaces/${workspaceSlug.value}/table/${tableSlug.value}#view-${response.data.slug}`)
    }
    
    ElMessage.success('View duplicated')
  } catch (error: any) {
    console.error('Error duplicating view:', error)
    ElMessage.error('Failed to duplicate view')
  }
}

// Handle view delete
async function handleViewDelete() {
  if (!viewData.value?.data) return
  
  const view = viewData.value.data
  
  try {
    await ElMessageBox.confirm(
      `Delete view "${view.name}"? This cannot be undone.`,
      'Delete View',
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning',
      }
    )
    
    const { $api } = useNuxtApp()
    await $api(
      `/api/workspaces/${workspaceSlug.value}/tables/${tableSlug.value}/views/${view.slug}`,
      {
        method: 'DELETE' as any
      }
    )
    
    // Refresh workspace to update menu (view was removed from menu by delete API)
    await refreshWorkspace()
    
    // Navigate back to table page
    await navigateTo(`/workspaces/${workspaceSlug.value}/table/${tableSlug.value}`)
    
    ElMessage.success('View deleted')
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Error deleting view:', error)
      ElMessage.error('Failed to delete view')
    }
  }
}

// Navigate to table page
function navigateToTable() {
  navigateTo(`/workspaces/${workspaceSlug.value}/table/${tableSlug.value}`)
}

// Navigate to settings
function navigateToSettings() {
  navigateTo(`/workspaces/${workspaceSlug.value}/table/${tableSlug.value}/settings`)
}

// ============================================
// PROVIDE TABLE CONTEXT
// ============================================

// Provide table context for child components to inject
const tableContext: TableContext = {
  workspaceSlug,
  tableSlug,
  table: computed(() => table.value?.data || null),
  currentView: computed(() => viewData.value?.data || null),
  
  // Temporary filters/sorts state
  tempFilters,
  tempSorts,
  
  // Row actions
  handleAddRow,
  handleEditRow,
  handleDeleteRow,
  handleRowSaved,
  
  // Column actions
  handleAddColumnLeft,
  handleAddColumnRight,
  handleEditColumn,
  handleRemoveColumn,
  handleColumnReorder,
  handleColumnSaved,
  
  // View actions
  handleViewUpdate: handleViewSettingsSave,
  handleViewEdit: () => handleViewEdit(),
  
  // Filter/Sort actions
  handleFiltersApplied,
  handleSortsApplied,
  
  // Refresh actions
  refreshView,
  refreshTable: async () => {}, // Not needed in view detail page
  refreshWorkspace
}

provide(TableContextKey, tableContext)

// Dynamic page title based on view name
const pageTitle = computed(() => {
  const viewName = viewData.value?.data.name
  return viewName ? `${viewName} - DocPal` : 'View - DocPal'
})

useHead({
  title: pageTitle
})

</script>

<template>
  <div class="view-detail-page">
    <!-- Teleport: Page Actions -->
    <Teleport v-if="viewData && isMounted" to="#app-page-actions">
      <el-button-group>
        <el-button size="small" @click="handleViewEdit">
          <Icon name="lucide:settings" />
          Edit View
        </el-button>
        <el-button size="small" @click="handleViewDuplicate">
          <Icon name="lucide:copy" />
          Duplicate
        </el-button>
        <el-button size="small" @click="navigateToTable">
          <Icon name="lucide:table" />
          Go to Table
        </el-button>
        <el-button size="small" type="danger" plain @click="handleViewDelete">
          <Icon name="lucide:trash-2" />
          Delete
        </el-button>
      </el-button-group>
      
      <el-divider direction="vertical" />
      
      <el-button size="small" type="primary" @click="handleAddRow">
        <Icon name="lucide:plus" />
        Add Row
      </el-button>
    </Teleport>
    
    <!-- Loading State -->
    <div v-if="viewPending" class="loading-state">
      <el-skeleton :rows="5" animated />
    </div>
    
    <!-- Error State -->
    <div v-else-if="!viewData" class="error-state">
      <Icon name="lucide:alert-circle" size="48" />
      <h3>View not found</h3>
      <p>The view you're looking for doesn't exist or has been deleted.</p>
    </div>
    
    <!-- View Content -->
    <div v-else class="view-content">
      <!-- View Description (if exists) -->
      <div v-if="viewData.data.description" class="view-description">
        <Icon name="lucide:info" />
        <span>{{ viewData.data.description }}</span>
      </div>
      
      <!-- Render View Component -->
      <AppViewsViewTab
        :view="viewData.data"
        :workspace-slug="workspaceSlug"
        :table-slug="tableSlug"
      />
    </div>
    
    <!-- Column Dialog -->
    <AppTableColumnDialog
      v-if="viewData"
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
      v-if="viewData && table"
      v-model:visible="showRowDialog"
      :workspace-slug="workspaceSlug"
      :table-slug="tableSlug"
      :table="{ ...table.data, columns: viewData.data.allColumns }"
      :row="editingRow"
      @saved="handleRowSaved"
    />
    
    <!-- View Settings Dialog -->
    <AppViewsViewSettingsDialog
      v-if="viewData"
      v-model:visible="showViewSettingsDialog"
      :view="viewData.data"
      :is-creating="false"
      :columns="viewData.data.allColumns || []"
      @save="handleViewSettingsSave"
    />
  </div>
</template>

<style lang="scss" scoped>
.view-detail-page {
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

.view-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.view-description {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
  padding: var(--app-space-m);
  background: var(--el-color-info-light-9);
  border-bottom: 1px solid var(--el-color-info-light-5);
  color: var(--el-color-info);
  font-size: 14px;
}
</style>

