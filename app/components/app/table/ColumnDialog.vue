<script setup lang="ts">
import type { DataTableColumn } from '#shared/types/db'
import { columnTypeOptions, type ColumnType } from '#shared/types/fieldTypes'
import {useDebounceFn} from '@vueuse/core'

interface Props {
  visible: boolean
  column?: DataTableColumn // If provided, edit mode; otherwise, add mode
  position?: number | null // Index where column should be inserted
  workspaceSlug: string
  tableSlug: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved', column: DataTableColumn): void
}>()

// Computed dialog visibility
const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// Is this edit mode or add mode?
const isEditMode = computed(() => !!props.column)

// Dialog title
const dialogTitle = computed(() => {
  if (isEditMode.value) {
    return `Edit Column: ${props.column?.label}`
  }
  return 'Add Column'
})

// Form data
const form = ref({
  name: '',
  label: '',
  type: 'text' as ColumnType,
  required: false,
  config: {} as any
})

const formRef = ref()
const loading = ref(false)
const suggesting = ref(false)

// Column type options from shared registry
const columnTypes = columnTypeOptions.map(type => ({
  value: type.value,
  label: type.label,
  icon: type.icon || `lucide:${type.value === 'text' ? 'text' : type.value === 'number' ? 'hash' : 'circle'}`
}))

// No longer needed - handled by individual config components

// Watch for column changes (edit mode)
watch(() => props.column, (newColumn) => {
  if (newColumn) {
    form.value = {
      name: newColumn.name,
      label: newColumn.label,
      type: newColumn.type as ColumnType,
      required: newColumn.required,
      config: newColumn.config || {}
    }
  }
}, { immediate: true })

// Reset form when opening in add mode
watch(() => props.visible, (visible) => {
  if (visible && !props.column) {
    form.value = {
      name: '',
      label: '',
      type: 'text',
      required: false,
      config: {}
    }
  }
})

// Debounce timer for AI suggestions
let suggestionTimer: NodeJS.Timeout | null = null

const handleLabelInputDebounced = useDebounceFn(() => {
  if(cancelToken.value) {
    cancelToken.value.abort()
  }
  handleLabelInput()
}, 500)
const cancelToken = ref<AbortController | null>(null)
// Auto-generate name from label and fetch AI suggestion
async function handleLabelInput() {
  if (!isEditMode.value && form.value.label) {
    // Auto-generate column name
    form.value.name = form.value.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
    
    // Debounce AI suggestion call
    if (suggestionTimer) {
      clearTimeout(suggestionTimer)
    }
    
    await fetchAISuggestion() // Wait 500ms after user stops typing
  }
}

// Fetch AI suggestion for column type
async function fetchAISuggestion() {
  if (!form.value.label || isEditMode.value) return
  
  suggesting.value = true
  
  try {
    if(!cancelToken.value) {  
      cancelToken.value = new AbortController()
    }
    // @ts-ignore - Nuxt $fetch POST method type issue
    const response: any = await $fetch('/api/ai/suggest-column-type', {
      method: 'POST',
      body: {
        columnName: form.value.name,
        columnLabel: form.value.label,
        workspaceSlug: props.workspaceSlug,
        tableSlug: props.tableSlug
      },
      signal: cancelToken.value.signal
    })
    
    if (response.data) {
      // Apply AI suggestion
      form.value.type = response.data.type as ColumnType
      form.value.required = response.data.required
      form.value.config = response.data.config || {}
    }
  } catch (error) {
    console.error('Error fetching AI suggestion:', error)
    // Silently fail - user can still manually select type
  } finally {
    suggesting.value = false
    cancelToken.value = null
  }
}

// Save column
async function handleSave() {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    loading.value = true
    
    const {$api} = useNuxtApp()
    
    if (isEditMode.value) {
      // Update existing column
      const response: any = await $api(
        `/api/workspaces/${props.workspaceSlug}/tables/${props.tableSlug}/columns/${props.column?.id}`,
        {
          method: 'PUT',
          body: {
            label: form.value.label,
            type: form.value.type,
            required: form.value.required,
            config: form.value.config
          }
        }
      )
      ElMessage.success('Column updated successfully')
      emit('saved', response.data) // Emit updated column
    } else {
      // Create new column
      const response: any = await $api(
        `/api/workspaces/${props.workspaceSlug}/tables/${props.tableSlug}/columns`,
        {
          method: 'POST',
          body: {
            name: form.value.name,
            label: form.value.label,
            type: form.value.type,
            required: form.value.required,
            config: form.value.config,
          }
        }
      )
      ElMessage.success('Column created successfully')
      emit('saved', response.data) // Emit created column
    }
    
    handleClose()
  } catch (error: any) {
    console.error('Error saving column:', error)
    if (error?.data?.message) {
      ElMessage.error(error.data.message)
    } else {
      ElMessage.error('Failed to save column')
    }
  } finally {
    loading.value = false
  }
}

