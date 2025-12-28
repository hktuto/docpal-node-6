<template>
  <el-dropdown trigger="click" @command="handleCommand">
    <el-button text class="view-actions-btn" @click.stop>
      <Icon name="lucide:more-horizontal" />
    </el-button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="edit">
          <Icon name="lucide:pencil" />
          <span>Edit View</span>
        </el-dropdown-item>
        <el-dropdown-item command="duplicate">
          <Icon name="lucide:copy" />
          <span>Duplicate</span>
        </el-dropdown-item>
        <el-dropdown-item v-if="!view.isDefault" command="pin" divided>
          <Icon name="lucide:pin" />
          <span>Pin to Menu</span>
        </el-dropdown-item>
        <el-dropdown-item v-if="!view.isDefault" command="delete" divided>
          <Icon name="lucide:trash-2" />
          <span style="color: var(--el-color-danger)">Delete View</span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import type { DataTableView } from '#shared/types/db'

interface Props {
  view: DataTableView
}

defineProps<Props>()

const emit = defineEmits<{
  edit: []
  duplicate: []
  pin: []
  delete: []
}>()

function handleCommand(command: string) {
  emit(command as any)
}
</script>

<style scoped>
.view-actions-btn {
  padding: 4px;
  margin-left: 4px;
  border-radius: 4px;
}

.view-actions-btn:hover {
  background: var(--el-fill-color-light);
}

:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>

