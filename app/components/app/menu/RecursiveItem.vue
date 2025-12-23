<script setup lang="ts">
import type { MenuItem } from '#shared/types/db'
import draggable from 'vuedraggable'

const props = defineProps<{
  item: MenuItem
  workspaceSlug: string
  isActive: (item: MenuItem) => boolean
  hasActiveChild: (item: MenuItem) => boolean
  isExpanded: (folderId: string) => boolean
  isHighlighted: (itemId: string) => boolean
  isJustCreated: (itemId: string) => boolean
}>()

const emit = defineEmits<{
  navigate: [item: MenuItem, event: MouseEvent]
  toggle: [folderId: string]
  create: [type: 'folder' | 'table' | 'view' | 'dashboard', parentId: string | null]
  dragEnd: []
}>()

function getIcon(type: string): string {
  const icons = {
    folder: 'lucide:folder',
    table: 'lucide:table',
    view: 'lucide:layout-dashboard',
    dashboard: 'lucide:bar-chart'
  }
  return icons[type as keyof typeof icons] || 'lucide:file'
}
</script>

<template>
  <div class="menu-item-wrapper">
    <div
      class="menu-item"
      :class="{ 
        active: isActive(item),
        folder: item.type === 'folder',
        'has-active-child': hasActiveChild(item),
        expanded: isExpanded(item.id),
        highlighted: isHighlighted(item.id),
        'just-created': isJustCreated(item.id)
      }"
    >
      <!-- Drag Handle -->
      <div class="drag-handle">
        <Icon name="lucide:grip-vertical" size="14" />
      </div>
      
      <!-- Item Content -->
      <div class="item-content" @click="(e) => emit('navigate', item, e)">
        <Icon 
          :name="getIcon(item.type)" 
          size="18" 
        />
        <span class="item-label">{{ item.label }}</span>
      </div>
      
      <!-- Add Child Button (for folders) -->
      <AppMenuAddButton
        v-if="item.type === 'folder'"
        :parent-id="item.id"
        @create="(type, parentId) => emit('create', type, parentId)"
      />
      
      <!-- Folder Toggle -->
      <button 
        v-if="item.type === 'folder'" 
        class="folder-toggle"
        @click.stop="emit('toggle', item.id)"
      >
        <Icon 
          :name="isExpanded(item.id) ? 'lucide:chevron-down' : 'lucide:chevron-right'" 
          size="14" 
        />
      </button>
    </div>
    
    <!-- Folder Children (recursive) -->
    <div 
      v-if="item.type === 'folder' && isExpanded(item.id) && item.children" 
      class="folder-children"
    >
      <draggable
        v-model="item.children"
        :animation="200"
        handle=".drag-handle"
        @end="emit('dragEnd')"
        class="draggable-list"
        item-key="id"
        group="menu-items"
      >
        <template #item="{ element: childItem }">
          <div>
            <!-- Recursive call to self -->
            <AppMenuRecursiveItem
              :item="childItem"
              :workspace-slug="workspaceSlug"
              :is-active="isActive"
              :has-active-child="hasActiveChild"
              :is-expanded="isExpanded"
              :is-highlighted="isHighlighted"
              :is-just-created="isJustCreated"
              @navigate="(item, e) => emit('navigate', item, e)"
              @toggle="emit('toggle', $event)"
              @create="(type, parentId) => emit('create', type, parentId)"
              @drag-end="emit('dragEnd')"
            />
          </div>
        </template>
      </draggable>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.menu-item-wrapper {
  display: flex;
  flex-direction: column;
  position: relative;
}

.folder-children {
  padding-left: var(--app-space-s);
  margin-top: var(--app-space-xxs);
  border-left: 1px solid var(--app-border-color-lighter);
  
  .draggable-list {
    margin-left: var(--app-space-xs);
    display: flex;
    flex-direction: column;
    gap: var(--app-space-xxs);
    min-height: 20px;
  }
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--app-space-xxs);
  padding: var(--app-space-xs) var(--app-space-xs) var(--app-space-xs) var(--app-space-s);
  border-radius: var(--app-border-radius-s);
  color: var(--app-text-color-secondary);
  transition: all 0.2s;
  user-select: none;
  background: transparent;
  position: relative;
  
  // Highlight animation on reorder
  &.highlighted {
    animation: flashHighlight 0.5s ease-out;
  }
  
  // Special animation for newly created items
  &.just-created {
    animation: createFlash 1.5s ease-out;
  }
  
  &:hover {
    background: var(--app-fill-color-light);
    color: var(--app-text-color-primary);
    
    .drag-handle {
      opacity: 1;
    }
  }
  
  &.active {
    background: var(--app-primary-alpha-10);
    color: var(--app-primary-color);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    
    .item-content {
      font-weight: 600;
    }
    
    .drag-handle {
      color: var(--app-primary-color);
      opacity: 0.6;
    }
  }
  
  // Parent folder has active child
  &.has-active-child {
    background: var(--app-primary-alpha-10);
    // border-left: 2px solid var(--app-primary-alpha-50);
    // padding-left: calc(var(--app-space-s) - 2px);
    
    .item-content {
    //   color: var(--app-primary-color);
      font-weight: 500;
    }
    
    .folder-toggle {
      color: var(--app-primary-color);
    }
  }
  
  .drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    opacity: 0;
    transition: opacity 0.2s;
    color: var(--app-text-color-placeholder);
    padding: var(--app-space-xxs);
    position: absolute;
    left: calc(var(--app-space-xs) * -1);
    z-index: 2;
    
    &:active {
      cursor: grabbing;
    }
    
    &:hover {
      color: var(--app-text-color-secondary);
    }
  }
  
  .item-content {
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--app-space-xs);
    cursor: pointer;
    min-width: 0;
    
    .item-label {
      flex: 1;
      font-size: var(--app-font-size-s);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  
  .folder-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--app-font-size-s);
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    border-radius: var(--app-border-radius-s);
    transition: all 0.2s;
    flex-shrink: 0;
    
    &:hover {
      background: var(--app-fill-color-light);
    }
  }
}

// Animations
@keyframes flashHighlight {
  0% {
    background: linear-gradient(90deg, 
      var(--app-primary-alpha-30) 0%, 
      var(--app-primary-alpha-10) 50%, 
      transparent 100%);
  }
  75% {
    background: linear-gradient(90deg, 
      var(--app-primary-alpha-10) 0%, 
      var(--app-primary-alpha-10) 50%, 
      var(--app-primary-alpha-30) 100%);
  }
  100% {
    background: transparent;
  }
}

@keyframes createFlash {
  0% {
    background: transparent;
  }
  10% {
    background: linear-gradient(90deg, 
      var(--app-primary-alpha-70) 0%, 
      var(--app-primary-alpha-30) 50%, 
      var(--app-primary-alpha-10) 100%);
    transform: scale(1.02);
  }
  75% {
    background: linear-gradient(90deg, 
      transparent 0%, 
      var(--app-primary-alpha-10) 50%, 
      var(--app-primary-alpha-70) 100%);
  }
  100% {
    background: transparent;
    transform: scale(1);
  }
}
</style>