// Close dialog
function handleClose() {
  formRef.value?.resetFields()
  dialogVisible.value = false
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      label-position="top"
      :disabled="loading"
    >
      <!-- Column Label -->
      <el-form-item
        label="Display Label"
        prop="label"
        :rules="[
          { required: true, message: 'Display label is required', trigger: 'blur' }
        ]"
      >
        <el-input
          v-model="form.label"
          placeholder="e.g., Email Address"
          @input="handleLabelInputDebounced"
        >
        </el-input>
        <template v-if="!isEditMode && form.name" #extra>
          <span class="form-tip">Column name: <code>{{ form.name }}</code></span>
        </template>
      </el-form-item>
      
      <!-- Column Type -->
      <el-form-item
        label="Column Type"
        prop="type"
      >
        <el-select
          v-model="form.type"
          placeholder="Select type"
          style="width: 100%"
          :class="{suggesting}"
        >
          <el-option
            v-for="type in columnTypes"
            :key="type.value"
            :label="type.label"
            :value="type.value"
          >
            <div style="display: flex; align-items: center; gap: 8px;">
              <Icon :name="type.icon" size="16" />
              <span>{{ type.label }}</span>
            </div>
          </el-option>
        </el-select>
      </el-form-item>
      
      <!-- Type-specific Configuration -->
      <el-divider content-position="left">
        <span style="font-size: 14px; color: var(--el-text-color-secondary)">
          Field Options
        </span>
      </el-divider>
      
      <!-- Dynamic field config components -->
      <FieldConfigTextFieldConfig
        v-if="form.type === 'text' || form.type === 'email' || form.type === 'phone' || form.type === 'url'"
        v-model="form.config"
        :field-type="form.type"
      />
      
      <FieldConfigLongTextFieldConfig
        v-else-if="form.type === 'long_text'"
        v-model="form.config"
      />
      
      <FieldConfigNumberFieldConfig
        v-else-if="form.type === 'number'"
        v-model="form.config"
      />
      
      <FieldConfigCurrencyFieldConfig
        v-else-if="form.type === 'currency'"
        v-model="form.config"
      />
      
      <FieldConfigRatingFieldConfig
        v-else-if="form.type === 'rating'"
        v-model="form.config"
      />
      
      <FieldConfigColorFieldConfig
        v-else-if="form.type === 'color'"
        v-model="form.config"
      />
      
      <FieldConfigGeolocationFieldConfig
        v-else-if="form.type === 'geolocation'"
        v-model="form.config"
      />
      
      <FieldConfigDateFieldConfig
        v-else-if="form.type === 'date' || form.type === 'datetime'"
        v-model="form.config"
        :field-type="form.type"
      />
      
      <FieldConfigSelectFieldConfig
        v-else-if="form.type === 'select' || form.type === 'multi_select'"
        v-model="form.config"
        :field-type="form.type"
      />
      
      <FieldConfigSwitchFieldConfig
        v-else-if="form.type === 'switch'"
        v-model="form.config"
      />
      
      <!-- Relation field -->
      <FieldConfigRelationFieldConfig
        v-else-if="form.type === 'relation'"
        v-model="form.config"
        :workspace-slug="workspaceSlug"
      />
      
      <!-- Lookup field -->
      <FieldConfigLookupFieldConfig
        v-else-if="form.type === 'lookup'"
        v-model="form.config"
        :workspace-slug="workspaceSlug"
        :table-slug="tableSlug"
      />
      
      <!-- Formula field -->
      <FieldConfigFormulaFieldConfig
        v-else-if="form.type === 'formula'"
        v-model="form.config"
        :workspace-slug="workspaceSlug"
        :table-slug="tableSlug"
      />
      
      <!-- Required Field -->
      <el-divider content-position="left">
        <span style="font-size: 14px; color: var(--el-text-color-secondary)">
          Validation
        </span>
      </el-divider>
      
      <el-form-item label="Field Settings">
        <el-checkbox v-model="form.required">
          Required field
        </el-checkbox>
      </el-form-item>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" :disabled="loading">
          Cancel
        </el-button>
        <el-button
          type="primary"
          :loading="loading"
          @click="handleSave"
        >
          {{ isEditMode ? 'Update' : 'Create' }} Column
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--app-space-s);
}
// add a rainbow animation border to the select
.suggesting{
  border-radius: var(--el-border-radius-base);
  outline: 1px solid var(--app-primary-1);
  box-shadow: 0 0 6px var(--app-primary-alpha-50), 0 0 12px var(--app-primary-alpha-20), 0 0 18px var(--app-primary-alpha-10); animation: pulseGlow 1.6s infinite ease-in-out;
}
@keyframes pulseGlow { 
  0% { 
    box-shadow: 0 0 4px var(--app-primary-alpha-70);
    outline: 1px solid var(--app-primary-1);
  } 
  50% { 
    box-shadow: 0 0 14px var(--app-success-alpha-70); 
    outline: 2px solid var(--app-primary-1);
  } 
  100% { 
    box-shadow: 0 0 4px var(--app-primary-alpha-70); 
    outline: 1px solid var(--app-primary-1);
  }
}

.coming-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--el-text-color-secondary);
}

.coming-soon p {
  margin: 16px 0 8px;
  font-size: 16px;
  font-weight: 500;
}

.coming-soon .hint {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
}
</style>

