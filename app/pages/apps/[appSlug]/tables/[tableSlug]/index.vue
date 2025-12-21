<script setup lang="ts">
import type { DataTable, DataTableColumn } from '#shared/types/db'
import type { VxeGridPropTypes } from 'vxe-table'
import { useApiResponse, $apiResponse } from '~/composables/useApiResponse'

definePageMeta({
  layout: 'app'
})

const route = useRoute()
const appSlug = computed(() => route.params.appSlug as string)
const tableSlug = computed(() => route.params.tableSlug as string)

// Track if component is mounted (for Teleport)
const isMounted = ref(false)
onMounted(() => {
  isMounted.value = true
})

// Fetch table metadata (with columns) - only schema, not rows
const { data: table, pending: tablePending, refresh: refreshTable } = await useApiResponse<DataTable & { columns: DataTableColumn[] }>(
  () => `/api/apps/${appSlug.value}/tables/${tableSlug.value}`,
  {
    key: `table-${appSlug.value}-${tableSlug.value}`,
  }
)

// Grid ref for manual operations
const gridRef = ref()

// Proxy configuration - offload data fetching to vxe-table
const proxyConfig = computed<VxeGridPropTypes.ProxyConfig>(() => ({
  ajax: {
    // Query method - vxe-table will call this automatically
    query: async ({ page, sort, filters }) => {
      try {
        const limit = page.pageSize
        const offset = (page.currentPage - 1) * page.pageSize
        
        const response = await $apiResponse<any[]>(
          `/api/apps/${appSlug.value}/tables/${tableSlug.value}/rows?limit=${limit}&offset=${offset}`
        )
        
        return {
          result: response || [],
          page: {
            total: response.meta?.pagination?.total || 0
          }
        }
      } catch (error) {
        console.error('Error fetching rows:', error)
        ElMessage.error('Failed to load table data')
        return {
          result: [],
          page: { total: 0 }
        }
      }
    },
  },
  // Auto query on load
  autoLoad: true
}))

// Transform columns for DataGrid
const gridColumns = computed(() => {
  if (!table.value?.columns) return []
  
  return table.value.columns.map(col => ({
    field: col.name,
    title: col.label,
    minWidth: 120,
    sortable: true,
  }))
})

// Row dialog state
const showRowDialog = ref(false)
const editingRow = ref<any>(null)

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

    await $apiResponse(
      `/api/apps/${appSlug.value}/tables/${tableSlug.value}/rows/${row.id}`,
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
  navigateTo(`/apps/${appSlug.value}/tables/${tableSlug.value}/settings`)
}
</script>

<template>
  <div class="table-view-page">
    <!-- Teleport: Page Actions -->
    <Teleport v-if="table && isMounted" to="#app-page-actions">
      <el-button size="small" @click="navigateToSettings">
        <Icon name="lucide:settings" />
        Settings
      </el-button>
      <el-button size="small" type="primary" @click="handleAddRow">
        <Icon name="lucide:plus" />
        Add Row
      </el-button>
    </Teleport>
    
    <!-- Loading State -->
    <div v-if="tablePending" class="loading-state">
      <el-skeleton :rows="5" animated />
    </div>
    
    <!-- Error State -->
    <div v-else-if="!table" class="error-state">
      <Icon name="lucide:alert-circle" size="48" />
      <h3>Table not found</h3>
      <p>The table you're looking for doesn't exist or has been deleted.</p>
    </div>
    
    <!-- Table Content -->
    <div v-else class="table-content">
      
      <!-- Data Grid with Proxy & Virtual Scroll -->
      <div class="table-data">
        <DataGrid
          ref="gridRef"
          :columns="gridColumns"
          :proxy-config="proxyConfig"
          :virtual-scroll="true"
          :scroll-y-load="false"
          :page-size="50"
          height="100%"
          @edit="handleEditRow"
          @delete="handleDeleteRow"
        />
      </div>
    </div>
    
    <!-- Row Dialog -->
    <AppTableRowDialog
      v-if="table"
      v-model:visible="showRowDialog"
      :app-slug="appSlug"
      :table-slug="tableSlug"
      :table="table"
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

