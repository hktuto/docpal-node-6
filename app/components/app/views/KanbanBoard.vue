<template>
  <div class="kanban-board">
    <!-- Loading State -->
    <div v-if="loading" class="kanban-loading">
      <el-skeleton :rows="5" animated />
    </div>
    
    <!-- Error State -->
    <div v-else-if="error" class="kanban-error">
      <el-icon :size="48"><WarningFilled /></el-icon>
      <h3>Failed to load data</h3>
      <p>{{ error }}</p>
    </div>
    
    <!-- Empty State (no groupBy configured) -->
    <div v-else-if="!groupByColumn" class="kanban-empty">
      <el-icon :size="48"><Tickets /></el-icon>
      <h3>Configure Kanban View</h3>
      <p>Please select a "Group By" field in the view settings to display the Kanban board.</p>
      <el-button type="primary" @click="$emit('configure')">
        <Icon name="lucide:settings" />
        Configure View
      </el-button>
    </div>
    
    <!-- Kanban Columns -->
    <div v-else class="kanban-columns">
      <div
        v-for="lane in lanes"
        :key="lane.id"
        class="kanban-lane"
        :style="lane.color ? { borderTopColor: lane.color } : {}"
        @dragover.prevent="handleDragOver($event, lane)"
        @drop="handleDrop($event, lane)"
      >
        <!-- Lane Header -->
        <div class="lane-header" :style="lane.color ? { borderLeftColor: lane.color } : {}">
          <div class="lane-title">
            <span v-if="lane.color" class="lane-color-indicator" :style="{ backgroundColor: lane.color }"></span>
            <span class="lane-name">{{ lane.label }}</span>
            <el-tag size="small" round>{{ lane.total }}</el-tag>
          </div>
        </div>
        
        <!-- Lane Cards -->
        <div class="lane-cards">
          <div
            v-for="card in lane.rows"
            :key="card.id"
            class="kanban-card"
            draggable="true"
            @dragstart="handleDragStart($event, card, lane)"
            @dragend="handleDragEnd"
            @click="$emit('card-click', card)"
          >
            <!-- Card Content -->
            <div class="card-content">
              <!-- Primary Field (first non-groupBy field) -->
              <div v-if="primaryField" class="card-title">
                {{ formatFieldValue(card, primaryField) }}
              </div>
              
              <!-- Additional Fields -->
              <div v-if="displayFields.length > 0" class="card-fields">
                <div
                  v-for="field in displayFields"
                  :key="field.name"
                  class="card-field"
                >
                  <span class="field-label">{{ field.label }}:</span>
                  <span class="field-value">{{ formatFieldValue(card, field) }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Empty Lane -->
          <div v-if="lane.rows.length === 0" class="lane-empty">
            <p>No cards</p>
          </div>
          
          <!-- Load More Button -->
          <div v-if="lane.hasMore" class="lane-load-more">
            <el-button text size="small" @click="loadMoreInLane(lane.id)">
              Load More ({{ lane.total - lane.rows.length }} remaining)
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { WarningFilled, Tickets } from '@element-plus/icons-vue'
import type { DataTableColumn } from '#shared/types/db'

interface Props {
  workspaceSlug: string
  tableSlug: string
  viewId: string
  columns: DataTableColumn[]
  groupByColumnName?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'card-click': [card: any]
  'card-move': [cardId: string, fromLane: string, toLane: string]
  'configure': []
}>()

// Inject table context
const tableContext = useTableContext()

// State
const loading = ref(true)
const loadingLanes = ref(false)
const error = ref<string | null>(null)
const lanes = ref<any[]>([])

// Find group by column
const groupByColumn = computed(() => {
  if (!props.groupByColumnName) return null
  return props.columns.find(col => col.name === props.groupByColumnName)
})

// Get primary field (first visible field that's not the groupBy field)
const primaryField = computed(() => {
  return props.columns.find(col => col.name !== props.groupByColumnName)
})

// Get additional display fields (max 3 more fields)
const displayFields = computed(() => {
  return props.columns
    .filter(col => 
      col.name !== props.groupByColumnName && 
      col.name !== primaryField.value?.name
    )
    .slice(0, 3)
})

// Drag and drop state
const draggedCard = ref<any>(null)
const draggedFromLane = ref<any>(null)

function handleDragStart(event: DragEvent, card: any, lane: any) {
  draggedCard.value = card
  draggedFromLane.value = lane
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/html', (event.currentTarget as HTMLElement)?.innerHTML || '')
  }
}

