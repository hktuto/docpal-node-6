<script setup lang="ts">
import type { MenuItem } from '#shared/types/db'

const props = defineProps<{
  item: MenuItem
}>()

const emit = defineEmits<{
  rename: []
  duplicate: []
  unpin: []
  delete: []
}>()

const showDropdown = ref(false)

// Show dropdown on hover or click
function handleMouseEnter() {
  showDropdown.value = true
}

function handleMouseLeave() {
  // Small delay to allow moving to dropdown
  setTimeout(() => {
    showDropdown.value = false
  }, 100)
}

function handleAction(action: 'rename' | 'duplicate' | 'unpin' | 'delete') {
  showDropdown.value = false
  emit(action)
}
</script>

<template>
  <el-dropdown trigger="click" @click.stop>
    <div class="action-item">
      <Icon name="lucide:more-horizontal" size="14" />
    </div>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item @click="handleAction('rename')">
          <Icon name="lucide:edit-2" size="14" />
          <span>Rename</span>
        </el-dropdown-item>
        
        <!-- View-specific actions -->
        <el-dropdown-item v-if="item.type === 'view'" @click="handleAction('duplicate')">
          <Icon name="lucide:copy" size="14" />
          <span>Duplicate</span>
        </el-dropdown-item>
        
        <el-dropdown-item v-if="item.type === 'view'" @click="handleAction('unpin')">
          <Icon name="lucide:pin-off" size="14" />
          <span>Unpin from Menu</span>
        </el-dropdown-item>
        
        <el-dropdown-item divided @click="handleAction('delete')" class="danger">
          <Icon name="lucide:trash-2" size="14" />
          <span>Delete</span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style lang="scss" scoped>
.menu-item-actions {
  position: relative;
  display: flex;
  align-items: center;
}

.danger {
  color: var(--el-color-danger);
}

.actions-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--app-space-xxs);
  border: none;
  background: transparent;
  color: var(--app-text-color-placeholder);
  cursor: pointer;
  border-radius: var(--app-border-radius-s);
  transition: all 0.2s;
  opacity: 0;
  
  .menu-item:hover & {
    opacity: 1;
  }
  
  &:hover {
    background: var(--app-fill-color);
    color: var(--app-text-color-secondary);
  }
}

.actions-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: var(--app-space-xxs);
  min-width: 180px;
  background: var(--app-bg-color-elevated);
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-border-radius-m);
  box-shadow: var(--app-box-shadow-m);
  padding: var(--app-space-xxs);
  z-index: 1000;
  
  .action-item {
    display: flex;
    align-items: center;
    gap: var(--app-space-xs);
    width: 100%;
    padding: var(--app-space-xs) var(--app-space-s);
    border: none;
    background: transparent;
    color: var(--app-text-color-primary);
    font-size: var(--app-font-size-s);
    cursor: pointer;
    border-radius: var(--app-border-radius-s);
    text-align: left;
    transition: all 0.2s;
    
    &:hover {
      background: var(--app-fill-color);
    }
    
    &.danger {
      color: var(--app-danger-color);
      
      &:hover {
        background: var(--app-danger-alpha-10);
      }
    }
  }
  
  .action-divider {
    height: 1px;
    background: var(--app-border-color);
    margin: var(--app-space-xxs) 0;
  }
}

// Dropdown transition
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>

