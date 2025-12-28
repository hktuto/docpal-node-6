<script setup lang="ts" generic="T extends Record<string, any>">
import type { VxeGridProps, VxeColumnPropTypes, VxeGridPropTypes } from 'vxe-table'

interface Column {
  id?: string // Column ID for management operations
  field: string
  title: string
  width?: number | string
  minWidth?: number | string
  sortable?: boolean
  fixed?: VxeColumnPropTypes.Fixed
  visible?: boolean // Support column visibility from view
  formatter?: (params: { cellValue: any, row: any }) => string
  slots?: {
    default?: string
  }
}

interface Props {
  // Data mode: either provide data directly OR use proxy
  data?: T[]
  columns: DataTableColumn[]
  loading?: boolean
  height?: number | string
  maxHeight?: number | string
  stripe?: boolean
  border?: boolean
  showOverflow?: boolean
  
  // Pagination (for manual mode)
  currentPage?: number
  pageSize?: number
  total?: number
  pageSizes?: number[]
  
  // Proxy mode - let vxe-table handle everything
  proxyConfig?: VxeGridPropTypes.ProxyConfig
  
  // Auto proxy mode - provide API endpoint details
  workspaceSlug?: string
  tableSlug?: string
  viewId?: string // NEW: Query by view instead of raw table
  autoProxy?: boolean // Enable automatic proxy configuration
  
  // Virtual scrolling - for large datasets
  virtualScroll?: boolean
  scrollYLoad?: boolean // Enable lazy loading on scroll
  scrollY?: any // VxeGridPropTypes.ScrollY
  
  // Selection
  checkboxConfig?: VxeGridProps['checkboxConfig']
  
  // Actions
  showActions?: boolean
  actionsWidth?: number | string
  actionsFixed?: VxeColumnPropTypes.Fixed
  
  // Column Management
  allowColumnManagement?: boolean // Enable column editing features
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  loading: false,
  height: 'auto',
  stripe: true,
  border: true,
  showOverflow: true,
  currentPage: 1,
  pageSize: 50,
  total: 0,
  pageSizes: () => [10, 20, 50, 100, 200],
  autoProxy: false, // Disabled by default
  virtualScroll: true, // Enable virtual scroll by default for performance
  scrollYLoad: false, // Lazy loading on scroll (disabled by default, use with proxy)
  showActions: true,
  actionsWidth: 120,
  actionsFixed: 'right',
  allowColumnManagement: false, // Disabled by default
})

interface Emits {
  (e: 'update:currentPage', value: number): void
  (e: 'update:pageSize', value: number): void
  (e: 'pageChange', params: { currentPage: number, pageSize: number }): void
  (e: 'proxyQuery', params: any): void
  (e: 'proxyDelete', params: any): void
  (e: 'edit', row: T): void
  (e: 'delete', row: T): void
  (e: 'view', row: T): void
  (e: 'selectionChange', rows: T[]): void
  // Column management events
  (e: 'add-column-left', column: Column): void
  (e: 'add-column-right', column: Column): void
  (e: 'edit-column', column: Column): void
  (e: 'remove-column', column: Column): void
  (e: 'column-reorder', params: { oldColumn: Column, newColumn: Column, dragPos: 'left' | 'right' }): void
}

const emit = defineEmits<Emits>()

// Try to inject table context (optional, falls back to events)
const tableContext = useTableContext()

// Grid ref
const $grid = ref()

// Expose methods to parent
defineExpose({
  $grid,
  refresh: () => {
    if ($grid.value) {
      $grid.value.commitProxy('query')
    }
  },
  getCheckboxRecords: () => {
    return $grid.value?.getCheckboxRecords() || []
  },
  clearCheckboxRow: () => {
    $grid.value?.clearCheckboxRow()
  }
})

function getGridColumns() {
  const displayColumns = props.columns.filter((col: DataTableColumn) => !col.isHidden)
  return displayColumns.map((col: DataTableColumn) => {
    // Get custom width from view config if available
    
    return {
      id: col.id, // Include column ID for management operations
      field: col.type === 'relation' ? `${col.name}.displayFieldValue` : col.name,
      title: col.label,
      width: undefined,
      minWidth: 120,
      sortable: true,
      fixed: undefined,
      visible: !col.isHidden, // Respect column visibility
      formatter: undefined,
      slots: undefined
    }
  })
}

