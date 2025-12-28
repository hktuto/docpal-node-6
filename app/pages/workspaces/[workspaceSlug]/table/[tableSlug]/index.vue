<script setup lang="ts">
import { Grid, Tickets, Calendar, Picture, Link } from '@element-plus/icons-vue'
import type { DataTable, DataTableColumn, DataTableView } from '#shared/types/db'
import { TableContextKey, type TableContext } from '~/composables/useTableContext'

definePageMeta({
  layout: 'app'
})

const route = useRoute()
const router = useRouter()
const workspaceSlug = computed(() => route.params.workspaceSlug as string)
const tableSlug = computed(() => route.params.tableSlug as string)

// Check if we should open create view dialog (from menu)
const shouldOpenCreateView = computed(() => route.query.createView === 'true')

// Track if component is mounted (for Teleport)
const isMounted = ref(false)
onMounted(() => {
  isMounted.value = true
})

// Watch for createView query param and open dialog
watch(shouldOpenCreateView, (shouldOpen) => {
  if (shouldOpen && isMounted.value) {
    // Open create view dialog
    nextTick(() => {
      handleViewCreate()
      // Remove query param from URL
      router.replace({ query: { ...route.query, createView: undefined } })
    })
  }
}, { immediate: true })

// Fetch workspace (for menu refresh)
const { data: workspace, refresh: refreshWorkspace } = await useApi<SuccessResponse<any>>(
  () => `/api/workspaces/${workspaceSlug.value}`,
  {
    key: `workspace-${workspaceSlug.value}`,
  }
)

// Fetch table metadata (with columns) - only schema, not rows
const { data: table, pending: tablePending, refresh: refreshTable } = await useApi<SuccessResponse<DataTable & { columns: DataTableColumn[] }>>(
  () => `/api/workspaces/${workspaceSlug.value}/tables/${tableSlug.value}`,
  {
    key: `table-${workspaceSlug.value}-${tableSlug.value}`,
  }
)

// Fetch ALL views for this table
const { data: allViews, pending: viewsPending, refresh: refreshViews } = await useApi<SuccessResponse<DataTableView[]>>(
  () => `/api/workspaces/${workspaceSlug.value}/tables/${tableSlug.value}/views`,
  {
    key: `views-${workspaceSlug.value}-${tableSlug.value}`,
  }
)

// Current view slug (from URL hash or default)
const currentViewSlug = ref<string>('')

// Parse hash to get view slug
const viewSlugFromHash = computed(() => {
  const hash = route.hash
  if (hash.startsWith('#view-')) {
    return hash.replace('#view-', '')
  }
  return null
})

// Initialize currentViewSlug from URL hash or find default view
watch([allViews, viewSlugFromHash], ([views, slugFromHash]) => {
  if (!views?.data || views.data.length === 0) return
  
  if (slugFromHash) {
    // Try to find view by slug from hash
    const view = views.data.find(v => v.slug === slugFromHash)
    if (view) {
      currentViewSlug.value = view.slug
      return
    }
  }
  
  // Fallback to default view or first view
  const defaultView = views.data.find(v => v.isDefault)
  currentViewSlug.value = defaultView?.slug || views.data[0].slug
}, { immediate: true })

// Fetch current view details (contains view settings + enriched columns)
const { data: currentView, pending: viewPending, refresh: refreshView } = await useApi<SuccessResponse<DataTableView & { 
  columns: DataTableColumn[]
  allColumns: DataTableColumn[] 
}>>(
  () => `/api/workspaces/${workspaceSlug.value}/tables/${tableSlug.value}/views/${currentViewSlug.value || 'default'}`,
  {
    key: `view-${workspaceSlug.value}-${tableSlug.value}`,
    watch: [currentViewSlug],
  }
)

// Row dialog state
const showRowDialog = ref(false)
const editingRow = ref<any>(null)

// Column dialog state
const showColumnDialog = ref(false)
const editingColumn = ref<DataTableColumn | undefined>(undefined)
const columnPosition = ref<number | null>(null) // Index where column should be inserted

// View dialog states
const showViewSettingsDialog = ref(false)
const showPinToMenuDialog = ref(false)
const selectedView = ref<DataTableView | null>(null)
const isCreatingView = ref(false)

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
          viewSlug: currentView.value.data.slug,
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
        `/api/workspaces/${workspaceSlug.value}/tables/${tableSlug.value}/views/${currentView.value.data.slug}`,
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

// ============================================
// VIEW HELPERS
// ============================================

// Get view type icon
function getViewIcon(viewType: string) {
  switch (viewType) {
    case 'grid': return Grid
    case 'kanban': return Tickets
    case 'calendar': return Calendar
    case 'gallery': return Picture
    default: return Grid
  }
}

// ============================================
// VIEW MANAGEMENT HANDLERS
// ============================================

