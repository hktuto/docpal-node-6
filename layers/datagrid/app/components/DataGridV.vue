<script setup lang="ts">
import { ListTable, type ListTableConstructorOptions, themes } from '@visactor/vtable'

/**
 * DataGridV - High-performance data grid using VTable
 * 
 * Features:
 * - Canvas-based rendering for excellent performance
 * - Handles 100k+ rows smoothly
 * - Dynamic columns and data
 * - Sorting, filtering, pagination support
 */

interface Column {
  id?: string // Column ID from database
  field: string // Field name in data
  title: string // Display title
  width?: number | string | 'auto'
  minWidth?: number
  maxWidth?: number
  sortable?: boolean
  type?: 'text' | 'number' | 'date' | 'boolean' | 'link'
  align?: 'left' | 'center' | 'right'
  fixed?: 'left' | 'right'
  visible?: boolean
}

interface Props {
  // Data
  data?: any[]
  columns: Column[]
  loading?: boolean
  
  // View-based query mode
  viewId?: string
  
  // Dimensions
  height?: number | string
  width?: number | string
  
  // Features
  theme?: 'default' | 'arco' | 'bright' | 'dark'
  stripe?: boolean
  border?: boolean
  
  // Pagination
  currentPage?: number
  pageSize?: number
  total?: number
  
  // Actions
  showActions?: boolean
  actionsWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  loading: false,
  height: '100%',
  width: '100%',
  theme: 'arco',
  stripe: true,
  border: true,
  currentPage: 1,
  pageSize: 50,
  total: 0,
  showActions: false,
  actionsWidth: 120,
})

const emit = defineEmits<{
  edit: [row: any]
  delete: [row: any]
  'page-change': [page: number]
  'sort-change': [column: string, direction: 'asc' | 'desc' | null]
}>()

// Refs
const containerRef = ref<HTMLElement | null>(null)
const tableRef = ref<HTMLElement | null>(null)
let tableInstance: ListTable | null = null

// Transform our columns to VTable format
const vtableColumns = computed(() => {
  const cols = props.columns
    .filter(col => col.visible !== false)
    .map(col => {
      const vtableCol: any = {
        field: col.field,
        title: col.title,
        width: col.width || 'auto',
        minWidth: col.minWidth,
        maxWidth: col.maxWidth,
        sort: col.sortable !== false, // Enable sort by default
      }
      
      // Set alignment
      if (col.align) {
        vtableCol.headerStyle = { textAlign: col.align }
        vtableCol.style = { textAlign: col.align }
      } else if (col.type === 'number') {
        vtableCol.headerStyle = { textAlign: 'right' }
        vtableCol.style = { textAlign: 'right' }
      }
      
      // Set fixed position
      if (col.fixed) {
        vtableCol.fixed = col.fixed
      }
      
      return vtableCol
    })
  
  // Add actions column if enabled
  if (props.showActions) {
    cols.push({
      field: '_actions',
      title: 'Actions',
      width: props.actionsWidth,
      fixed: 'right',
      sort: false,
      // TODO: Add custom render for action buttons
    })
  }
  
  return cols
})

// Table options
const options = computed(() => {
  return {
    container: tableRef.value!,
    columns: vtableColumns.value,
    records: props.data,
    theme: getTheme(props.theme),
    autoFillHeight: false,
    autoFillWidth: true,
    // Pagination handled externally
  } as ListTableConstructorOptions
})

// Get VTable theme
function getTheme(themeName: string) {
  switch (themeName) {
    case 'arco':
      return themes.ARCO
    case 'bright':
      return themes.BRIGHT
    case 'dark':
      return themes.DARK
    default:
      return themes.DEFAULT
  }
}

// Setup table
function setupTable() {
  if (!tableRef.value) return
  
  // Destroy existing instance
  if (tableInstance) {
    tableInstance.release()
    tableInstance = null
  }
  
  // Create new table instance
  tableInstance = new ListTable(options.value)
  
  // Listen to events
  tableInstance.on('sort_click', (args: any) => {
    const { col, order } = args
    emit('sort-change', col, order === 'asc' ? 'asc' : order === 'desc' ? 'desc' : null)
    return false // Prevent default behavior
  })
  
  // TODO: Add more event listeners (row click, etc.)
}

// Watch for data/column changes
watch([() => props.data, () => props.columns], () => {
  if (tableInstance) {
    // Update data
    tableInstance.updateOption({
      records: props.data,
      columns: vtableColumns.value,
    })
  }
}, { deep: true })

// Setup on mount
onMounted(() => {
  nextTick(() => {
    setupTable()
  })
})

// Cleanup on unmount
onUnmounted(() => {
  if (tableInstance) {
    tableInstance.release()
    tableInstance = null
  }
})

// Expose methods
defineExpose({
  refresh: () => {
    setupTable()
  },
  getInstance: () => tableInstance,
})
</script>

<template>
  <div ref="containerRef" class="vtable-container">
    <div v-if="loading" class="vtable-loading">
      Loading...
    </div>
    <div 
      ref="tableRef" 
      :style="{ width, height }"
      class="vtable-wrapper"
    />
  </div>
</template>

<style scoped lang="scss">
.vtable-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.vtable-wrapper {
  width: 100%;
  height: 100%;
}

.vtable-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  z-index: 1000;
  font-size: 16px;
  color: var(--app-text-color-secondary);
}
</style>
