<script setup lang="ts">
import type { DataTable, DataTableColumn } from '#shared/types/db'

interface Props {
  visible: boolean
  workspaceSlug: string
  tableSlug: string
  table: DataTable & { columns: DataTableColumn[] }
  row?: any | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'saved': []
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const isEdit = computed(() => !!props.row)
const dialogTitle = computed(() => isEdit.value ? 'Edit Row' : 'Add New Row')

const formRef = ref()
const formData = ref<Record<string, any>>({})
const loading = ref(false)

// Initialize form data when dialog opens or row changes
watch(() => props.visible, (visible) => {
  if (visible) {
    initFormData()
  }
})

watch(() => props.row, () => {
  if (props.visible) {
    initFormData()
  }
})

function initFormData() {
  if (props.row) {
    // Edit mode - populate with existing data
    formData.value = { ...props.row }
  } else {
    // Add mode - initialize empty form with defaults
    formData.value = {}
    props.table.columns.forEach(col => {
      // Set default values based on column type
      switch (col.type) {
        case 'switch':
        case 'checkbox':
          formData.value[col.name] = col.config?.defaultValue ?? false
          break
        case 'number':
        case 'currency':
        case 'rating':
          formData.value[col.name] = null
          break
        case 'multi_select':
          formData.value[col.name] = []
          break
        case 'date':
        case 'datetime':
          formData.value[col.name] = null
          break
        case 'color':
          formData.value[col.name] = col.config?.defaultColor || '#409EFF'
          break
        case 'lookup':
        case 'formula':
          // Computed fields - no input needed
          formData.value[col.name] = null
          break
        case 'geolocation':
          formData.value[col.name] = null
          break
        case 'relation':
          formData.value[col.name] = null
          break
        default:
          formData.value[col.name] = ''
      }
    })
  }
}

// Get form rules based on column configuration
const formRules = computed(() => {
  const rules: Record<string, any[]> = {}
  
  props.table.columns.forEach(col => {
    const colRules: any[] = []
    
    // Required validation
    if (col.required) {
      colRules.push({
        required: true,
        message: `${col.label} is required`,
        trigger: 'blur'
      })
    }
    
    // Type-specific validations
    if (col.type === 'text' || col.type === 'long_text') {
      if (col.config?.minLength) {
        colRules.push({
          min: col.config.minLength,
          message: `Minimum length is ${col.config.minLength}`,
          trigger: 'blur'
        })
      }
      if (col.config?.maxLength) {
        colRules.push({
          max: col.config.maxLength,
          message: `Maximum length is ${col.config.maxLength}`,
          trigger: 'blur'
        })
      }
    }
    
    if (col.type === 'number') {
      colRules.push({
        type: 'number',
        message: `${col.label} must be a number`,
        trigger: 'blur',
        transform: (value: any) => {
          if (value === '' || value === null) return null
          return Number(value)
        }
      })
      
      if (col.config?.min !== undefined) {
        colRules.push({
          type: 'number',
          min: col.config.min,
          message: `Minimum value is ${col.config.min}`,
          trigger: 'blur'
        })
      }
      
      if (col.config?.max !== undefined) {
        colRules.push({
          type: 'number',
          max: col.config.max,
          message: `Maximum value is ${col.config.max}`,
          trigger: 'blur'
        })
      }
    }
    
    rules[col.name] = colRules
  })
  
  return rules
})

async function handleSave() {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    loading.value = true
    
    // Prepare data for submission
    const submitData: Record<string, any> = {}
    props.table.columns.forEach(col => {
      let value = formData.value[col.name]
      
      // Skip computed fields
      if (col.type === 'lookup' || col.type === 'formula') {
        return
      }
      
      // Convert empty strings to null for optional fields
      if (value === '' && !col.required) {
        value = null
      }
      
      // Type conversions
      switch (col.type) {
        case 'number':
        case 'currency':
          if (value !== null && value !== '') {
            value = Number(value)
          }
          break
        case 'rating':
          if (value !== null) {
            value = Number(value)
          }
          break
        case 'multi_select':
          // Ensure it's an array
          if (!Array.isArray(value)) {
            value = value ? [value] : []
          }
          break
        case 'date':
        case 'datetime':
          // Date objects are handled automatically
          break
        case 'checkbox':
        case 'switch':
          value = Boolean(value)
          break
      }
      
      submitData[col.name] = value
    })
    
    const {$api} = useNuxtApp()
    if (isEdit.value) {
      // Update existing row
      await $api(
        `/api/workspaces/${props.workspaceSlug}/tables/${props.tableSlug}/rows/${props.row.id}`,
        {
          method: 'PUT',
          body: submitData
        }
      )
      ElMessage.success('Row updated successfully')
    } else {
      // Create new row
      await $api(
        `/api/workspaces/${props.workspaceSlug}/tables/${props.tableSlug}/rows`,
        {
          method: 'POST',
          body: submitData
        }
      )
      ElMessage.success('Row created successfully')
    }
    
    emit('saved')
    handleClose()
  } catch (error: any) {
    console.error('Error saving row:', error)
    if (error?.data?.message) {
      ElMessage.error(error.data.message)
    } else {
      ElMessage.error('Failed to save row')
    }
  } finally {
    loading.value = false
  }
}

