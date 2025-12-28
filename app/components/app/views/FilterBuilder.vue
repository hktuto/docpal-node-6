<template>
  <div class="filter-builder">
    <!-- Header -->
    <div class="filter-header">
      <span class="filter-title">Filters</span>
      <el-button 
        v-if="!hasFilters" 
        type="primary" 
        size="small"
        @click="addCondition"
      >
        <el-icon><Plus /></el-icon>
        Add Filter
      </el-button>
    </div>

    <!-- Filter Group -->
    <div v-if="hasFilters" class="filter-group">
      <!-- Group Operator (AND/OR) -->
      <div class="group-operator">
        <span class="operator-label">Where</span>
        <el-select 
          v-model="localFilters.operator" 
          size="small"
          @change="emitChange"
        >
          <el-option label="All of the following" value="AND" />
          <el-option label="Any of the following" value="OR" />
        </el-select>
      </div>

      <!-- Conditions -->
      <div class="conditions-list">
        <div 
          v-for="(condition, index) in localFilters.conditions" 
          :key="index"
          class="condition-row"
        >
          <!-- Column Selection -->
          <el-select
            v-model="condition.columnId"
            placeholder="Select field"
            size="small"
            class="condition-column"
            @change="onColumnChange(index)"
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

          <!-- Operator Selection -->
          <el-select
            v-model="condition.operator"
            size="small"
            class="condition-operator"
            :disabled="!condition.columnId"
            @change="emitChange"
          >
            <el-option
              v-for="op in getOperatorsForColumn(condition.columnId)"
              :key="op.value"
              :label="op.label"
              :value="op.value"
            />
          </el-select>

          <!-- Value Input -->
          <div v-if="needsValue(condition.operator)" class="condition-value">
            <!-- Text Input -->
            <el-input
              v-if="isTextInput(condition)"
              v-model="condition.value"
              size="small"
              placeholder="Enter value"
              @input="emitChange"
            />

            <!-- Number Input -->
            <el-input-number
              v-else-if="isNumberInput(condition)"
              v-model="condition.value"
              size="small"
              @change="emitChange"
            />

            <!-- Date Picker -->
            <el-date-picker
              v-else-if="isDateInput(condition)"
              v-model="condition.value"
              type="date"
              size="small"
              @change="emitChange"
            />

            <!-- Select (for enum/status) -->
            <el-select
              v-else-if="isSelectInput(condition)"
              v-model="condition.value"
              size="small"
              :disabled="getColumnOptions(condition.columnId).length === 0"
              :placeholder="getColumnOptions(condition.columnId).length === 0 ? 'No options available' : 'Select value'"
              @change="emitChange"
            >
              <el-option
                v-for="option in getColumnOptions(condition.columnId)"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>

            <!-- Multi-Select (for 'in' operator) -->
            <el-select
              v-else-if="isMultiSelect(condition.operator)"
              v-model="condition.value"
              multiple
              size="small"
              :disabled="getColumnOptions(condition.columnId).length === 0"
              :placeholder="getColumnOptions(condition.columnId).length === 0 ? 'No options available' : 'Select values'"
              @change="emitChange"
            >
              <el-option
                v-for="option in getColumnOptions(condition.columnId)"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>

            <!-- Between (two values) -->
            <div v-else-if="condition.operator === 'between'" class="between-inputs">
              <el-input-number
                v-model="condition.value[0]"
                size="small"
                placeholder="Min"
                @change="emitChange"
              />
              <span class="between-separator">and</span>
              <el-input-number
                v-model="condition.value[1]"
                size="small"
                placeholder="Max"
                @change="emitChange"
              />
            </div>
          </div>

          <!-- Remove Button -->
          <el-button
            type="danger"
            size="small"
            :icon="Close"
            circle
            @click="removeCondition(index)"
          />
        </div>
      </div>

      <!-- Add Condition Button -->
      <el-button 
        type="primary" 
        size="small" 
        plain
        @click="addCondition"
      >
        <el-icon><Plus /></el-icon>
        Add Condition
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus, Close } from '@element-plus/icons-vue'
import type { DataTableColumn, FilterCondition, FilterGroup } from '#shared/types/db'

interface Props {
  columns: DataTableColumn[]
  filters?: FilterGroup | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  change: [filters: FilterGroup | null]
}>()

// Local state
const localFilters = ref<FilterGroup>({
  operator: 'AND',
  conditions: []
})

// Initialize from props
if (props.filters) {
  localFilters.value = JSON.parse(JSON.stringify(props.filters))
}

// Computed
const hasFilters = computed(() => 
  localFilters.value.conditions.length > 0
)