function handleDragOver(event: DragEvent, lane: any) {
  if (draggedCard.value) {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }
}

async function handleDrop(event: DragEvent, toLane: any) {
  event.preventDefault()
  
  if (!draggedCard.value || !draggedFromLane.value || !groupByColumn.value) return
  
  const card = draggedCard.value
  const fromLane = draggedFromLane.value
  
  // Don't do anything if dropped in same lane
  if (fromLane.id === toLane.id) {
    return
  }
  
  try {
    // Get relation field value (extract relatedId if enriched)
    let currentValue = card[groupByColumn.value.name]
    if (typeof currentValue === 'object' && currentValue?.relatedId) {
      currentValue = currentValue.relatedId
    }
    
    // Determine new value based on field type
    let newValue: any
    const isRelationField = groupByColumn.value.type === 'relation'
    
    if (isRelationField) {
      // For relation fields, store just the UUID (as stored in DB)
      newValue = toLane.id
    } else {
      // For select fields, use label
      newValue = toLane.label
    }
    
    // Update card value
    const { $api } = useNuxtApp()
    await $api(
      `/api/workspaces/${props.workspaceSlug}/tables/${props.tableSlug}/rows/${card.id}`,
      {
        method: 'PUT',
        body: {
          [groupByColumn.value.name]: newValue
        }
      }
    )
    
    // Optimistically update UI (remove from source, add to target)
    const cardIndex = fromLane.rows.findIndex((r: any) => r.id === card.id)
    if (cardIndex > -1) {
      fromLane.rows.splice(cardIndex, 1)
      fromLane.total--
    }
    
    toLane.rows.unshift({ ...card, [groupByColumn.value.name]: newValue })
    toLane.total++
    
    ElMessage.success('Card moved successfully')
    emit('card-move', card.id, fromLane.id, toLane.id)
  } catch (err: any) {
    console.error('Failed to move card:', err)
    ElMessage.error('Failed to move card')
    // Revert UI on error
    await fetchData()
  }
}

function handleDragEnd() {
  draggedCard.value = null
  draggedFromLane.value = null
}

// Format field value for display
function formatFieldValue(row: any, field: DataTableColumn): string {
  const value = row[field.name]
  
  if (value == null || value === '') return '-'
  
  // Handle different field types
  switch (field.type) {
    case 'relation':
      // If enriched relation object
      if (typeof value === 'object' && value.displayFieldValue) {
        return value.displayFieldValue
      }
      return String(value)
    
    case 'select':
    case 'status':
      return String(value)
    
    case 'date':
      return new Date(value).toLocaleDateString()
    
    case 'datetime':
      return new Date(value).toLocaleString()
    
    case 'currency':
      if (typeof value === 'object' && value.amount != null) {
        return `${value.currency || '$'}${Number(value.amount).toFixed(2)}`
      }
      return String(value)
    
    case 'number':
      return Number(value).toLocaleString()
    
    case 'boolean':
      return value ? 'Yes' : 'No'
    
    default:
      return String(value)
  }
}
const { $api } = useNuxtApp()
async function getLanesData(option:any) {
    // For relation fields, use relatedId (option.id)
    // For select fields, use label (because that's what's stored in DB)
    const isRelationField = groupByColumn.value?.type === 'relation'
    const filterValue = option.id === null 
      ? null 
      : (isRelationField ? option.id : option.label)
    
    const response = await $api<SuccessResponse<any[]>>(
        `/api/query/views/${props.viewId}/rows`,
        {
          method: 'POST',
          body: {
            filters: tableContext.tempFilters.value,
            additionalFilters: {
              operator: 'AND',
              conditions: [{
                columnId: groupByColumn.value!.id,
                operator: option.id === null ? 'isEmpty' : 'equals',
                value: filterValue
              }]
            },
            sorts: tableContext.tempSorts.value,
            limit: 50,
            offset: 0
          }
        }
      )
      
      return {
        id: option.id,
        label: option.label,
        color: option.color,
        count: option.count,
        rows: response.data || [],
        total: option.count,
        offset: 0,
        hasMore: (response.data || []).length < option.count
      }
}
// Fetch group options and lane data
async function fetchData() {
  if (!props.viewId || !groupByColumn.value) return
  
  loading.value = true
  error.value = null
  
  try {
    const { $api } = useNuxtApp()
    
    // Step 1: Get group options with counts
    const groupOptionsResponse = await $api<SuccessResponse<{
      options: Array<{
        id: string | null
        label: string
        color?: string
        count: number
      }>
    }>>(
      `/api/query/views/${props.viewId}/group-options`,
      {
        method: 'POST',
        body: {
          columnName: props.groupByColumnName,
          filters: tableContext.tempFilters.value,
          maxOptions: 50
        }
      }
    )
    
    const laneOptions = groupOptionsResponse.data.options
    
    // Step 2: Fetch rows for each lane in parallel
    loadingLanes.value = true
    const lanePromises = laneOptions.map( (option) => getLanesData(option) )
    
    lanes.value = await Promise.all(lanePromises)
  } catch (err: any) {
    console.error('Failed to fetch kanban data:', err)
    error.value = err.message || 'Unknown error'
  } finally {
    loading.value = false
    loadingLanes.value = false
  }
}

