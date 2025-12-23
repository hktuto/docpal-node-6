<script setup lang="ts">
interface Props {
  modelValue: any
  workspaceSlug: string
  tableSlug: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>()

const config = computed({
  get: () => props.modelValue || {},
  set: (val) => emit('update:modelValue', val)
})

// Fetch current table's columns to find relation fields
const loadingRelations = ref(false)
const relationFields = ref<any[]>([])

async function fetchRelationFields() {
  loadingRelations.value = true
  try {
    const response = await $fetch(`/api/workspaces/${props.workspaceSlug}/tables/${props.tableSlug}/columns`)
    const allColumns = (response as any).data || []
    relationFields.value = allColumns.filter((col: any) => col.type === 'relation')
  } catch (error) {
    console.error('Failed to load relation fields:', error)
    relationFields.value = []
  } finally {
    loadingRelations.value = false
  }
}

// Fetch fields from the target table of selected relation
const loadingTargetFields = ref(false)
const targetFields = ref<any[]>([])

async function fetchTargetFields(relationFieldName: string) {
  const selectedRelation = relationFields.value.find(r => r.name === relationFieldName)
  
  if (!selectedRelation || !selectedRelation.config?.targetTable) {
    targetFields.value = []
    return
  }
  
  loadingTargetFields.value = true
  try {
    const response = await $fetch(
      `/api/workspaces/${props.workspaceSlug}/tables/${selectedRelation.config.targetTable}/columns`
    )
    targetFields.value = (response as any).data || []
    
    // Auto-select first field if not set
    if (!config.value.targetField && targetFields.value.length > 0) {
      config.value.targetField = targetFields.value[0].name
    }
  } catch (error) {
    console.error('Failed to load target fields:', error)
    targetFields.value = []
  } finally {
    loadingTargetFields.value = false
  }
}

// Watch for relation field changes
watch(() => config.value.relationField, async (relationFieldName) => {
  if (relationFieldName) {
    await fetchTargetFields(relationFieldName)
  } else {
    targetFields.value = []
  }
})

// Initialize
onMounted(async () => {
  await fetchRelationFields()
  
  // If relationField is already set, load target fields
  if (config.value.relationField) {
    await fetchTargetFields(config.value.relationField)
  }
  
  // Set defaults
  if (config.value.autoUpdate === undefined) {
    config.value.autoUpdate = true
  }
  if (config.value.cacheValue === undefined) {
    config.value.cacheValue = true
  }
})
</script>

<template>
  <div class="lookup-field-config">
    <!-- Relation Field Selector -->
    <el-form-item label="Source Relation" required>
      <el-select 
        v-model="config.relationField" 
        placeholder="Select relation field to follow"
        :loading="loadingRelations"
        filterable
      >
        <el-option
          v-for="field in relationFields"
          :key="field.name"
          :label="field.label"
          :value="field.name"
        >
          <div style="display: flex; align-items: center; gap: 8px;">
            <Icon name="lucide:link" size="16" />
            <span>{{ field.label }}</span>
            <span style="font-size: 11px; color: var(--el-text-color-secondary);">
              → {{ field.config?.targetTable }}
            </span>
          </div>
        </el-option>
        
        <!-- No relations message -->
        <el-option v-if="!loadingRelations && relationFields.length === 0" disabled value="">
          <span style="color: var(--el-text-color-placeholder);">
            No relation fields found. Create a relation first.
          </span>
        </el-option>
      </el-select>
      <template #extra>
        <span class="hint">
          {{ relationFields.length > 0 
            ? `${relationFields.length} relation field(s) available` 
            : 'Which relation field to follow for looking up values' 
          }}
        </span>
      </template>
    </el-form-item>
    
    <!-- Target Field Selector -->
    <el-form-item 
      v-if="config.relationField"
      label="Field to Lookup" 
      required
    >
      <el-select 
        v-model="config.targetField"
        placeholder="Select field to pull value from"
        :loading="loadingTargetFields"
        filterable
      >
        <el-option
          v-for="field in targetFields"
          :key="field.name"
          :label="field.label"
          :value="field.name"
        >
          <div style="display: flex; align-items: center; gap: 8px;">
            <Icon :name="`lucide:${field.type === 'text' ? 'type' : 'circle'}`" size="14" />
            <span>{{ field.label }}</span>
            <span style="font-size: 11px; color: var(--el-text-color-secondary);">
              ({{ field.type }})
            </span>
          </div>
        </el-option>
      </el-select>
      <template #extra>
        <span class="hint">Which field value to pull from the related record</span>
      </template>
    </el-form-item>
    
    <!-- Preview -->
    <div v-if="config.relationField && config.targetField" class="lookup-preview">
      <Icon name="lucide:info" size="16" />
      <div class="preview-text">
        <strong>Preview:</strong>
        <code>
          {{ relationFields.find(r => r.name === config.relationField)?.label }}
          → 
          {{ targetFields.find(f => f.name === config.targetField)?.label }}
        </code>
      </div>
    </div>
    
    <!-- Options -->
    <el-form-item label="Options">
      <div class="options-group">
        <el-checkbox v-model="config.autoUpdate">
          <div class="option-label">
            <strong>Auto Update</strong>
            <span class="hint">Automatically update when related record changes</span>
          </div>
        </el-checkbox>
        
        <el-checkbox v-model="config.cacheValue">
          <div class="option-label">
            <strong>Cache Value</strong>
            <span class="hint">Store value locally for faster access</span>
          </div>
        </el-checkbox>
      </div>
    </el-form-item>
  </div>
</template>

<style scoped>
.hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.lookup-preview {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background-color: var(--el-color-info-light-9);
  border-radius: 6px;
  margin-bottom: 16px;
}

.preview-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

.preview-text code {
  padding: 2px 6px;
  background-color: var(--el-color-info-light-8);
  border-radius: 3px;
  font-size: 12px;
}

.options-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.option-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-label .hint {
  margin-top: 0;
  font-size: 11px;
}

:deep(.el-checkbox) {
  align-items: flex-start;
}
</style>