// Filter operators by column type
const operatorsByType: Record<string, Array<{ value: string, label: string }>> = {
  text: [
    { value: 'equals', label: 'is' },
    { value: 'notEquals', label: 'is not' },
    { value: 'contains', label: 'contains' },
    { value: 'notContains', label: 'does not contain' },
    { value: 'startsWith', label: 'starts with' },
    { value: 'endsWith', label: 'ends with' },
    { value: 'isEmpty', label: 'is empty' },
    { value: 'isNotEmpty', label: 'is not empty' }
  ],
  number: [
    { value: 'equals', label: '=' },
    { value: 'notEquals', label: '≠' },
    { value: 'gt', label: '>' },
    { value: 'gte', label: '≥' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '≤' },
    { value: 'between', label: 'between' },
    { value: 'isEmpty', label: 'is empty' },
    { value: 'isNotEmpty', label: 'is not empty' }
  ],
  date: [
    { value: 'equals', label: 'is' },
    { value: 'notEquals', label: 'is not' },
    { value: 'gt', label: 'is after' },
    { value: 'gte', label: 'is on or after' },
    { value: 'lt', label: 'is before' },
    { value: 'lte', label: 'is on or before' },
    { value: 'between', label: 'is between' },
    { value: 'isEmpty', label: 'is empty' },
    { value: 'isNotEmpty', label: 'is not empty' }
  ],
  select: [
    { value: 'equals', label: 'is' },
    { value: 'notEquals', label: 'is not' },
    { value: 'in', label: 'is any of' },
    { value: 'notIn', label: 'is none of' },
    { value: 'isEmpty', label: 'is empty' },
    { value: 'isNotEmpty', label: 'is not empty' }
  ]
}

// Methods
function addCondition() {
  localFilters.value.conditions.push({
    columnId: '',
    operator: 'equals',
    value: undefined
  })
}

function removeCondition(index: number) {
  localFilters.value.conditions.splice(index, 1)
  emitChange()
}

function clearAll() {
  localFilters.value.conditions = []
  emit('change', null)
}

function onColumnChange(index: number) {
  const condition = localFilters.value.conditions[index]
  const column = props.columns.find(c => c.id === condition.columnId)
  
  if (column) {
    // Reset operator to first valid operator for this column type
    const operators = getOperatorsForColumn(condition.columnId)
    condition.operator = operators[0]?.value || 'equals'
    
    // Reset value
    condition.value = undefined
  }
  
  emitChange()
}

function getOperatorsForColumn(columnId: string) {
  const column = props.columns.find(c => c.id === columnId)
  if (!column) return operatorsByType.text
  
  const type = column.type
  
  if (type === 'text' || type === 'richtext' || type === 'url' || type === 'email') {
    return operatorsByType.text
  } else if (type === 'number' || type === 'currency') {
    return operatorsByType.number
  } else if (type === 'date' || type === 'datetime') {
    return operatorsByType.date
  } else if (type === 'select' || type === 'status' || type === 'boolean') {
    return operatorsByType.select
  }
  
  return operatorsByType.text
}

function getColumnIcon(type: string) {
  // Return appropriate icon component based on type
  // You can customize this based on your icon system
  return 'Document' // Default icon
}

function getColumnOptions(columnId: string) {
  const column = props.columns.find(c => c.id === columnId)
  if (!column?.options?.choices) return []
  
  return column.options.choices.map((choice: any) => ({
    value: choice.value || choice.label,
    label: choice.label
  }))
}

function needsValue(operator: string) {
  return !['isEmpty', 'isNotEmpty'].includes(operator)
}

function isTextInput(condition: FilterCondition) {
  const column = props.columns.find(c => c.id === condition.columnId)
  if (!column) return true
  
  const textTypes = ['text', 'richtext', 'url', 'email']
  return textTypes.includes(column.type) && !['in', 'notIn'].includes(condition.operator)
}

function isNumberInput(condition: FilterCondition) {
  const column = props.columns.find(c => c.id === condition.columnId)
  if (!column) return false
  
  const numberTypes = ['number', 'currency']
  return numberTypes.includes(column.type) && condition.operator !== 'between'
}

function isDateInput(condition: FilterCondition) {
  const column = props.columns.find(c => c.id === condition.columnId)
  if (!column) return false
  
  return ['date', 'datetime'].includes(column.type) && condition.operator !== 'between'
}

function isSelectInput(condition: FilterCondition) {
  const column = props.columns.find(c => c.id === condition.columnId)
  if (!column) return false
  
  return ['select', 'status', 'boolean'].includes(column.type) && 
         !['in', 'notIn'].includes(condition.operator)
}

function isMultiSelect(operator: string) {
  return ['in', 'notIn'].includes(operator)
}

function emitChange() {
  // Filter out incomplete conditions
  const validConditions = localFilters.value.conditions.filter(c => 
    c.columnId && c.operator && (
      !needsValue(c.operator) || 
      (c.value !== undefined && c.value !== null && c.value !== '')
    )
  )
  
  if (validConditions.length === 0) {
    emit('change', null)
  } else {
    emit('change', {
      operator: localFilters.value.operator,
      conditions: validConditions
    })
  }
}

// Watch for external changes
watch(() => props.filters, (newFilters) => {
  if (newFilters) {
    localFilters.value = JSON.parse(JSON.stringify(newFilters))
  } else {
    localFilters.value = { operator: 'AND', conditions: [] }
  }
}, { deep: true })
</script>

<style scoped>
.filter-builder {
  padding: 16px;
  background: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color);
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.filter-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-operator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.operator-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

.conditions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-left: 24px;
}

.condition-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.condition-column {
  min-width: 180px;
}

.condition-operator {
  min-width: 140px;
}

.condition-value {
  flex: 1;
  min-width: 200px;
}

.between-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.between-separator {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.column-option {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Responsive */
@media (max-width: 768px) {
  .condition-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .condition-column,
  .condition-operator,
  .condition-value {
    min-width: 100%;
  }
}
</style>

