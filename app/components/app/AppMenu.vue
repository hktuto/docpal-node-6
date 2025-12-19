<script setup lang="ts">
import type { MenuItem } from '~/server/db/schema/app'
  import draggable from 'vuedraggable'

const props = defineProps<{
  appSlug: string
  menu: MenuItem[]
}>()

const emit = defineEmits<{
  'create': [type: 'folder' | 'table' | 'view' | 'dashboard']
  'update': [menu: MenuItem[]]
}>()

const route = useRoute()
const showCreateMenu = ref(false)

// Local copy of menu for drag and drop
const localMenu = ref<MenuItem[]>([])

// Watch for menu prop changes
watch(() => props.menu, (newMenu) => {
  localMenu.value = [...(newMenu || [])]
}, { immediate: true })

// Handle drag end - emit updated menu
function onDragEnd() {
  // Update order property based on new positions
  const updatedMenu = localMenu.value.map((item, index) => ({
    ...item,
    order: index
  }))
  
  emit('update', updatedMenu)
}

// Check if menu item is active
function isItemActive(item: MenuItem): boolean {
  const basePath = `/apps/${props.appSlug}`
  
  if (item.type === 'folder') {
    return false // Folders don't have their own page
  }
  
  const itemPath = `${basePath}/${item.type}s/${item.itemId}`
  return route.path === itemPath || route.path.startsWith(itemPath + '/')
}

// Navigate to item
function navigateToItem(item: MenuItem) {
  if (item.type === 'folder') {
    // Folders can be expanded/collapsed (we'll add this later)
    return
  }
  
  const basePath = `/apps/${props.appSlug}`
  navigateTo(`${basePath}/${item.type}s/${item.itemId}`)
}

// Create new item
function createItem(type: 'folder' | 'table' | 'view' | 'dashboard') {
  showCreateMenu.value = false
  emit('create', type)
}

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
  <div class="app-menu">
    <div class="menu-header">
      <span class="menu-title">Menu</span>
      <button 
        class="add-btn"
        @click="showCreateMenu = !showCreateMenu"
      >
        <Icon name="lucide:plus" size="16" />
      </button>
    </div>
    
    <!-- Create Menu Dropdown -->
    <div v-if="showCreateMenu" class="create-menu">
      <button @click="createItem('folder')" class="create-item">
        <Icon name="lucide:folder" size="16" />
        <span>New Folder</span>
      </button>
      <button @click="createItem('table')" class="create-item">
        <Icon name="lucide:table" size="16" />
        <span>New Table</span>
      </button>
      <button @click="createItem('view')" class="create-item">
        <Icon name="lucide:layout-dashboard" size="16" />
        <span>New View</span>
      </button>
      <button @click="createItem('dashboard')" class="create-item">
        <Icon name="lucide:bar-chart" size="16" />
        <span>New Dashboard</span>
      </button>
    </div>
    
    <!-- Menu Items -->
    <div class="menu-items">
      <div v-if="!localMenu || localMenu.length === 0" class="empty-state">
        <Icon name="lucide:inbox" size="32" />
        <p>No items yet</p>
        <button @click="showCreateMenu = true" class="empty-create-btn">
          Create your first item
        </button>
      </div>
      
      <!-- Draggable Menu Items -->
      <draggable
        v-else
        v-model="localMenu"
        :animation="200"
        handle=".drag-handle"
        @end="onDragEnd"
        class="draggable-list"
      >
        <div
          v-for="item in localMenu"
          :key="item.id"
          class="menu-item"
          :class="{ 
            active: isItemActive(item),
            folder: item.type === 'folder'
          }"
        >
          <!-- Drag Handle -->
          <div class="drag-handle">
            <Icon name="lucide:grip-vertical" size="14" />
          </div>
          
          <!-- Item Content -->
          <div class="item-content" @click="navigateToItem(item)">
            <Icon 
              :name="getIcon(item.type)" 
              size="18" 
            />
            <span class="item-label">{{ item.label }}</span>
          </div>
          
          <!-- Folder Toggle (if folder) -->
          <button 
            v-if="item.type === 'folder'" 
            class="folder-toggle"
            @click.stop
          >
            <Icon name="lucide:chevron-right" size="14" />
          </button>
        </div>
      </draggable>
    </div>
  </div>
</template>


<style lang="scss" scoped>
.app-menu {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-xs);
  
  .menu-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--app-space-xs) var(--app-space-m);
    
    .menu-title {
      font-size: var(--app-font-size-xs);
      font-weight: 600;
      text-transform: uppercase;
      color: var(--app-text-color-placeholder);
      letter-spacing: 0.5px;
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
  }
  
  .create-menu {
    position: relative;
    background: var(--app-bg-color);
    border: 1px solid var(--app-border-color);
    border-radius: var(--app-border-radius-m);
    padding: var(--app-space-xxs);
    margin: 0 var(--app-space-m);
    box-shadow: var(--app-shadow-m);
    z-index: 10;
    
    .create-item {
      display: flex;
      align-items: center;
      gap: var(--app-space-xs);
      width: 100%;
      padding: var(--app-space-xs) var(--app-space-m);
      border: none;
      background: transparent;
      color: var(--app-text-color-primary);
      text-align: left;
      border-radius: var(--app-border-radius-s);
      cursor: pointer;
      transition: all 0.2s;
      font-size: var(--app-font-size-s);
      
      &:hover {
        background: var(--app-fill-color-light);
        color: var(--app-primary-color);
      }
    }
  }
  
  .menu-items {
    display: flex;
    flex-direction: column;
    gap: var(--app-space-xxs);
    
    .draggable-list {
      display: flex;
      flex-direction: column;
      gap: var(--app-space-xxs);
    }
    
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--app-space-xl) var(--app-space-m);
      color: var(--app-text-color-placeholder);
      text-align: center;
      
      p {
        margin: var(--app-space-xs) 0;
        font-size: var(--app-font-size-s);
      }
      
      .empty-create-btn {
        margin-top: var(--app-space-xs);
        padding: var(--app-space-xs) var(--app-space-m);
        background: var(--app-primary-color);
        color: var(--app-paper);
        border: none;
        border-radius: var(--app-border-radius-m);
        cursor: pointer;
        font-size: var(--app-font-size-s);
        transition: all 0.2s;
        
        &:hover {
          background: var(--app-primary-5);
        }
      }
    }
    
    .menu-item {
      display: flex;
      align-items: center;
      gap: var(--app-space-xxs);
      padding: var(--app-space-xs) var(--app-space-xs);
      border-radius: var(--app-border-radius-m);
      color: var(--app-text-color-secondary);
      transition: all 0.2s;
      user-select: none;
      background: transparent;
      
      &:hover {
        background: var(--app-fill-color-light);
        color: var(--app-text-color-primary);
        
        .drag-handle {
          opacity: 1;
        }
      }
      
      &.active {
        background: var(--app-primary-1);
        color: var(--app-primary-color);
        
        .item-content {
          font-weight: 500;
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
        width: 20px;
        height: 20px;
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
  }
}
</style>

