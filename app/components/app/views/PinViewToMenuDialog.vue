<template>
  <el-dialog
    v-model="dialogVisible"
    title="Pin View to Menu"
    width="500px"
    @close="handleClose"
  >
    <el-form :model="form" label-position="top">
      <el-form-item label="View Name">
        <el-input v-model="form.name" disabled />
      </el-form-item>
      
      <el-form-item label="Pin Location">
        <el-tree-select
          v-model="form.parentId"
          :data="menuTreeData"
          :props="{ label: 'name', value: 'id', children: 'children' }"
          placeholder="Select folder (or leave empty for root)"
          clearable
          check-strictly
          node-key="id"
        />
      </el-form-item>
      
      <el-alert
        type="info"
        :closable="false"
        show-icon
      >
        <template #title>
          This will add a shortcut to this view in the menu. The view itself will not be moved.
        </template>
      </el-alert>
    </el-form>
    
    <template #footer>
      <el-button @click="handleClose">Cancel</el-button>
      <el-button type="primary" @click="handleConfirm">Pin to Menu</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { DataTableView } from '#shared/types/db'
import type { MenuItem } from '#shared/types/db'

interface Props {
  visible: boolean
  view: DataTableView | null
  menu: MenuItem[]
  workspaceSlug: string
  tableSlug: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [parentId: string | null]
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const form = ref({
  name: '',
  parentId: null as string | null
})

// Build tree data from menu (only folders)
const menuTreeData = computed(() => {
  function buildTree(items: MenuItem[]): any[] {
    return items
      .filter(item => item.type === 'folder')
      .map(item => ({
        id: item.id,
        name: item.label, // Use label from MenuItem
        children: item.children ? buildTree(item.children) : []
      }))
  }
  
  return buildTree(props.menu || [])
})

// Watch view changes
watch(() => props.view, (newView) => {
  if (newView) {
    form.value.name = newView.name
    form.value.parentId = null
  }
}, { immediate: true })

function handleClose() {
  emit('update:visible', false)
}

function handleConfirm() {
  emit('confirm', form.value.parentId)
  handleClose()
}
</script>

<style scoped>
:deep(.el-alert) {
  margin-top: 16px;
}
</style>

