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

// Column type options
const columnTypes = [
  { value: 'text', label: 'Text', icon: 'lucide:text' },
  { value: 'long_text', label: 'Long Text', icon: 'lucide:align-left' },
  { value: 'number', label: 'Number', icon: 'lucide:hash' },
  { value: 'date', label: 'Date', icon: 'lucide:calendar' },
  { value: 'switch', label: 'Switch', icon: 'lucide:toggle-left' },
]

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
  form.value.columns.splice(index, 1)
  // Update order
  form.value.columns.forEach((col, idx) => {
    col.order = idx
  })
}

// Auto-generate label from name
function onColumnNameChange(column: TableColumnDef) {
  if (!column.label || column.label === generateLabel(column.name)) {
    column.label = generateLabel(column.name)
  }
}

function generateLabel(name: string): string {
  if (!name) return ''
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

// Suggest column type using AI
async function suggestColumnType(index: number) {
  const column = form.value.columns[index]
  
  if (!column.name) {
    ElMessage.warning('Please enter a column name first')
    return
  }
  
  try {
    suggestingType.value = index
    
    const response = await $apiResponse('/api/ai/suggest-column-type', {
      method: 'POST',
      body: {
        columnName: column.name,
        columnLabel: column.label,
        tableDescription: form.value.description
      }
    })
    
    // Update the column type with suggestion
    column.type = response.suggestedType as ColumnType
    
    // Show feedback message
    const aiStatus = response.aiEnabled ? '🤖 AI' : '🔍 Pattern matching'
    ElMessage.success({
      message: `${aiStatus}: ${response.reason}`,
      duration: 4000
    })
  } catch (error: any) {
    console.error('Error suggesting type:', error)
    ElMessage.error('Failed to suggest column type')
  } finally {
    suggestingType.value = null
  }
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
                  @input="onColumnNameChange(column)"
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
                />
              </el-form-item>
              
              <!-- Column Type with AI Suggestion -->
              <el-form-item
                :prop="`columns.${index}.type`"
                label="Type"
                :rules="[{ required: true, message: 'Required', trigger: 'change' }]"
              >
                <div class="type-input-group">
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
                  <el-button
                    size="small"
                    @click="suggestColumnType(index)"
                    :loading="suggestingType === index"
                    :disabled="loading || !column.name"
                    title="AI-powered type suggestion"
                  >
                    <Icon name="lucide:sparkles" v-if="suggestingType !== index" />
                    Suggest
                  </el-button>
                </div>
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

.type-input-group {
  display: flex;
  gap: var(--app-space-s);
  
  .el-select {
    flex: 1;
  }
  
  .el-button {
    flex-shrink: 0;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--app-space-s);
}
</style>