// Handle view change (via tab click)
async function handleViewChange(viewSlug: string) {
  currentViewSlug.value = viewSlug
  
  // Update URL hash
  await router.push({
    hash: `#view-${viewSlug}`
  })
}

// Handle view update (filters, sorts, columns, etc.)
async function handleViewUpdate(updates: Partial<DataTableView>) {
  if (!currentViewSlug.value) return
  
  try {
    const { $api } = useNuxtApp()
    await $api(
      `/api/workspaces/${workspaceSlug.value}/tables/${tableSlug.value}/views/${currentViewSlug.value}`,
      {
        method: 'PUT' as any,
        body: updates
      }
    )
    
    // Refresh view data
    await refreshView()
    await refreshViews() // Also refresh views list in case name changed
    // DataGrid auto-refreshes via proxy
    
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

// Handle view create
function handleViewCreate() {
  selectedView.value = null
  isCreatingView.value = true
  showViewSettingsDialog.value = true
}

// Handle view create submit (from dialog)
async function handleViewCreateSubmit(viewData: Partial<DataTableView>) {
  try {
    const { $api } = useNuxtApp()
    const response = await $api<SuccessResponse<DataTableView>>(
      `/api/workspaces/${workspaceSlug.value}/tables/${tableSlug.value}/views`,
      {
        method: 'POST',
        body: {
          ...viewData,
          isDefault: false,
          // Use current view's columns as default
          visibleColumns: currentView.value?.data.columns?.map((col: DataTableColumn) => col.id) || []
        }
      }
    )
    
    // Refresh views list
    await refreshViews()
    
    // Switch to new view by slug
    if (response.data) {
      await handleViewChange(response.data.slug)
    }
    
    ElMessage.success('View created')
    isCreatingView.value = false
  } catch (error: any) {
    console.error('Error creating view:', error)
    ElMessage.error('Failed to create view')
  }
}

// Handle view delete
async function handleViewDelete(viewSlug: string) {
  const slug = viewSlug
  const view = allViews.value?.data.find(v => v.slug === slug)
  
  if (!view) return
  
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
      `/api/workspaces/${workspaceSlug.value}/tables/${tableSlug.value}/views/${slug}`,
      {
        method: 'DELETE' as any
      }
    )
    
    // Refresh workspace to update menu (view was removed from menu by delete API)
    await refreshWorkspace()
    
    // Refresh views list
    await refreshViews()
    
    // If deleted current view, switch to default
    if (slug === currentViewSlug.value) {
      const defaultView = allViews.value?.data.find(v => v.isDefault)
      if (defaultView) {
        await handleViewChange(defaultView.slug)
      }
    }
    
    ElMessage.success('View deleted')
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Error deleting view:', error)
      ElMessage.error('Failed to delete view')
    }
  }
}

// Handle view duplicate
async function handleViewDuplicate(viewSlug: string) {
  try {
    const { $api } = useNuxtApp()
    const response = await $api<SuccessResponse<DataTableView>>(
      `/api/workspaces/${workspaceSlug.value}/tables/${tableSlug.value}/views/${viewSlug}/duplicate`,
      {
        method: 'POST'
      }
    )
    
    // Refresh views list
    await refreshViews()
    
    // Switch to duplicated view by slug
    if (response.data) {
      await handleViewChange(response.data.slug)
    }
    
    ElMessage.success('View duplicated')
  } catch (error: any) {
    console.error('Error duplicating view:', error)
    ElMessage.error('Failed to duplicate view')
  }
}

// Handle view edit (opens settings dialog)
function handleViewEdit(view: DataTableView) {
  selectedView.value = view
  isCreatingView.value = false
  showViewSettingsDialog.value = true
}

// Handle view settings save
async function handleViewSettingsSave(updates: Partial<DataTableView>) {
  await handleViewUpdate(updates)
}

// Handle pin to menu
function handlePinToMenu(view: DataTableView) {
  selectedView.value = view
  showPinToMenuDialog.value = true
}

// Handle pin to menu confirm
async function handlePinToMenuConfirm(parentId: string | null) {
  if (!selectedView.value || !workspace.value?.data) return
  
  try {
    const { $api } = useNuxtApp()
    
    // Add view to menu
    const currentMenu = workspace.value.data.menu || []
    const newMenuItem = {
      id: `view-${selectedView.value.id}`,
      type: 'view' as const,
      label: selectedView.value.name,
      slug: selectedView.value.slug,
      viewId: selectedView.value.id,
      tableId: table.value?.data.id,
      tableSlug: table.value?.data.slug
    }
    
    // Find parent and add item
    if (parentId) {
      // Add to specific folder
      function addToFolder(items: any[], folderId: string): boolean {
        for (const item of items) {
          if (item.id === folderId && item.type === 'folder') {
            if (!item.children) item.children = []
            item.children.push(newMenuItem)
            return true
          }
          if (item.children && addToFolder(item.children, folderId)) {
            return true
          }
        }
        return false
      }
      addToFolder(currentMenu, parentId)
    } else {
      // Add to root
      currentMenu.push(newMenuItem)
    }
    
    // Update workspace menu
    await $api(
      `/api/workspaces/${workspaceSlug.value}`,
      {
        method: 'PUT' as any,
        body: { menu: currentMenu }
      }
    )
    
    // Refresh workspace to update menu in UI
    await refreshWorkspace()
    
    ElMessage.success('View pinned to menu')
  } catch (error: any) {
    console.error('Error pinning view to menu:', error)
    ElMessage.error('Failed to pin view to menu')
  }
}

