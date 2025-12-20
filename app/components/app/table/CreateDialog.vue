<script setup lang="ts">
import type { TableColumnDef, ColumnType } from '#shared/types/db'

const props = defineProps<{
  modelValue: boolean
  appSlug: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'created', table: any): void
}>()

// Form data
const form = ref({
  name: '',
  description: '',
  columns: [
    { name: 'name', label: 'Name', type: 'text' as ColumnType, required: true, order: 0 }
  ] as TableColumnDef[]
})

const formRef = ref()
const loading = ref(false)
const suggestingType = ref<number | null>(null) // Track which column is being suggested
const suggestions = ref<Map<number, any>>(new Map()) // Store suggestions per column index

// Column type options
const columnTypes = [
  { value: 'text', label: 'Text', icon: 'lucide:text' },
  { value: 'long_text', label: 'Long Text', icon: 'lucide:align-left' },
  { value: 'number', label: 'Number', icon: 'lucide:hash' },
  { value: 'date', label: 'Date', icon: 'lucide:calendar' },
  { value: 'switch', label: 'Switch', icon: 'lucide:toggle-left' },
]

// Debounce timers and abort controllers for each column
const debounceTimers = ref<Map<number, any>>(new Map())
const abortControllers = ref<Map<number, AbortController>>(new Map())

// Add column
function addColumn() {
  form.value.columns.push({
    name: '',
    label: '',
    type: 'text',
    required: false,
    order: form.value.columns.length
  })
}

// Remove column
function removeColumn(index: number) {
  // Clear timer and abort API call for this column
  if (debounceTimers.value.has(index)) {
    clearTimeout(debounceTimers.value.get(index))
    debounceTimers.value.delete(index)
  }
  if (abortControllers.value.has(index)) {
    abortControllers.value.get(index)?.abort()
    abortControllers.value.delete(index)
  }
  
  // Clear suggestion
  suggestions.value.delete(index)
  
  // Remove column
  form.value.columns.splice(index, 1)
  
  // Update order
  form.value.columns.forEach((col, idx) => {
    col.order = idx
  })
  
  // Re-map timers, controllers, and suggestions after index shift
  const newTimers = new Map()
  const newControllers = new Map()
  const newSuggestions = new Map()
  
  debounceTimers.value.forEach((timer, idx) => {
    if (idx > index) {
      newTimers.set(idx - 1, timer)
    } else if (idx < index) {
      newTimers.set(idx, timer)
    }
  })
  
  abortControllers.value.forEach((controller, idx) => {
    if (idx > index) {
      newControllers.set(idx - 1, controller)
    } else if (idx < index) {
      newControllers.set(idx, controller)
    }
  })
  
  suggestions.value.forEach((suggestion, idx) => {
    if (idx > index) {
      newSuggestions.set(idx - 1, suggestion)
    } else if (idx < index) {
      newSuggestions.set(idx, suggestion)
    }
  })
  
  debounceTimers.value = newTimers
  abortControllers.value = newControllers
  suggestions.value = newSuggestions
}

// Auto-generate label from name and trigger AI suggestion
function onColumnNameChange(column: TableColumnDef, index: number) {
  if (!column.label || column.label === generateLabel(column.name)) {
    column.label = generateLabel(column.name)
  }
  
  // Trigger AI suggestion after label is updated
  onColumnLabelChange(column, index)
}

function generateLabel(name: string): string {
  if (!name) return ''
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

// Debounced AI suggestion on label change
function onColumnLabelChange(column: TableColumnDef, index: number) {
  // Clear existing suggestion for this column
  suggestions.value.delete(index)
  
  // Clear existing timer
  if (debounceTimers.value.has(index)) {
    clearTimeout(debounceTimers.value.get(index))
  }
  
  // Abort any in-progress API call for this column
  if (abortControllers.value.has(index)) {
    abortControllers.value.get(index)?.abort()
    abortControllers.value.delete(index)
  }
  
  // Only suggest if we have both name and label
  if (!column.name || !column.label) {
    return
  }
  
  // Set new debounced timer (800ms delay)
  const timer = setTimeout(() => {
    suggestColumnType(index)
  }, 800)
  
  debounceTimers.value.set(index, timer)
}

// Suggest column type using AI
async function suggestColumnType(index: number) {
  const column = form.value.columns[index]
  
  if (!column.name || !column.label) {
    return
  }
  
  // Create new AbortController for this request
  const abortController = new AbortController()
  abortControllers.value.set(index, abortController)
  
  try {
    suggestingType.value = index
    
    const response = await $apiResponse('/api/ai/suggest-column-type', {
      method: 'POST',
      body: {
        columnName: column.name,
        columnLabel: column.label,
        tableDescription: form.value.description,
        appSlug: props.appSlug
      },
      signal: abortController.signal
    })
    
    // Only store suggestion if this request wasn't aborted
    if (!abortController.signal.aborted) {
      suggestions.value.set(index, {
        column: response.suggestedColumn,
        confidence: response.confidence,
        reason: response.reason,
        aiEnabled: response.aiEnabled
      })
    }
  } catch (error: any) {
    // Ignore abort errors - they're expected
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      console.log('AI suggestion request cancelled for column', index)
      return
    }
    console.error('Error suggesting type:', error)
    // Silent fail - don't show error to user for auto-suggestions
  } finally {
    // Only clear loading state if this is still the active request
    if (suggestingType.value === index) {
      suggestingType.value = null
    }
    // Clean up the abort controller
    if (abortControllers.value.get(index) === abortController) {
      abortControllers.value.delete(index)
    }
  }
}