// Load more cards for a specific lane
async function loadMoreInLane(laneId: string | null) {
  const lane = lanes.value.find(l => l.id === laneId)
  if (!lane || !lane.hasMore || !groupByColumn.value) return
  
  try {
    const { $api } = useNuxtApp()
    
    // For relation fields, use relatedId (lane.id)
    // For select fields, use label (because that's what's stored in DB)
    const isRelationField = groupByColumn.value.type === 'relation'
    const filterValue = laneId === null 
      ? null 
      : (isRelationField ? lane.id : lane.label)
    
    const response = await $api<SuccessResponse<any[]>>(
      `/api/query/views/${props.viewId}/rows`,
      {
        method: 'POST',
        body: {
          filters: tableContext.tempFilters.value,
          additionalFilters: {
            operator: 'AND',
            conditions: [{
              columnId: groupByColumn.value.id,
              operator: laneId === null ? 'isEmpty' : 'equals',
              value: filterValue
            }]
          },
          sorts: tableContext.tempSorts.value,
          limit: 50,
          offset: lane.offset + 50
        }
      }
    )
    
    // Append to existing rows
    lane.rows.push(...(response.data || []))
    lane.offset += 50
    lane.hasMore = lane.rows.length < lane.total
  } catch (err: any) {
    console.error('Failed to load more cards:', err)
    ElMessage.error('Failed to load more cards')
  }
}

// Watch for changes
watch(
  () => props.viewId,
  () => fetchData(),
  { immediate: true }
)

watch(
  [() => tableContext.tempFilters.value, () => tableContext.tempSorts.value],
  () => fetchData()
)

// Expose refresh method
defineExpose({
  refresh: fetchData
})
</script>

<style scoped lang="scss">
.kanban-board {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--el-bg-color-page);
}

.kanban-loading,
.kanban-error,
.kanban-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  color: var(--el-text-color-secondary);
  
  h3 {
    margin: 0;
    font-size: 20px;
    color: var(--el-text-color-primary);
  }
  
  p {
    margin: 0;
    font-size: 14px;
  }
}

.kanban-columns {
  display: flex;
  gap: 16px;
  padding: 16px;
  overflow-x: auto;
  overflow-y: hidden;
  height: 100%;
}

.kanban-lane {
  flex-shrink: 0;
  width: 300px;
  background: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
  border-top: 3px solid var(--el-border-color-light);
  display: flex;
  flex-direction: column;
  height: calc(100% - 32px);
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--el-border-color);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }
}

.lane-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  border-left: 3px solid transparent;
  flex-shrink: 0;
  transition: border-color 0.2s;
}

.lane-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lane-color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.lane-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
  flex: 1;
}

.lane-cards {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lane-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.lane-load-more {
  padding: 8px;
  text-align: center;
  border-top: 1px solid var(--el-border-color-lighter);
  margin-top: 8px;
}

.kanban-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--el-color-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
  
  &:active {
    cursor: move;
  }
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-title {
  font-weight: 500;
  font-size: 14px;
  color: var(--el-text-color-primary);
  line-height: 1.4;
  word-break: break-word;
}

.card-fields {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-field {
  display: flex;
  gap: 6px;
  font-size: 12px;
  line-height: 1.4;
}

.field-label {
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.field-value {
  color: var(--el-text-color-primary);
  word-break: break-word;
}
</style>

