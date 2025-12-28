<script setup lang="ts">
import type { MenuItem } from '#shared/types/db'

interface Props {
  visible: boolean
  item: MenuItem | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [newName: string]
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const newName = ref('')

// Reset name when dialog opens
watch(() => props.item, (item) => {
  if (item) {
    newName.value = item.label
  }
}, { immediate: true })

function handleConfirm() {
  if (!newName.value.trim()) {
    ElMessage.warning('Name cannot be empty')
    return
  }
  
  emit('confirm', newName.value.trim())
  handleClose()
}

function handleClose() {
  emit('update:visible', false)
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`Rename ${item?.type || 'Item'}`"
    width="400px"
    @close="handleClose"
  >
    <el-form @submit.prevent="handleConfirm">
      <el-form-item label="Name">
        <el-input
          v-model="newName"
          placeholder="Enter new name"
          autofocus
          @keyup.enter="handleConfirm"
        />
      </el-form-item>
    </el-form>
    
    <template #footer>
      <el-button @click="handleClose">Cancel</el-button>
      <el-button type="primary" @click="handleConfirm">Rename</el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
:deep(.el-dialog) {
  .el-form-item {
    margin-bottom: 0;
  }
}
</style>

