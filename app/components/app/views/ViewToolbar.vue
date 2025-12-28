<script setup lang="ts">
import type { DataTableColumn, FilterGroup, SortConfig } from '#shared/types/db'
import { useTableContext } from '~/composables/useTableContext'

interface Props {
  columns: DataTableColumn[]
  defaultFilters?: FilterGroup | null
  defaultSorts?: SortConfig[] | null
}

const props = defineProps<Props>()

// Inject table context
const tableContext = useTableContext()

// Local state for temporary filters/sorts (not saved to view)
const localFilters = ref<FilterGroup | null>(null)
const localSorts = ref<SortConfig[] | null>(null)

// Initialize with default filters/sorts from view
watch(() => props.defaultFilters, (newFilters) => {
  if (newFilters && !localFilters.value) {
    localFilters.value = JSON.parse(JSON.stringify(newFilters))
  }
}, { immediate: true })

watch(() => props.defaultSorts, (newSorts) => {
  if (newSorts && !localSorts.value) {
    localSorts.value = JSON.parse(JSON.stringify(newSorts))
  }
}, { immediate: true })

// Handle filters change (call context handler directly)
function handleFiltersChange(filters: FilterGroup | null) {
  localFilters.value = filters
  tableContext.handleFiltersApplied(filters)
}

// Handle sorts change (call context handler directly)
function handleSortsChange(sorts: SortConfig[] | null) {
  localSorts.value = sorts
  tableContext.handleSortsApplied(sorts)
}

// Clear all temporary filters/sorts
function handleClearAll() {
  localFilters.value = null
  localSorts.value = null
  tableContext.handleFiltersApplied(null)
  tableContext.handleSortsApplied(null)
}

// Check if user has applied temporary filters/sorts
const hasTemporaryFilters = computed(() => {
  return (localFilters.value?.conditions && localFilters.value.conditions.length > 0)
})

const hasTemporarySorts = computed(() => {
  return (localSorts.value && localSorts.value.length > 0)
})

const hasAnyTemporary = computed(() => hasTemporaryFilters.value || hasTemporarySorts.value)
</script>

<template>
  <div class="view-toolbar">
    <div class="toolbar-main">
      <!-- Filter Builder -->
      <div class="toolbar-section">
        <AppViewsFilterBuilder
          :columns="columns"
          :filters="localFilters"
          @change="handleFiltersChange"
        />
      </div>
      
      <!-- Sort Builder -->
      <div class="toolbar-section">
        <AppViewsSortBuilder
          :columns="columns"
          :sorts="localSorts"
          @change="handleSortsChange"
        />
      </div>
    </div>
    
    <!-- Clear All Button (only show if there are temporary filters/sorts) -->
    <div v-if="hasAnyTemporary" class="toolbar-actions">
      <el-button size="small" @click="handleClearAll">
        <Icon name="lucide:x" />
        Clear All
      </el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.view-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
}

.toolbar-main {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.toolbar-section {
  flex-shrink: 0;
}

.toolbar-actions {
  flex-shrink: 0;
}
</style>