// ============================================
// PROVIDE TABLE CONTEXT
// ============================================

// Provide table context for child components to inject
const tableContext: TableContext = {
  workspaceSlug,
  tableSlug,
  table: computed(() => table.value?.data || null),
  currentView: computed(() => currentView.value?.data || null),
  
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
  handleViewUpdate,
  handleViewEdit,
  
  // Filter/Sort actions
  handleFiltersApplied,
  handleSortsApplied,
  
  // Refresh actions
  refreshView,
  refreshTable,
  refreshWorkspace
}

provide(TableContextKey, tableContext)

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
      <nuxt-link :to="`/workspaces/${workspaceSlug}/table/${tableSlug}/settings`">
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
    <div v-if="!table && (viewsPending || viewPending)" class="loading-state">
      <el-skeleton :rows="5" animated />
    </div>
    
    <!-- Error State -->
    <div v-else-if="!table || !allViews || !currentView" class="error-state">
      <Icon name="lucide:alert-circle" size="48" />
      <h3>{{ !table ? 'Table not found' : !allViews ? 'Views not found' : 'Current view not found' }}</h3>
      <p>{{ !table ? "The table you're looking for doesn't exist or has been deleted." : !allViews ? "No views found for this table." : "The selected view is missing." }}</p>
    </div>
    
    <!-- Table Content -->
    <div v-else class="table-content">
      <!-- View Tabs -->
      <el-tabs
        v-if="allViews?.data && currentViewSlug"
        :model-value="currentViewSlug"
        type="card"
        editable
        class="view-tabs"
        @tab-change="(slug: string | number) => handleViewChange(slug as string)"
        @tab-add="handleViewCreate"
        @tab-remove="(slug: string | number) => handleViewDelete(slug as string)"
      >
        <el-tab-pane
          v-for="view in allViews.data"
          :key="view.slug"
          :name="view.slug"
          :closable="!view.isDefault"
        >
          <template #label>
            <div class="tab-label">
              <el-icon><component :is="getViewIcon(view.viewType)" /></el-icon>
              <span>{{ view.name }}</span>
              <el-tag v-if="view.isDefault" size="small" type="info">Default</el-tag>
              <el-icon v-if="view.isPublic" class="badge-icon" title="Public"><Link /></el-icon>
              
              <!-- View Actions Dropdown -->
              <AppViewsViewActionsDropdown
                v-if="view.slug === currentViewSlug"
                :view="view"
                @edit="handleViewEdit(view)"
                @duplicate="handleViewDuplicate(view.slug)"
                @pin="handlePinToMenu(view)"
                @delete="handleViewDelete(view.slug)"
              />
            </div>
          </template>
          
          <!-- Render ViewTab only for current view -->
          <AppViewsViewTab
            v-if="view.slug === currentViewSlug && currentView?.data"
            :view="currentView.data"
            :workspace-slug="workspaceSlug"
            :table-slug="tableSlug"
          />
        </el-tab-pane>
      </el-tabs>
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
    
    <!-- View Settings Dialog -->
    <AppViewsViewSettingsDialog
      v-model:visible="showViewSettingsDialog"
      :view="selectedView"
      :is-creating="isCreatingView"
      :columns="currentView?.data.allColumns || []"
      @save="handleViewSettingsSave"
      @create="handleViewCreateSubmit"
    />
    
    <!-- Pin to Menu Dialog -->
    <AppViewsPinViewToMenuDialog
      v-if="selectedView && workspace"
      v-model:visible="showPinToMenuDialog"
      :view="selectedView"
      :menu="workspace.data.menu || []"
      :workspace-slug="workspaceSlug"
      :table-slug="tableSlug"
      @confirm="handlePinToMenuConfirm"
    />
  </div>
</template>

<style lang="scss" scoped>
.table-view-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  :deep(.el-tabs__new-tab){
    // overrider el-tabs__new-tab button
    margin : var(--app-space-s);
  }
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

/* View Tabs */
.view-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.view-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
}

.view-tabs :deep(.el-tab-pane) {
  height: 100%;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.badge-icon {
  font-size: 14px;
  color: var(--el-color-info);
  margin-left: 4px;
}
</style>

