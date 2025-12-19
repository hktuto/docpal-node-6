<script setup lang="ts">
const props = defineProps<{
  parentId?: string | null
}>()

const emit = defineEmits<{
  create: [type: 'folder' | 'table' | 'view' | 'dashboard', parentId?: string | null]
}>()

function handleCommand(command: string) {
  const type = command as 'folder' | 'table' | 'view' | 'dashboard'
  emit('create', type, props.parentId || null)
}
</script>

<template>
  <el-dropdown 
    trigger="click" 
    @command="handleCommand"
    class="add-button-dropdown"
  >
    <button class="add-btn">
      <Icon name="lucide:plus" size="16" />
    </button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="folder">
          <Icon name="lucide:folder" size="16" class="dropdown-icon" />
          New Folder
        </el-dropdown-item>
        <el-dropdown-item command="table">
          <Icon name="lucide:table" size="16" class="dropdown-icon" />
          New Table
        </el-dropdown-item>
        <el-dropdown-item command="view">
          <Icon name="lucide:layout-dashboard" size="16" class="dropdown-icon" />
          New View
        </el-dropdown-item>
        <el-dropdown-item command="dashboard">
          <Icon name="lucide:bar-chart" size="16" class="dropdown-icon" />
          New Dashboard
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style lang="scss" scoped>
.add-button-dropdown {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--app-text-color-secondary);
  border-radius: var(--app-border-radius-s);
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: var(--app-fill-color-light);
    color: var(--app-primary-color);
  }
}

// Dropdown icon styling
.dropdown-icon {
  margin-right: var(--app-space-xs);
  vertical-align: middle;
}
</style>