function handleClose() {
  formRef.value?.resetFields()
  formData.value = {}
  dialogVisible.value = false
}

// Get input type for column
function getInputType(column: DataTableColumn): string {
  switch (column.type) {
    case 'number':
      return 'number'
    case 'date':
      return column.config?.format === 'datetime' ? 'datetime-local' : 'date'
    default:
      return 'text'
  }
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="600px"
    :before-close="handleClose"
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-position="top"
      v-loading="loading"
    >
      <el-form-item
        v-for="column in table.columns"
        :key="column.id"
        :label="column.label"
        :prop="column.name"
      >
        <!-- Text Input -->
        <el-input
          v-if="column.type === 'text'"
          v-model="formData[column.name]"
          :placeholder="column.config?.placeholder || `Enter ${column.label}`"
          :maxlength="column.config?.maxLength"
          show-word-limit
        />
        
        <!-- Long Text Input -->
        <el-input
          v-else-if="column.type === 'long_text'"
          v-model="formData[column.name]"
          type="textarea"
          :rows="column.config?.rows || 4"
          :placeholder="column.config?.placeholder || `Enter ${column.label}`"
          :maxlength="column.config?.maxLength"
          show-word-limit
        />
        
        <!-- Email Input -->
        <FieldEmailInput
          v-else-if="column.type === 'email'"
          v-model="formData[column.name]"
          :placeholder="column.config?.placeholder || `Enter ${column.label}`"
          :allow-multiple="column.config?.allowMultiple"
        />
        
        <!-- Phone Input -->
        <FieldPhoneInput
          v-else-if="column.type === 'phone'"
          v-model="formData[column.name]"
          :placeholder="column.config?.placeholder || `Enter ${column.label}`"
          :format="column.config?.format"
        />
        
        <!-- URL Input -->
        <FieldUrlInput
          v-else-if="column.type === 'url'"
          v-model="formData[column.name]"
          :placeholder="column.config?.placeholder || `Enter ${column.label}`"
          :open-in-new-tab="column.config?.openInNewTab"
          :require-https="column.config?.requireHttps"
        />
        
        <!-- Number Input -->
        <el-input-number
          v-else-if="column.type === 'number'"
          v-model="formData[column.name]"
          :min="column.config?.min"
          :max="column.config?.max"
          :precision="column.config?.decimal ? 2 : 0"
          :placeholder="`Enter ${column.label}`"
          style="width: 100%"
        />
        
        <!-- Currency Input -->
        <el-input-number
          v-else-if="column.type === 'currency'"
          v-model="formData[column.name]"
          :min="column.config?.min || 0"
          :max="column.config?.max"
          :precision="2"
          :placeholder="`Enter ${column.label}`"
          style="width: 100%"
        >
          <template #prefix>
            <span>{{ column.config?.symbol || '$' }}</span>
          </template>
        </el-input-number>
        
        <!-- Rating Input -->
        <el-rate
          v-else-if="column.type === 'rating'"
          v-model="formData[column.name]"
          :max="column.config?.maxRating || 5"
          :allow-half="column.config?.allowHalf"
        />
        
        <!-- Color Input -->
        <el-color-picker
          v-else-if="column.type === 'color'"
          v-model="formData[column.name]"
          :show-alpha="column.config?.showAlpha"
          :color-format="column.config?.colorFormat || 'hex'"
        />
        
        <!-- Date Input -->
        <el-date-picker
          v-else-if="column.type === 'date'"
          v-model="formData[column.name]"
          type="date"
          :placeholder="`Select ${column.label}`"
          style="width: 100%"
        />
        
        <!-- DateTime Input -->
        <el-date-picker
          v-else-if="column.type === 'datetime'"
          v-model="formData[column.name]"
          type="datetime"
          :placeholder="`Select ${column.label}`"
          style="width: 100%"
        />
        
        <!-- Select Input -->
        <FieldSelectInput
          v-else-if="column.type === 'select'"
          v-model="formData[column.name]"
          :options="column.config?.options || []"
          :placeholder="column.config?.placeholder || `Select ${column.label}`"
          :allow-custom="column.config?.allowCustom"
        />
        
        <!-- Multi-Select Input -->
        <FieldMultiSelectInput
          v-else-if="column.type === 'multi_select'"
          v-model="formData[column.name]"
          :options="column.config?.options || []"
          :placeholder="column.config?.placeholder || `Select ${column.label}`"
          :max-selections="column.config?.maxSelections"
          :allow-custom="column.config?.allowCustom"
        />
        
        <!-- Checkbox Input -->
        <el-checkbox
          v-else-if="column.type === 'checkbox'"
          v-model="formData[column.name]"
        >
          {{ column.config?.label || column.label }}
        </el-checkbox>
        
        <!-- Switch Input -->
        <el-switch
          v-else-if="column.type === 'switch'"
          v-model="formData[column.name]"
          :active-text="column.config?.trueLabel || 'On'"
          :inactive-text="column.config?.falseLabel || 'Off'"
        />
        
        <!-- Geolocation Input -->
        <div v-else-if="column.type === 'geolocation'" class="geolocation-input">
          <el-input
            v-model="formData[column.name]"
            placeholder="Enter address or coordinates"
          />
          <span class="hint">Format: lat,lng or address</span>
        </div>
        
        <!-- Relation Input -->
        <FieldRelationPicker
          v-else-if="column.type === 'relation'"
          v-model="formData[column.name]"
          :workspace-slug="workspaceSlug"
          :table-slug="column.config?.targetTable"
          :display-field="column.config?.displayField"
        />
        
        <!-- Lookup Field (Read-only) -->
        <el-input
          v-else-if="column.type === 'lookup'"
          v-model="formData[column.name]"
          :placeholder="`${column.label} (auto-calculated)`"
          disabled
        >
          <template #prefix>
            <Icon name="lucide:search" size="14" />
          </template>
        </el-input>
        
        <!-- Formula Field (Read-only) -->
        <el-input
          v-else-if="column.type === 'formula'"
          v-model="formData[column.name]"
          :placeholder="`${column.label} (auto-calculated)`"
          disabled
        >
          <template #prefix>
            <Icon name="lucide:calculator" size="14" />
          </template>
        </el-input>
        
        <!-- Fallback: Text Input -->
        <el-input
          v-else
          v-model="formData[column.name]"
          :placeholder="`Enter ${column.label}`"
        />
        
        <!-- Help Text -->
        <div
          v-if="column.config?.helpText"
          class="help-text"
        >
          {{ column.config.helpText }}
        </div>
      </el-form-item>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" :disabled="loading">
          Cancel
        </el-button>
        <el-button type="primary" @click="handleSave" :loading="loading">
          {{ isEdit ? 'Update' : 'Create' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.help-text {
  margin-top: var(--app-space-xxs);
  font-size: var(--app-font-size-xs);
  color: var(--app-text-color-secondary);
  line-height: 1.4;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--app-space-s);
}

.geolocation-input {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.geolocation-input .hint {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
</style>
