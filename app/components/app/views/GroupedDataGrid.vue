<script setup lang="ts">
import { ref, computed, watch, inject } from 'vue'
import { CaretRight, CaretBottom } from '@element-plus/icons-vue'
import { TableContextKey } from '~/composables/useTableContext'
import type { DataTableView, DataTableColumn, FilterGroup } from '#shared/types/db'

const props = defineProps<{
  view: DataTableView & { 
    columns: DataTableColumn[]
    allColumns: DataTableColumn[] 
  }
}>()

const tableContext = inject(TableContextKey)!
const { $api } = useNuxtApp()

// Check if view has grouping enabled
const hasGrouping = computed(() => {
  return props.view.viewConfig?.groupBy && 
         props.view.viewConfig?.groupBy !== ''
})

const groupByColumn = computed(() => {
  if (!hasGrouping.value) return null
  return props.view.allColumns?.find(
    col => col.name === props.view.viewConfig?.groupBy
  )
})

// Aggregate field configuration
const aggregateField = computed(() => {
  return props.view.viewConfig?.aggregateField || null
})

const aggregateFunction = computed(() => {
  return props.view.viewConfig?.aggregateFunction || 'SUM'
})

// Fetch group options
const groups = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

async function fetchGroups() {
  if (!hasGrouping.value || !groupByColumn.value) {
    groups.value = []
    return
  }
  
  loading.value = true
  error.value = null
  
  try {
    const aggregateFields = aggregateField.value 
      ? [{ field: aggregateField.value, function: aggregateFunction.value }]
      : []
    
    const response = await $api<SuccessResponse<any>>(
      `/api/query/views/${props.view.id}/group-options`,
      {
        method: 'POST',
        body: {
          columnName: groupByColumn.value.name,
          filters: tableContext.tempFilters.value,
          additionalFilters: null,
          maxOptions: 100,
          includeEmpty: true,
          minCount: 0,
          includeAggregates: !!aggregateField.value,
          aggregateFields
        }
      }
    )
    
    groups.value = response.data.options || []
  } catch (err: any) {
    console.error('Failed to fetch groups:', err)
    error.value = err.message || 'Failed to load groups'
    groups.value = []
  } finally {
    loading.value = false
  }
}

// Build filter for specific group
function getGroupFilter(group: any): FilterGroup {
  const isRelationField = groupByColumn.value?.type === 'relation'
  const filterValue = group.id === null 
    ? null 
    : (isRelationField ? group.id : group.label)
  
  return {
    operator: 'AND',
    conditions: [{
      columnId: groupByColumn.value!.id,
      operator: group.id === null ? 'isEmpty' : 'equals',
      value: filterValue
    }]
  }
}

// Expanded groups state
const expandedGroups = ref<Set<string | null>>(new Set())

function toggleGroup(groupId: string | null) {
  if (expandedGroups.value.has(groupId)) {
    expandedGroups.value.delete(groupId)
  } else {
    expandedGroups.value.add(groupId)
  }
}

// Format aggregate value for display
function formatAggregate(group: any): string {
  if (!group.aggregates || !aggregateField.value) return ''
  
  const agg = group.aggregates[aggregateField.value]
  if (!agg) return ''
  
  const fn = aggregateFunction.value.toLowerCase()
  const value = agg[fn]
  
  if (value == null) return ''
  
  // Get the field to determine formatting
  const field = props.view.allColumns?.find(c => c.name === aggregateField.value)
  
  if (field?.type === 'currency') {
    return `${aggregateFunction.value}: $${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  } else if (field?.type === 'number') {
    return `${aggregateFunction.value}: ${Number(value).toLocaleString()}`
  }
  
  return `${aggregateFunction.value}: ${value}`
}

// Watch for changes
watch([hasGrouping, () => tableContext.tempFilters.value, () => props.view.viewConfig], () => {
  if (hasGrouping.value) {
    fetchGroups()
  }
}, { immediate: true, deep: true })

// Initially expand all groups
watch(groups, (newGroups) => {
  if (newGroups.length > 0) {
    newGroups.forEach(g => expandedGroups.value.add(g.id))
  }
}, { immediate: true })
</script>

<template>
  <div class="grouped-data-grid">
    <!-- No Grouping: Render single DataGrid -->
    <DataGrid
      v-if="!hasGrouping"
      :columns="view.columns"
      :workspace-slug="tableContext.workspaceSlug"
      :table-slug="tableContext.tableSlug"
      :view-id="view.id"
      :auto-proxy="true"
      :allow-column-management="true"
      :virtual-scroll="true"
      :scroll-y-load="false"
      :page-size="view.pageSize || 50"
      height="100%"
    />
    
    <!-- With Grouping: Render groups -->
    <div v-else class="groups-container">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <el-skeleton :rows="3" animated />
      </div>
      
      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <el-alert type="error" :title="error" :closable="false" />
      </div>
      
      <!-- Groups -->
      <div v-else-if="groups.length > 0" class="groups-list">
        <div
          v-for="group in groups"
          :key="group.id || 'empty'"
          class="group-section"
        >
          <!-- Group Header -->
          <div 
            class="group-header"
            :style="group.color ? { borderLeftColor: group.color } : {}"
            @click="toggleGroup(group.id)"
          >
            <div class="group-header-left">
              <el-icon class="expand-icon">
                <CaretRight v-if="!expandedGroups.has(group.id)" />
                <CaretBottom v-else />
              </el-icon>
              
              <span 
                v-if="group.color" 
                class="group-color-indicator"
                :style="{ backgroundColor: group.color }"
              />
              
              <span class="group-label">{{ group.label }}</span>
              <span class="group-count">({{ group.count }})</span>
            </div>
            
            <!-- Aggregates -->
            <div v-if="group.aggregates" class="group-aggregates">
              <span class="aggregate-item">
                {{ formatAggregate(group) }}
              </span>
            </div>
          </div>
          
          <!-- Group DataGrid -->
          <div
            v-show="expandedGroups.has(group.id)"
            class="group-content"
          >
            <DataGrid
              :columns="view.columns"
              :workspace-slug="tableContext.workspaceSlug"
              :table-slug="tableContext.tableSlug"
              :view-id="view.id"
              :auto-proxy="true"
              :allow-column-management="true"
              :virtual-scroll="true"
              :scroll-y-load="false"
              :page-size="view.pageSize || 50"
              :group-filter="getGroupFilter(group)"
              height="100%"
            />
          </div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-else class="empty-state">
        <Icon name="lucide:inbox" size="48" />
        <p>No data to group</p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.grouped-data-grid {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.groups-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.loading-state,
.error-state,
.empty-state {
  padding: var(--app-space-xl);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--app-space-m);
  color: var(--el-text-color-secondary);
}

.groups-list {
  flex: 1;
  overflow-y: auto;
}

.group-section {
  border-bottom: 1px solid var(--el-border-color-lighter);
  
  &:last-child {
    border-bottom: none;
  }
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--el-fill-color-lighter);
  border-left: 3px solid transparent;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
  
  &:hover {
    background: var(--el-fill-color-light);
  }
}

.group-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
}

.expand-icon {
  transition: transform 0.2s;
  font-size: 16px;
}

.group-color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
}

.group-count {
  color: var(--el-text-color-secondary);
  font-weight: normal;
  font-size: 13px;
}

.group-aggregates {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.aggregate-item {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.group-content {
  border-bottom: 2px solid var(--el-border-color);
}
</style>