// Build automatic proxy configuration
function buildAutoProxyConfig(workspaceSlug: string, tableSlug: string): VxeGridPropTypes.ProxyConfig {
  return {
    ajax: {
      query: async ({ page, sort, filters }) => {
        const { $api } = useNuxtApp()
        try {
          const limit = page.pageSize
          const offset = (page.currentPage - 1) * page.pageSize
          
          // Get view ID from props
          const viewId = props.viewId
          if (!viewId) {
            console.error('View ID is required for DataGrid')
            return { result: [], page: { total: 0 } }
          }
          
          // Get temporary filters/sorts from table context (if available)
          const tempFilters = tableContext?.tempFilters?.value || null
          const tempSorts = tableContext?.tempSorts?.value || null
          
          // Use POST to send complex filters/sorts in body
          const apiResponse = await $api<{ data: any[], meta?: any }>(
            `/api/query/views/${viewId}/rows`,
            {
              method: 'POST',
              body: {
                limit,
                offset,
                filters: tempFilters,
                sorts: tempSorts
              }
            }
          )
          
          return {
            result: apiResponse.data || [],
            page: {
              total: apiResponse.meta?.pagination?.total || 0
            }
          }
        } catch (error) {
          console.error('Error fetching rows:', error)
          // Show error message if available
          if (typeof ElMessage !== 'undefined') {
            ElMessage.error('Failed to load table data')
          }
          return {
            result: [],
            page: { total: 0 }
          }
        }
      }
    },
    autoLoad: true
  }
}

// Computed grid config
const gridOptions = computed<VxeGridProps>(() => {
  const config: VxeGridProps = {
    height: props.height,
    maxHeight: props.maxHeight,
    stripe: props.stripe,
    border: props.border,
    showOverflow: props.showOverflow,
    columns: buildColumns(),
    checkboxConfig: props.checkboxConfig,
    menuConfig: buildMenuConfig(), // Add menu config for column management
    columnConfig: props.allowColumnManagement ? {
      resizable: true,
      drag: true, // Enable column drag-to-reorder
    } : {
      resizable: true,
    },
  }
  
  // Enable virtual scrolling for large datasets
  if (props.virtualScroll) {
    config.scrollY = props.scrollY || {
      enabled: true,
      gt: 20, // Enable virtual scroll when rows > 20
      mode: 'default' // Can be 'default' or 'wheel'
    }
    
    // Enable lazy loading on scroll (works with proxy)
    if (props.scrollYLoad) {
      config.scrollY = {
        ...config.scrollY,
        enabled: true,
        mode: 'default'
      }
    }
  }
  
  // Auto proxy mode - build proxy config automatically
  const finalProxyConfig = props.proxyConfig || (props.autoProxy && props.workspaceSlug && props.tableSlug 
    ? buildAutoProxyConfig(props.workspaceSlug, props.tableSlug)
    : null)
  
  // Proxy mode - let vxe-table handle everything
  if (finalProxyConfig) {
    config.proxyConfig = finalProxyConfig
    config.pagerConfig = {
      enabled: true,
      pageSize: props.pageSize,
      pageSizes: props.pageSizes,
      layouts: ['PrevPage', 'JumpNumber', 'NextPage', 'Sizes', 'Total'],
    }
  } else {
    // Manual mode - provide data directly
    config.loading = props.loading
    config.data = props.data
    config.pagerConfig = {
      enabled: true,
      currentPage: props.currentPage,
      pageSize: props.pageSize,
      total: props.total,
      pageSizes: props.pageSizes,
      layouts: ['PrevPage', 'JumpNumber', 'NextPage', 'Sizes', 'Total'],
    }
  }
  
  return config
})

// Handle column menu clicks
function handleColumnMenuClick({ menu, column }: { menu: any, column: any }) {
  // Find the original column data from props.columns
  const columnData = props.columns.find(col => col.name === (column.field.includes('.') ? column.field.split('.')[0] : column.field))

  if (!columnData) return
  
  switch (menu.code) {
    case 'add-column-left':
      if (tableContext) {
        tableContext.handleAddColumnLeft(columnData)
      } else {
        emit('add-column-left', columnData)
      }
      break
    case 'add-column-right':
      if (tableContext) {
        tableContext.handleAddColumnRight(columnData)
      } else {
        emit('add-column-right', columnData)
      }
      break
    case 'edit-column':

      if (tableContext) {
        tableContext.handleEditColumn(columnData)
      } else {
        emit('edit-column', columnData)
      }
      break
    case 'remove-column':
      if (tableContext) {
        tableContext.handleRemoveColumn(columnData)
      } else {
        emit('remove-column', columnData)
      }
      break
  }
}

// Build columns config
function buildColumns(): any[] {
  const columns = getGridColumns() // generate columns from props.columns
  const cols: any[] = columns
    .filter(col => col.visible !== false) // Filter out hidden columns
    .map(col => {
      const colConfig: any = {
        field: col.field,
        title: col.title,
        width: col.width,
        minWidth: col.minWidth,
        sortable: col.sortable,
        fixed: col.fixed,
        visible: col.visible !== false, // Default to visible
        showOverflow: props.showOverflow
      }
      
      if (col.formatter) colConfig.formatter = col.formatter
      if (col.slots) colConfig.slots = col.slots
      
      return colConfig
    })
  
  // Add actions column if enabled
  if (props.showActions) {
    cols.push({
      title: 'Actions',
      width: props.actionsWidth,
      fixed: props.actionsFixed,
      slots: { default: 'actions' },
    })
  }
  
  return cols
}

