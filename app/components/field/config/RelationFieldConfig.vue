<script setup lang="ts">
interface Props {
  modelValue: any
  workspaceSlug: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>()

const config = computed({
  get: () => props.modelValue || {},
  set: (val) => emit('update:modelValue', val)
})

// Fetch available tables in workspace

const loadingTables = ref(false)

// Fetch tables
const tables = ref<any[]>([])
async function fetchTables() {
  loadingTables.value = true
  try {
    const {data:response} = await $fetch(`/api/workspaces/${props.workspaceSlug}/tables`)
    tables.value = (response as any).data || []
  } catch (error) {
    console.error('Failed to load tables:', error)
    tables.value = []
  } finally {
    loadingTables.value = false
  }
}

// Fetch fields from selected table
const targetFields = ref<any[]>([])
const loadingFields = ref(false)
async function fetchFields(tableSlug: string) {
  loadingFields.value = true
  try {
    const {data:response} = await $fetch(`/api/workspaces/${props.workspaceSlug}/tables/${tableSlug}/columns`)
    targetFields.value = (response as any).data || []
    if (!config.value.displayField && targetFields.value.length > 0) {
        const textField = targetFields.value.find(f => f.type === 'text' || f.type === 'email')
        config.value.displayField = textField?.name || targetFields.value[0].name
      }
  } catch (error) {
    console.error('Failed to load target fields:', error)
    targetFields.value = []
  } finally {
    loadingFields.value = false
  }
}

watch(() => config.value.targetTable, async (tableSlug) => {
  if (tableSlug) {
    fetchFields(tableSlug)
  } else {
    targetFields.value = []
  }
}, { immediate: true })


// Initialize defaults
onMounted(async() => {
  await fetchTables()
  if (!config.value.cascadeDelete) {
    config.value = {
      ...config.value,
      cascadeDelete: 'set_null'
    }
  }
})
</script>

<template>
  <div class="relation-field-config">
    <!-- Target Table -->
    <el-form-item label="Target Table" required>
      <el-select 
        v-model="config.targetTable" 
        placeholder="Select table to link to"
        :loading="loadingTables"
        filterable
      >
        <el-option
          v-for="table in tables"
          :key="table.id || table.slug"
          :label="table.name"
          :value="table.slug"
        >
          <div style="display: flex; align-items: center; gap: 8px;">
            <Icon name="lucide:table" size="16" />
            <span>{{ table.name }}</span>
          </div>
        </el-option>
        
        <!-- Show message if no tables -->
        <el-option v-if="!loadingTables && tables.length === 0" disabled value="">
          <span style="color: var(--el-text-color-placeholder);">No tables available</span>
        </el-option>
      </el-select>
      <template #extra>
        <span class="hint">
          {{ tables.length > 0 ? `${tables.length} table(s) available` : 'The table this field will reference' }}
        </span>
      </template>
    </el-form-item>
    
    <!-- Display Field -->
    <el-form-item 
      v-if="config.targetTable"
      label="Display Field" 
      required
    >
      <el-select 
        v-model="config.displayField"
        placeholder="Which field to show"
        :loading="loadingFields"
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
            <span style="font-size: 12px; color: var(--el-text-color-secondary);">
              ({{ field.type }})
            </span>
          </div>
        </el-option>
      </el-select>
      <template #extra>
        <span class="hint">Which field to display from the related record</span>
      </template>
    </el-form-item>
    
    <!-- Cascade Delete Options -->
    <el-form-item label="When Related Record is Deleted">
      <el-radio-group v-model="config.cascadeDelete">
        <el-radio label="set_null">
          <div class="radio-option">
            <strong>Set to null</strong>
            <span class="hint">Remove the link but keep this record</span>
          </div>
        </el-radio>
        <el-radio label="restrict">
          <div class="radio-option">
            <strong>Prevent deletion</strong>
            <span class="hint">Don't allow deleting if records are linked</span>
          </div>
        </el-radio>
        <el-radio label="cascade">
          <div class="radio-option">
            <strong>Delete this record too</strong>
            <span class="hint warn">⚠️ Dangerous: This record will also be deleted</span>
          </div>
        </el-radio>
      </el-radio-group>
    </el-form-item>
  </div>
</template>

<style scoped>
.hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.radio-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.radio-option .hint {
  margin-top: 0;
  font-size: 11px;
}

.radio-option .hint.warn {
  color: var(--el-color-warning);
}

:deep(.el-radio) {
  margin-bottom: 12px;
}
</style>