// Apply AI suggestion to column
function applySuggestion(index: number) {
  const suggestion = suggestions.value.get(index)
  if (!suggestion) return
  
  const column = form.value.columns[index]
  
  // Apply the suggested configuration
  column.type = suggestion.column.type
  column.required = suggestion.column.required
  column.config = suggestion.column.config || {}
  
  // Show success message
  const aiStatus = suggestion.aiEnabled ? '🤖 AI' : '🔍 Pattern matching'
  ElMessage.success({
    message: `${aiStatus} applied: ${suggestion.reason}`,
    duration: 3000
  })
  
  // Remove the suggestion
  suggestions.value.delete(index)
}

// Dismiss suggestion
function dismissSuggestion(index: number) {
  suggestions.value.delete(index)
}

// Create table
async function handleCreate() {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    loading.value = true
    
    const table = await $apiResponse(`/api/apps/${props.appSlug}/tables`, {
      method: 'POST',
      body: {
        name: form.value.name,
        description: form.value.description,
        columns: form.value.columns
      }
    })
    
    ElMessage.success('Table created successfully!')
    emit('created', table)
    handleClose()
  } catch (error: any) {
    console.error('Error creating table:', error)
    if (error?.data?.message) {
      ElMessage.error(error.data.message)
    } else {
      ElMessage.error('Failed to create table')
    }
  } finally {
    loading.value = false
  }
}

// Close dialog
function handleClose() {
  // Clear all debounce timers
  debounceTimers.value.forEach(timer => clearTimeout(timer))
  debounceTimers.value.clear()
  
  // Abort all in-progress API calls
  abortControllers.value.forEach(controller => controller.abort())
  abortControllers.value.clear()
  
  // Clear suggestions
  suggestions.value.clear()
  
  // Reset loading state
  suggestingType.value = null
  
  form.value = {
    name: '',
    description: '',
    columns: [
      { name: 'name', label: 'Name', type: 'text', required: true, order: 0 }
    ]
  }
  formRef.value?.clearValidate()
  emit('update:modelValue', false)
}

// Computed
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})
</script>

