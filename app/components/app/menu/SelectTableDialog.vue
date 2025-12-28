<script setup lang="ts">
import type { DataTable } from '#shared/types/db'
import type { FormInstance, FormRules } from 'element-plus'

interface Props {
  visible: boolean
  workspaceSlug: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [tableSlug: string]
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const formRef = ref<FormInstance>()
const selectedTableId = ref('')
const loading = ref(false)

// Fetch tables
const { data: tablesData } = await useApi<SuccessResponse<DataTable[]>>(
  () => `/api/workspaces/${props.workspaceSlug}/tables`,
  {
    key: `tables-${props.workspaceSlug}`,
    watch: [() => props.workspaceSlug]
  }
)

const tables = computed(() => tablesData.value?.data || [])

const rules: FormRules = {
  tableId: [{ required: true, message: 'Please select a table', trigger: 'change' }]
}

// Reset form when dialog opens
watch(() => props.visible, (visible) => {
  if (visible) {
    selectedTableId.value = ''
  }
})

async function handleConfirm() {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    // Find selected table
    const selectedTable = tables.value.find(t => t.id === selectedTableId.value)
    if (!selectedTable) return
    
    emit('confirm', selectedTable.slug)
    handleClose()
  } catch (error) {
    console.error('Form validation failed:', error)
  }
}

function handleClose() {
  emit('update:visible', false)
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="Create View"
    width="400px"
    @close="handleClose"
  >
    <el-form :model="{ tableId: selectedTableId }" label-position="top" :rules="rules" ref="formRef">
      <el-form-item label="Select Table" prop="tableId">
        <el-select
          v-model="selectedTableId"
          placeholder="Choose a table to create view for"
          filterable
          style="width: 100%"
          size="large"
        >
          <el-option
            v-for="table in tables"
            :key="table.id"
            :label="table.name"
            :value="table.id"
          >
            <div style="display: flex; align-items: center; gap: 8px;">
              <Icon :name="table.icon || 'lucide:table'" />
              <span>{{ table.name }}</span>
            </div>
          </el-option>
        </el-select>
      </el-form-item>
      
      <el-alert
        type="info"
        :closable="false"
        show-icon
      >
        <template #title>
          After selecting a table, you'll configure the view details
        </template>
      </el-alert>
    </el-form>
    
    <template #footer>
      <el-button @click="handleClose">Cancel</el-button>
      <el-button type="primary" :loading="loading" @click="handleConfirm">Next</el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
:deep(.el-radio-button) {
  margin-right: 8px;
}

:deep(.el-radio-button__inner) {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>

