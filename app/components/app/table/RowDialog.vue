<script setup lang="ts">
import type { DataTable, DataTableColumn } from '#shared/types/db'

interface Props {
  modelValue: boolean
  appSlug: string
  tableSlug: string
  table: DataTable & { columns: DataTableColumn[] }
  row?: any // If provided, we're editing; otherwise creating
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}>()

// Form data
const formData = ref<Record<string, any>>({})
const formRef = ref()
const loading = ref(false)

// Initialize form data
watch(() => [props.modelValue, props.row], () => {
  if (props.modelValue) {
    if (props.row) {
      // Edit mode - populate with existing data
      formData.value = { ...props.row }
    } else {
      // Create mode - initialize empty form with defaults
      formData.value = {}
      props.table.columns.forEach(col => {
        if (col.type === 'switch') {
          formData.value[col.name] = col.config?.defaultValue ?? false
        } else {
          formData.value[col.name] = null
        }
      })
    }
  }
}, { immediate: true })

// Validation rules
const rules = computed(() => {
  const validationRules: Record<string, any[]> = {}
  
  props.table.columns.forEach(col => {
    const colRules: any[] = []
    
    if (col.required) {
      colRules.push({
        required: true,
        message: `${col.label || col.name} is required`,
        trigger: 'blur'
      })
    }
    
    // Type-specific validation
    switch (col.type) {
      case 'text':
      case 'long_text':
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
        break
        
      case 'number':
        colRules.push({
          type: 'number',
          message: 'Must be a valid number',
          trigger: 'blur',
          transform: (value: any) => Number(value)
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
        break
    }
    
    if (colRules.length > 0) {
      validationRules[col.name] = colRules
    }
  })
  
  return validationRules
})

// Save row
async function handleSave() {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    loading.value = true
    
    // Prepare data - exclude system fields and null values for optional fields
    const payload: Record<string, any> = {}
    props.table.columns.forEach(col => {
      const value = formData.value[col.name]
      
      // Convert number strings to actual numbers
      if (col.type === 'number' && value !== null && value !== '') {
        payload[col.name] = Number(value)
      } else if (value !== null && value !== '') {
        payload[col.name] = value
      } else if (col.required) {
        // Required fields must have a value
        payload[col.name] = value
      }
    })
    
    if (props.row) {
      // Update existing row
      await $apiResponse(
        `/api/apps/${props.appSlug}/tables/${props.tableSlug}/rows/${props.row.id}`,
        {
          method: 'PUT',
          body: payload
        }
      )
      ElMessage.success('Row updated successfully')
    } else {
      // Create new row
      await $apiResponse(
        `/api/apps/${props.appSlug}/tables/${props.tableSlug}/rows`,
        {
          method: 'POST',
          body: payload
        }
      )
      ElMessage.success('Row created successfully')
    }
    
    emit('saved')
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

// Close dialog
function handleClose() {
  formData.value = {}
  formRef.value?.clearValidate()
  emit('update:modelValue', false)
}

// Computed
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const dialogTitle = computed(() => {
  return props.row ? `Edit Row` : `Add Row to ${props.table.name}`
})

// Render field based on column type
function getFieldComponent(column: DataTableColumn) {
  switch (column.type) {
    case 'long_text':
      return 'el-input'
    case 'number':
      return 'el-input-number'
    case 'date':
      return 'el-date-picker'
    case 'switch':
      return 'el-switch'
    default:
      return 'el-input'
  }
}

// Get field props based on column type
function getFieldProps(column: DataTableColumn) {
  const baseProps: any = {
    placeholder: column.config?.placeholder || `Enter ${column.label || column.name}`
  }
  
  switch (column.type) {
    case 'long_text':
      return {
        ...baseProps,
        type: 'textarea',
        rows: 4,
        maxlength: column.config?.maxLength,
        showWordLimit: !!column.config?.maxLength
      }
    case 'number':
      return {
        ...baseProps,
        min: column.config?.min,
        max: column.config?.max,
        precision: column.config?.decimals,
        step: column.config?.decimals ? 1 / Math.pow(10, column.config.decimals) : 1,
        controlsPosition: 'right',
        style: { width: '100%' }
      }
    case 'date':
      return {
        ...baseProps,
        type: column.config?.format === 'datetime' ? 'datetime' : 'date',
        format: column.config?.format === 'datetime' ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD',
        valueFormat: column.config?.format === 'datetime' ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD',
        style: { width: '100%' }
      }
    case 'switch':
      return {}
    default:
      return {
        ...baseProps,
        clearable: true,
        maxlength: column.config?.maxLength,
        showWordLimit: !!column.config?.maxLength
      }
  }
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="600px"
    :before-close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-position="top"
      :disabled="loading"
    >
      <el-form-item
        v-for="column in table.columns"
        :key="column.id"
        :label="column.label || column.name"
        :prop="column.name"
        :required="column.required"
      >
        <template #label>
          <span>{{ column.label || column.name }}</span>
          <span v-if="column.required" style="color: var(--el-color-danger)"> *</span>
          <span v-if="column.config?.helpText" class="help-text">
            <el-tooltip :content="column.config.helpText" placement="top">
              <Icon name="lucide:help-circle" size="14" style="margin-left: 4px" />
            </el-tooltip>
          </span>
        </template>
        
        <!-- Text Input -->
        <el-input
          v-if="column.type === 'text'"
          v-model="formData[column.name]"
          v-bind="getFieldProps(column)"
        />
        
        <!-- Long Text -->
        <el-input
          v-else-if="column.type === 'long_text'"
          v-model="formData[column.name]"
          v-bind="getFieldProps(column)"
        />
        
        <!-- Number -->
        <el-input-number
          v-else-if="column.type === 'number'"
          v-model="formData[column.name]"
          v-bind="getFieldProps(column)"
        />
        
        <!-- Date -->
        <el-date-picker
          v-else-if="column.type === 'date'"
          v-model="formData[column.name]"
          v-bind="getFieldProps(column)"
        />
        
        <!-- Switch -->
        <el-switch
          v-else-if="column.type === 'switch'"
          v-model="formData[column.name]"
          v-bind="getFieldProps(column)"
        />
        
        <!-- Fallback -->
        <el-input
          v-else
          v-model="formData[column.name]"
          v-bind="getFieldProps(column)"
        />
        
        <!-- Field Description -->
        <div v-if="column.config?.description" class="field-description">
          {{ column.config.description }}
        </div>
      </el-form-item>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" :disabled="loading">
          Cancel
        </el-button>
        <el-button 
          type="primary" 
          @click="handleSave"
          :loading="loading"
        >
          {{ row ? 'Update' : 'Create' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.help-text {
  color: var(--app-text-color-secondary);
  cursor: help;
}

.field-description {
  margin-top: var(--app-space-xs);
  font-size: var(--app-font-size-s);
  color: var(--app-text-color-secondary);
  line-height: 1.4;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--app-space-s);
}
</style>

