<script setup lang="ts">
import type { DataTable, DataTableColumn } from '#shared/types/db'

interface Props {
  visible: boolean
  appSlug: string
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
    // Add mode - initialize empty form
    formData.value = {}
    props.table.columns.forEach(col => {
      // Set default values based on column type
      if (col.type === 'switch') {
        formData.value[col.name] = col.config?.defaultValue ?? false
      } else if (col.type === 'number') {
        formData.value[col.name] = null
      } else {
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
      
      // Convert empty strings to null for optional fields
      if (value === '' && !col.required) {
        value = null
      }
      
      // Convert number strings to actual numbers
      if (col.type === 'number' && value !== null && value !== '') {
        value = Number(value)
      }
      
      submitData[col.name] = value
    })
    
    const {$api} = useNuxtApp()
    if (isEdit.value) {
      // Update existing row
      await $api(
        `/api/apps/${props.appSlug}/tables/${props.tableSlug}/rows/${props.row.id}`,
        {
          method: 'PUT',
          body: submitData
        }
      )
      ElMessage.success('Row updated successfully')
    } else {
      // Create new row
      await $api(
        `/api/apps/${props.appSlug}/tables/${props.tableSlug}/rows`,
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
          :rows="4"
          :placeholder="column.config?.placeholder || `Enter ${column.label}`"
          :maxlength="column.config?.maxLength"
          show-word-limit
        />
        
        <!-- Number Input -->
        <el-input-number
          v-else-if="column.type === 'number'"
          v-model="formData[column.name]"
          :min="column.config?.min"
          :max="column.config?.max"
          :precision="column.config?.decimals"
          :placeholder="`Enter ${column.label}`"
          style="width: 100%"
        />
        
        <!-- Date Input -->
        <el-date-picker
          v-else-if="column.type === 'date'"
          v-model="formData[column.name]"
          :type="column.config?.format === 'datetime' ? 'datetime' : 'date'"
          :placeholder="`Select ${column.label}`"
          style="width: 100%"
        />
        
        <!-- Switch Input -->
        <el-switch
          v-else-if="column.type === 'switch'"
          v-model="formData[column.name]"
        />
        
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
</style>