<template>
  <el-dialog
    v-model="visible"
    title="Create Table"
    width="700px"
    :before-close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      label-position="top"
      :disabled="loading"
    >
      <!-- Table Name -->
      <el-form-item
        label="Table Name"
        prop="name"
        :rules="[
          { required: true, message: 'Please enter table name', trigger: 'blur' },
          { min: 1, max: 100, message: 'Length should be 1 to 100', trigger: 'blur' }
        ]"
      >
        <el-input
          v-model="form.name"
          placeholder="e.g., Contacts, Projects, Tasks"
          clearable
        />
      </el-form-item>
      
      <!-- Description -->
      <el-form-item
        label="Description"
        prop="description"
      >
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="2"
          placeholder="Brief description of what this table stores (optional)"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>
      
      <!-- Columns Section -->
      <div class="columns-section">
        <div class="columns-header">
          <h4>Columns</h4>
          <el-button 
            size="small" 
            @click="addColumn"
            :disabled="loading"
          >
            <Icon name="lucide:plus" />
            Add Column
          </el-button>
        </div>
        
        <div class="columns-list">
          <div 
            v-for="(column, index) in form.columns" 
            :key="index"
            class="column-item"
          >
            <div class="column-header">
              <span class="column-number">{{ index + 1 }}</span>
              <el-button
                v-if="form.columns.length > 1"
                text
                type="danger"
                size="small"
                @click="removeColumn(index)"
                :disabled="loading"
              >
                <Icon name="lucide:trash-2" />
              </el-button>
            </div>
            
            <div class="column-fields">
              <!-- Column Name -->
              <el-form-item
                :prop="`columns.${index}.name`"
                label="Column Name"
                :rules="[
                  { required: true, message: 'Required', trigger: 'blur' },
                  { pattern: /^[a-z][a-z0-9_]*$/, message: 'Must start with lowercase letter, only lowercase, numbers, underscores', trigger: 'blur' }
                ]"
              >
                <el-input
                  v-model="column.name"
                  placeholder="e.g., first_name, email, status"
                  @input="onColumnNameChange(column, index)"
                />
              </el-form-item>
              
              <!-- Column Label -->
              <el-form-item
                :prop="`columns.${index}.label`"
                label="Display Label"
              >
                <el-input
                  v-model="column.label"
                  placeholder="Auto-generated from name"
                  @input="onColumnLabelChange(column, index)"
                />
                
                <!-- AI Suggestion Message -->
                <div 
                  v-if="suggestions.has(index)" 
                  class="ai-suggestion"
                >
                  <div class="suggestion-content">
                    <Icon 
                      :name="suggestions.get(index).aiEnabled ? 'lucide:sparkles' : 'lucide:lightbulb'" 
                      class="suggestion-icon"
                    />
                    <div class="suggestion-text">
                      <span class="suggestion-type">
                        {{ columnTypes.find(t => t.value === suggestions.get(index).column.type)?.label }}
                        <template v-if="suggestions.get(index).column.required">
                          <el-tag size="small" type="warning">Required</el-tag>
                        </template>
                      </span>
                      <span class="suggestion-reason">{{ suggestions.get(index).reason }}</span>
                    </div>
                  </div>
                  <div class="suggestion-actions">
                    <el-button 
                      size="small" 
                      type="primary"
                      @click="applySuggestion(index)"
                    >
                      Apply
                    </el-button>
                    <el-button 
                      size="small" 
                      text
                      @click="dismissSuggestion(index)"
                    >
                      Dismiss
                    </el-button>
                  </div>
                </div>
                
                <!-- Loading indicator -->
                <div v-if="suggestingType === index" class="ai-loading">
                  <Icon name="lucide:loader-2" class="spinning" />
                  <span>Getting AI suggestion...</span>
                </div>
              </el-form-item>
              
              <!-- Column Type -->
              <el-form-item
                :prop="`columns.${index}.type`"
                label="Type"
                :rules="[{ required: true, message: 'Required', trigger: 'change' }]"
              >
                <el-select v-model="column.type" placeholder="Select type">
                  <el-option
                    v-for="type in columnTypes"
                    :key="type.value"
                    :value="type.value"
                    :label="type.label"
                  >
                    <div class="type-option">
                      <Icon :name="type.icon" size="16" />
                      <span>{{ type.label }}</span>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>
              
              <!-- Required -->
              <el-form-item
                :prop="`columns.${index}.required`"
                label=" "
              >
                <el-checkbox v-model="column.required">
                  Required field
                </el-checkbox>
              </el-form-item>
            </div>
          </div>
        </div>
      </div>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" :disabled="loading">
          Cancel
        </el-button>
        <el-button 
          type="primary" 
          @click="handleCreate"
          :loading="loading"
        >
          Create Table
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.columns-section {
  margin-top: var(--app-space-l);
  
  .columns-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--app-space-m);
    
    h4 {
      margin: 0;
      font-size: var(--app-font-size-l);
      font-weight: 600;
      color: var(--app-text-color-primary);
    }
  }
}

.columns-list {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-l);
}

.column-item {
  padding: var(--app-space-m);
  background: var(--app-fill-color);
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-border-radius-m);
  
  .column-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--app-space-m);
    
    .column-number {
      font-weight: 600;
      color: var(--app-text-color-secondary);
      font-size: var(--app-font-size-s);
    }
  }
  
  .column-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--app-space-m);
    
    // Name and Label on first row
    // Type and Required on second row
    
    > :nth-child(4) {
      // Required checkbox
      display: flex;
      align-items: flex-end;
    }
  }
}

.type-option {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
}

.ai-suggestion {
  margin-top: var(--app-space-s);
  padding: var(--app-space-m);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: var(--app-border-radius-s);
  color: white;
  animation: slideDown 0.3s ease-out;
  
  .suggestion-content {
    display: flex;
    align-items: flex-start;
    gap: var(--app-space-s);
    margin-bottom: var(--app-space-s);
    
    .suggestion-icon {
      font-size: 20px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    
    .suggestion-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      
      .suggestion-type {
        font-weight: 600;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: var(--app-space-s);
      }
      
      .suggestion-reason {
        font-size: 12px;
        opacity: 0.9;
      }
    }
  }
  
  .suggestion-actions {
    display: flex;
    gap: var(--app-space-s);
    justify-content: flex-end;
  }
}

.ai-loading {
  margin-top: var(--app-space-s);
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
  color: var(--app-text-color-secondary);
  font-size: 12px;
  
  .spinning {
    animation: spin 1s linear infinite;
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--app-space-s);
}
</style>

