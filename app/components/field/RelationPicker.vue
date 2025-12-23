<script setup lang="ts">
  import { useDebounceFn } from '@vueuse/core'
interface Props {
  modelValue: string | null
  workspaceSlug: string
  tableSlug: string
  displayField: string
  placeholder?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search and select...',
  disabled: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
}>()

const searchQuery = ref('')
const options = ref<any[]>([])
const loading = ref(false)
const selectedRecord = ref<any>(null)

// Debounced search
const searchRecords = useDebounceFn(async () => {
  if (!props.tableSlug) return
  
  loading.value = true
  try {
    const response = await $fetch(
      `/api/workspaces/${props.workspaceSlug}/tables/${props.tableSlug}/records/search`,
      {
        params: {
          q: searchQuery.value,
          field: props.displayField,
          limit: 50
        }
      }
    )
    options.value = (response as any).data || []
  } catch (error) {
    console.error('Failed to search records:', error)
    options.value = []
  } finally {
    loading.value = false
  }
}, 300)

// Load selected record
async function loadSelectedRecord() {
  if (!props.modelValue || !props.tableSlug) {
    selectedRecord.value = null
    return
  }
  
  try {
    const response = await $fetch(
      `/api/workspaces/${props.workspaceSlug}/tables/${props.tableSlug}/records/${props.modelValue}`
    )
    selectedRecord.value = (response as any).data
  } catch (error) {
    console.error('Failed to load selected record:', error)
    selectedRecord.value = null
  }
}

// Watch for changes
watch(() => props.modelValue, loadSelectedRecord, { immediate: true })
watch(() => props.tableSlug, () => {
  options.value = []
  searchQuery.value = ''
})

// Handle search
function handleSearch(query: string) {
  searchQuery.value = query
  searchRecords()
}

// Handle change
function handleChange(value: string | null) {
  emit('update:modelValue', value)
}

// Load initial options
onMounted(() => {
  searchRecords()
})
</script>

<template>
  <div class="relation-picker">
    <el-select
      :model-value="modelValue"
      filterable
      remote
      :remote-method="handleSearch"
      :loading="loading"
      :placeholder="placeholder"
      :disabled="disabled"
      clearable
      @update:model-value="handleChange"
    >
      <el-option
        v-for="option in options"
        :key="option.id"
        :label="option[displayField]"
        :value="option.id"
      >
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span>{{ option[displayField] }}</span>
          <span style="font-size: 11px; color: var(--el-text-color-secondary);">
            ID: {{ option.id.slice(0, 8) }}...
          </span>
        </div>
      </el-option>
    </el-select>
  </div>
</template>

<style scoped>
.relation-picker {
  width: 100%;
}
</style>