// Build menu config for column management
function buildMenuConfig() {
  if (!props.allowColumnManagement) return undefined
  
  return {
    header: {
      options: [
        [
          {
            code: 'add-column-left',
            name: 'Add Column Left',
            prefixIcon: 'vxe-icon-square-plus',
            visible: true,
            disabled: false
          },
          {
            code: 'add-column-right',
            name: 'Add Column Right',
            prefixIcon: 'vxe-icon-square-plus',
            visible: true,
            disabled: false
          }
        ],
        [
          {
            code: 'edit-column',
            name: 'Edit Column',
            prefixIcon: 'vxe-icon-edit',
            visible: true,
            disabled: false
          },
          {
            code: 'remove-column',
            name: 'Remove Column',
            prefixIcon: 'vxe-icon-delete',
            visible: true,
            disabled: false
          }
        ]
      ]
    },
    visibleMethod: ({ type, options, column }: any) => {
      // Only show menu on header
      if (type === 'header') {
        return true
      }
      return false
    }
  }
}

// Handle pagination change
function handlePageChange({ currentPage, pageSize }: { currentPage: number, pageSize: number }) {
  emit('update:currentPage', currentPage)
  emit('update:pageSize', pageSize)
  emit('pageChange', { currentPage, pageSize })
}

// Handle selection change
function handleSelectionChange({ records }: { records: T[] }) {
  emit('selectionChange', records)
}

// Handle column drag end
function handleColumnDragEnd({ newColumn, oldColumn, dragPos }: any) {
  if (!props.allowColumnManagement) return
  
  // Find the original column data from props.columns
  const oldColumnData = props.columns.find(col => col.field === oldColumn.field)
  const newColumnData = props.columns.find(col => col.field === newColumn.field)
  
  if (oldColumnData && newColumnData) {
    const params = {
      oldColumn: oldColumnData,
      newColumn: newColumnData,
      dragPos
    }
    
    if (tableContext) {
      tableContext.handleColumnReorder(params)
    } else {
      emit('column-reorder', params)
    }
  }
}

// Action handlers - use context if available, otherwise emit
function handleEdit(row: T) {
  if (tableContext) {
    tableContext.handleEditRow(row)
  } else {
    emit('edit', row)
  }
}

function handleDelete(row: T) {
  if (tableContext) {
    tableContext.handleDeleteRow(row)
  } else {
    emit('delete', row)
  }
}

function handleView(row: T) {
  emit('view', row)
}

// Watch for filter/sort changes and refresh data
watch(() => tableContext?.tempFilters?.value, (newFilters) => {
  console.log('Filters changed, refreshing grid:', newFilters)
  $grid.value?.commitProxy('query')
}, { deep: true })

watch(() => tableContext?.tempSorts?.value, (newSorts) => {
  console.log('Sorts changed, refreshing grid:', newSorts)
  $grid.value?.commitProxy('query')
}, { deep: true })
</script>

<template>
  <div class="data-grid">
    <vxe-grid
      ref="$grid"
      v-bind="gridOptions"
      @page-change="handlePageChange"
      @checkbox-change="handleSelectionChange"
      @checkbox-all="handleSelectionChange"
      @proxy-query="(params) => emit('proxyQuery', params)"
      @proxy-delete="(params) => emit('proxyDelete', params)"
      @menu-click="handleColumnMenuClick"
      @column-dragend="handleColumnDragEnd"
    >
      
      <!-- Actions column slot -->
      <template #actions="{ row }">
        <div class="actions-cell">
          <el-button
            link
            type="primary"
            size="small"
            @click="handleView(row)"
          >
            <Icon name="lucide:eye" size="16" />
          </el-button>
          <el-button
            link
            type="primary"
            size="small"
            @click="handleEdit(row)"
          >
            <Icon name="lucide:pencil" size="16" />
          </el-button>
          <el-button
            link
            type="danger"
            size="small"
            @click="handleDelete(row)"
          >
            <Icon name="lucide:trash-2" size="16" />
          </el-button>
        </div>
      </template>
      
      <!-- Pass through custom column slots -->
      <template v-for="col in columns" :key="col.field" #[col.field]="slotProps">
        <slot :name="col.field" v-bind="slotProps" />
      </template>
      
      <!-- Empty state -->
      <template #empty>
        <el-empty description="No data" />
      </template>
    </vxe-grid>
  </div>
</template>

<style lang="scss" scoped>
.data-grid {
  height: 100%;
  
  .actions-cell {
    display: flex;
    gap: 4px;
    align-items: center;
    justify-content: center;
  }
}
</style>

