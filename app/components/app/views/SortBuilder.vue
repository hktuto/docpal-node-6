<template>
  <div class="sort-builder">
    <!-- Header -->
    <div class="sort-header">
      <span class="sort-title">Sort</span>
      <el-button 
        v-if="!hasSorts" 
        type="primary" 
        size="small"
        @click="addSort"
      >
        <el-icon><Plus /></el-icon>
        Add Sort
      </el-button>
    </div>

    <!-- Sort List -->
    <div v-if="hasSorts" class="sort-list">
      <draggable 
        v-model="localSorts" 
        item-key="id"
        handle=".drag-handle"
        @end="emitChange"
      >
        <template #item="{ element: sort, index }">
          <div class="sort-row">
            <!-- Drag Handle -->
            <el-icon class="drag-handle">
              <Rank />
            </el-icon>

            <!-- Priority Number -->
            <span class="sort-priority">{{ index + 1 }}</span>

            <!-- Column Selection -->
            <el-select
              v-model="sort.columnId"
              placeholder="Select field"
              size="small"
              class="sort-column"
              @change="emitChange"
            >
              <el-option
                v-for="column in columns"
                :key="column.id"
                :label="column.name"
                :value="column.id"
              >
                <span class="column-option">
                  <el-icon><component :is="getColumnIcon(column.type)" /></el-icon>
                  {{ column.name }}
                </span>
              </el-option>
            </el-select>

            <!-- Direction Toggle -->
            <el-select
              v-model="sort.direction"
              size="small"
              class="sort-direction"
              @change="emitChange"
            >
              <el-option value="asc">
                <span class="direction-option">
                  <el-icon><SortUp /></el-icon>
                  Ascending (A → Z, 1 → 9)
                </span>
              </el-option>
              <el-option value="desc">
                <span class="direction-option">
                  <el-icon><SortDown /></el-icon>
                  Descending (Z → A, 9 → 1)
                </span>
              </el-option>
            </el-select>

            <!-- Remove Button -->
            <el-button
              type="danger"
              size="small"
              :icon="Close"
              circle
              @click="removeSort(index)"
            />
          </div>
        </template>
      </draggable>

      <!-- Add Sort Button -->
      <el-button 
        type="primary" 
        size="small" 
        plain
        @click="addSort"
      >
        <el-icon><Plus /></el-icon>
        Add Sort
      </el-button>

      <!-- Clear All -->
      <el-button 
        size="small" 
        text
        @click="clearAll"
      >
        Clear All
      </el-button>
    </div>

    <!-- Info -->
    <div v-if="hasSorts" class="sort-info">
      <el-icon><InfoFilled /></el-icon>
      <span>Drag to reorder sort priority</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus, Close, Rank, SortUp, SortDown, InfoFilled } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import type { DataTableColumn, SortConfig as BaseSortConfig } from '#shared/types/db'

// Extend with id for draggable
interface SortConfig extends BaseSortConfig {
  id?: string // For draggable key
}

interface Props {
  columns: DataTableColumn[]
  sorts?: SortConfig[] | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  change: [sorts: SortConfig[] | null]
}>()

// Local state
const localSorts = ref<SortConfig[]>([])

// Initialize from props
if (props.sorts) {
  localSorts.value = props.sorts.map((sort, index) => ({
    ...sort,
    id: `${sort.columnId}-${index}` // Add ID for draggable
  }))
}

// Computed
const hasSorts = computed(() => 
  localSorts.value.length > 0
)

// Methods
function addSort() {
  // Find first unused column
  const usedColumnIds = new Set(localSorts.value.map(s => s.columnId))
  const availableColumn = props.columns.find(c => !usedColumnIds.has(c.id))
  
  localSorts.value.push({
    id: `sort-${Date.now()}`,
    columnId: availableColumn?.id || '',
    direction: 'asc'
  })
}

function removeSort(index: number) {
  localSorts.value.splice(index, 1)
  emitChange()
}

function clearAll() {
  localSorts.value = []
  emit('change', null)
}

function getColumnIcon(type: string) {
  // Return appropriate icon component based on type
  return 'Document' // Default icon
}

function emitChange() {
  // Filter out incomplete sorts
  const validSorts = localSorts.value.filter(s => 
    s.columnId && s.direction
  )
  
  if (validSorts.length === 0) {
    emit('change', null)
  } else {
    // Remove the temporary 'id' field before emitting
    emit('change', validSorts.map(({ columnId, direction }) => ({
      columnId,
      direction
    })))
  }
}

// Watch for external changes
watch(() => props.sorts, (newSorts) => {
  if (newSorts) {
    localSorts.value = newSorts.map((sort, index) => ({
      ...sort,
      id: `${sort.columnId}-${index}`
    }))
  } else {
    localSorts.value = []
  }
}, { deep: true })
</script>

<style scoped>
.sort-builder {
  padding: 16px;
  background: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color);
}

.sort-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.sort-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.sort-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sort-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  transition: all 0.3s;
}

.sort-row:hover {
  background: var(--el-fill-color);
}

.drag-handle {
  cursor: move;
  color: var(--el-text-color-secondary);
  font-size: 18px;
}

.drag-handle:hover {
  color: var(--el-color-primary);
}

.sort-priority {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 12px;
  font-weight: 600;
}

.sort-column {
  min-width: 180px;
  flex: 1;
}

.sort-direction {
  min-width: 220px;
}

.column-option,
.direction-option {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sort-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 12px;
  background: var(--el-color-info-light-9);
  border-radius: 6px;
  font-size: 12px;
  color: var(--el-color-info);
}

/* Dragging state */
.sortable-ghost {
  opacity: 0.5;
}

.sortable-drag {
  opacity: 0.8;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Responsive */
@media (max-width: 768px) {
  .sort-row {
    flex-wrap: wrap;
  }
  
  .sort-column,
  .sort-direction {
    min-width: 100%;
  }
}
</style>

