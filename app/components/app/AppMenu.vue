<script setup lang="ts">
import type { MenuItem } from '#shared/types/db'
import draggable from 'vuedraggable'
import { nanoid } from 'nanoid'
import { generateUniqueSlug } from '#shared/utils/slug'

const props = defineProps<{
  appSlug: string
  menu: MenuItem[]
}>()

const emit = defineEmits<{
  'create': [type: 'folder' | 'table' | 'view' | 'dashboard']
  'update': [menu: MenuItem[]]
}>()

const route = useRoute()
const showCreateFolderDialog = ref(false)
const showCreateDashboardDialog = ref(false)
const expandedFolders = ref<Set<string>>(new Set())

// Local copy of menu for drag and drop
const localMenu = ref<MenuItem[]>([])

// Watch for menu prop changes
watch(() => props.menu, (newMenu) => {
  localMenu.value = JSON.parse(JSON.stringify(newMenu || []))
}, { immediate: true })

// Update order recursively
function updateOrder(items: MenuItem[], startOrder = 0): MenuItem[] {
  return items.map((item: MenuItem, index: number) => ({
    ...item,
    order: startOrder + index,
    children: item.children ? updateOrder(item.children, 0) : undefined
  }))
}

// Handle drag end - emit updated menu
function onDragEnd() {
  const updatedMenu = updateOrder(localMenu.value)
  emit('update', updatedMenu)
}

// Toggle folder expansion
function toggleFolder(folderId: string) {
  if (expandedFolders.value.has(folderId)) {
    expandedFolders.value.delete(folderId)
  } else {
    expandedFolders.value.add(folderId)
  }
}

// Check if folder is expanded
function isFolderExpanded(folderId: string): boolean {
  return expandedFolders.value.has(folderId)
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
  if (!props.appSlug) return
  
  // Use slug for navigation
  const basePath = `/apps/${props.appSlug}`
  navigateTo(`${basePath}/${item.type}s/${item.slug}`)
}

const currentParentFolderId = ref<string | null>(null)

// Handle dropdown command
function handleCreateCommand(command: string) {
  console.log('🎯 handleCreateCommand - command:', command, 'currentParentFolderId:', currentParentFolderId.value)
  
  const type = command as 'folder' | 'table' | 'view' | 'dashboard'
  
  if (type === 'folder') {
    showCreateFolderDialog.value = true
  } else if (type === 'dashboard') {
    showCreateDashboardDialog.value = true
  } else {
    emit('create', type)
  }
}

// Handle folder creation
function handleCreateFolder(data: { name: string; description?: string }) {
  console.log('🔨 handleCreateFolder called with:', data)
  console.log('📋 Current localMenu before creation:', JSON.stringify(localMenu.value))
  
  // Collect all existing slugs to ensure uniqueness
  const collectSlugs = (items: MenuItem[]): string[] => {
    const slugs: string[] = []
    for (const item of items) {
      if (item.slug) {
        slugs.push(item.slug)
      }
      if (item.children) {
        slugs.push(...collectSlugs(item.children))
      }
    }
    return slugs
  }
  
  const existingSlugs = collectSlugs(localMenu.value)
  const slug = generateUniqueSlug(data.name, existingSlugs)
  
  console.log('🏷️ Generated slug:', slug)
  
  const newFolder: MenuItem = {
    id: nanoid(),
    label: data.name,
    slug: slug,
    type: 'folder',
    description: data.description,
    children: [],
    order: 0
  }
  
  console.log('📁 New folder object:', JSON.stringify(newFolder), currentParentFolderId.value)
  
  console.log('🔍 Checking currentParentFolderId:', currentParentFolderId.value)
  
  // If creating in a parent folder, add to its children
  if (currentParentFolderId.value) {
    console.log('📂 Adding to parent folder:', currentParentFolderId.value)
    
    const addToFolder = (items: MenuItem[]): boolean => {
      for (const item of items) {
        if (item.type === 'folder' && item.id === currentParentFolderId.value) {
          if (!item.children) item.children = []
          newFolder.order = item.children.length
          item.children.push(newFolder)
          // Expand the parent folder
          expandedFolders.value.add(item.id)
          console.log('✅ Added to parent folder successfully')
          return true
        }
        if (item.children && addToFolder(item.children)) {
          return true
        }
      }
      return false
    }
    
    const added = addToFolder(localMenu.value)
    if (!added) {
      console.error('❌ Failed to find parent folder with id:', currentParentFolderId.value)
    }
  } else {
    // Add to root level
    console.log('📌 Adding to root level')
    newFolder.order = localMenu.value.length
    localMenu.value.push(newFolder)
    console.log('📋 localMenu after push:', JSON.stringify(localMenu.value))
  }
  
  // Always reset parent folder ID after creation
  currentParentFolderId.value = null
  
  console.log('📋 localMenu after push:', JSON.stringify(localMenu.value))
  
  const updatedMenu = updateOrder(localMenu.value)
  console.log('📋 updatedMenu after updateOrder:', JSON.stringify(updatedMenu))
  
  localMenu.value = updatedMenu
  emit('update', updatedMenu)
  
  console.log('✅ Emitted update event with menu:', JSON.stringify(updatedMenu))
  
  ElMessage.success(`Folder "${data.name}" created successfully`)
}

// Handle dashboard creation
function handleCreateDashboard(data: { name: string; description?: string }) {
  console.log('🔨 handleCreateDashboard called with:', data)
  
  // Collect all existing slugs to ensure uniqueness
  const collectSlugs = (items: MenuItem[]): string[] => {
    const slugs: string[] = []
    for (const item of items) {
      if (item.slug) {
        slugs.push(item.slug)
      }
      if (item.children) {
        slugs.push(...collectSlugs(item.children))
      }
    }
    return slugs
  }
  
  const existingSlugs = collectSlugs(localMenu.value)
  const slug = generateUniqueSlug(data.name, existingSlugs)
  
  const newDashboard: MenuItem = {
    id: nanoid(),
    label: data.name,
    slug: slug,
    type: 'dashboard',
    description: data.description,
    itemId: nanoid(), // Temporary ID until actual dashboard is created
    order: 0
  }
  
  console.log('📊 New dashboard object:', JSON.stringify(newDashboard), currentParentFolderId.value)
  console.log('🔍 Checking currentParentFolderId:', currentParentFolderId.value)
  
  // If creating in a parent folder, add to its children
  if (currentParentFolderId.value) {
    console.log('📂 Adding to parent folder:', currentParentFolderId.value)
    
    const addToFolder = (items: MenuItem[]): boolean => {
      for (const item of items) {
        if (item.type === 'folder' && item.id === currentParentFolderId.value) {
          if (!item.children) item.children = []
          newDashboard.order = item.children.length
          item.children.push(newDashboard)
          // Expand the parent folder
          expandedFolders.value.add(item.id)
          console.log('✅ Added to parent folder successfully')
          return true
        }
        if (item.children && addToFolder(item.children)) {
          return true
        }
      }
      return false
    }
    
    const added = addToFolder(localMenu.value)
    if (!added) {
      console.error('❌ Failed to find parent folder with id:', currentParentFolderId.value)
    }
  } else {
    // Add to root level
    console.log('📌 Adding to root level')
    newDashboard.order = localMenu.value.length
    localMenu.value.push(newDashboard)
  }
  
  // Always reset parent folder ID after creation
  currentParentFolderId.value = null
  
  const updatedMenu = updateOrder(localMenu.value)
  localMenu.value = updatedMenu
  emit('update', updatedMenu)
  
  ElMessage.success(`Dashboard "${data.name}" created successfully`)
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
      <el-dropdown trigger="click" @command="handleCreateCommand">
        <button class="add-btn" @click="currentParentFolderId = null">
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
    </div>
    
    <!-- Menu Items -->
    <div class="menu-items">
      <div v-if="!localMenu || localMenu.length === 0" class="empty-state">
        <Icon name="lucide:inbox" size="32" />
        <p>No items yet</p>
        <p class="empty-hint">Click the + button above to create your first item</p>
      </div>
      
      <!-- Draggable Menu Items -->
      <draggable
        v-else
        v-model="localMenu"
        :animation="200"
        handle=".drag-handle"
        @end="onDragEnd"
        class="draggable-list"
        item-key="id"
        group="menu-items"
      >
        <template #item="{ element: item }">
          <div class="menu-item-wrapper">
            <div
              class="menu-item"
              :class="{ 
                active: isItemActive(item),
                folder: item.type === 'folder',
                expanded: isFolderExpanded(item.id)
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
              
              <!-- Add Child Button (for folders, on hover) -->
              <el-dropdown 
                v-if="item.type === 'folder'"
                trigger="click"
                @command="handleCreateCommand"
                class="add-child-dropdown"
              >
                <button 
                  class="add-child-btn" 
                  @click.stop="currentParentFolderId = item.id"
                >
                  <Icon name="lucide:plus"  />
                </button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="folder">
                      <Icon name="lucide:folder" />
                      <span>Folder</span>
                    </el-dropdown-item>
                    <el-dropdown-item command="table">
                      <Icon name="lucide:table"  />
                      <span>Table</span>
                    </el-dropdown-item>
                    <el-dropdown-item command="view">
                      <Icon name="lucide:eye"  />
                      <span>View</span>
                    </el-dropdown-item>
                    <el-dropdown-item command="dashboard">
                      <Icon name="lucide:layout-dashboard"  />
                      <span>Dashboard</span>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              
              <!-- Folder Toggle (if folder) -->
              <button 
                v-if="item.type === 'folder'" 
                class="folder-toggle"
                @click.stop="toggleFolder(item.id)"
              >
                <Icon 
                  :name="isFolderExpanded(item.id) ? 'lucide:chevron-down' : 'lucide:chevron-right'" 
                  size="14" 
                />
              </button>
            </div>
            
            <!-- Folder Children (nested draggable) -->
            <div 
              v-if="item.type === 'folder' && isFolderExpanded(item.id)" 
              class="folder-children"
            >
              <draggable
                v-model="item.children"
                :animation="200"
                handle=".drag-handle"
                @end="onDragEnd"
                class="draggable-list"
                item-key="id"
                group="menu-items"
              >
                <template #item="{ element: childItem }">
                  <div class="menu-item-wrapper">
                    <div
                      class="menu-item"
                      :class="{ 
                        active: isItemActive(childItem),
                        folder: childItem.type === 'folder',
                        expanded: isFolderExpanded(childItem.id),
                        'is-child': true
                      }"
                    >
                      <!-- Drag Handle -->
                      <div class="drag-handle">
                        <Icon name="lucide:grip-vertical" size="14" />
                      </div>
                      
                      <!-- Item Content -->
                      <div class="item-content" @click="navigateToItem(childItem)">
                        <Icon 
                          :name="getIcon(childItem.type)" 
                          size="18" 
                        />
                        <span class="item-label">{{ childItem.label }}</span>
                      </div>
                      
                      <!-- Add Child Button (for folders, on hover) -->
                      <el-dropdown 
                        v-if="childItem.type === 'folder'"
                        trigger="click"
                        @command="handleCreateCommand"
                        class="add-child-dropdown"
                      >
                        <button 
                          class="add-child-btn" 
                          @click.stop="currentParentFolderId = childItem.id"
                        >
                          <Icon name="lucide:plus" size="14" />
                        </button>
                        <template #dropdown>
                          <el-dropdown-menu>
                            <el-dropdown-item command="folder">
                              <Icon name="lucide:folder" size="14" />
                              <span>Folder</span>
                            </el-dropdown-item>
                            <el-dropdown-item command="table">
                              <Icon name="lucide:table" size="14" />
                              <span>Table</span>
                            </el-dropdown-item>
                            <el-dropdown-item command="view">
                              <Icon name="lucide:eye" size="14" />
                              <span>View</span>
                            </el-dropdown-item>
                            <el-dropdown-item command="dashboard">
                              <Icon name="lucide:layout-dashboard" size="14" />
                              <span>Dashboard</span>
                            </el-dropdown-item>
                          </el-dropdown-menu>
                        </template>
                      </el-dropdown>
                      
                      <!-- Folder Toggle (if folder) -->
                      <button 
                        v-if="childItem.type === 'folder'" 
                        class="folder-toggle"
                        @click.stop="toggleFolder(childItem.id)"
                      >
                        <Icon 
                          :name="isFolderExpanded(childItem.id) ? 'lucide:chevron-down' : 'lucide:chevron-right'" 
                          size="14" 
                        />
                      </button>
                    </div>
                    
                    <!-- Nested Folder Children (recursive) -->
                    <div 
                      v-if="childItem.type === 'folder' && isFolderExpanded(childItem.id)" 
                      class="folder-children"
                    >
                      <draggable
                        v-model="childItem.children"
                        :animation="200"
                        handle=".drag-handle"
                        @end="onDragEnd"
                        class="draggable-list"
                        item-key="id"
                        group="menu-items"
                      >
                        <template #item="{ element: nestedItem }">
                          <div
                            class="menu-item"
                            :class="{ 
                              active: isItemActive(nestedItem),
                              'is-child': true
                            }"
                          >
                            <!-- Drag Handle -->
                            <div class="drag-handle">
                              <Icon name="lucide:grip-vertical" size="14" />
                            </div>
                            
                            <!-- Item Content -->
                            <div class="item-content" @click="navigateToItem(nestedItem)">
                              <Icon 
                                :name="getIcon(nestedItem.type)" 
                                size="18" 
                              />
                              <span class="item-label">{{ nestedItem.label }}</span>
                            </div>
                          </div>
                        </template>
                      </draggable>
                    </div>
                  </div>
                </template>
              </draggable>
            </div>
          </div>
        </template>
      </draggable>
    </div>
    
    <!-- Create Folder Dialog -->
    <AppCreateFolderDialog
      v-model:visible="showCreateFolderDialog"
      @confirm="handleCreateFolder"
    />
    
    <!-- Create Dashboard Dialog -->
    <AppCreateDashboardDialog
      v-model:visible="showCreateDashboardDialog"
      @confirm="handleCreateDashboard"
    />
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
  
  .menu-items {
    display: flex;
    flex-direction: column;
    gap: var(--app-space-xxs);
    padding-inline: var(--app-space-xs);
    .draggable-list {
      display: flex;
      flex-direction: column;
      gap: var(--app-space-xxs);
      min-height: 20px; // Allow drop into empty lists
    }
    
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
      }
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
      
      .empty-hint {
        font-size: var(--app-font-size-xs);
        color: var(--app-text-color-secondary);
      }
    }
    
    .menu-item {
      display: flex;
      align-items: center;
      gap: var(--app-space-xxs);
      padding:  var(--app-space-xs) var(--app-space-xs) var(--app-space-xs) var(--app-space-s);
      border-radius: var(--app-border-radius-s);
      color: var(--app-text-color-secondary);
      transition: all 0.2s;
      user-select: none;
      background: transparent;
      
      &.is-child {
        font-size: 13px;
      }
      
      &.expanded {
        .folder-toggle {
          transform: rotate(0deg);
        }
      }
      
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
      
      .add-child-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: var(--app-font-size-s);
        border: none;
        background: transparent;
        color: var(--app-text-color-placeholder);
        cursor: pointer;
        border-radius: var(--app-border-radius-s);
        transition: all 0.2s;
        flex-shrink: 0;
        opacity: 0;
        
        &:hover {
          background: var(--app-fill-color-light);
          color: var(--app-primary-color);
        }
      }
      
      &:hover .add-child-btn {
        opacity: 1;
      }
      
      .add-child-dropdown {
        display: flex;
        align-items: center;
        flex-shrink: 0;
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
  }
}

// Dropdown icon styling
.dropdown-icon {
  margin-right: var(--app-space-xs);
  vertical-align: middle;
}

// Dropdown menu item styles
:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: var(--app-space-xs);
  padding: var(--app-space-xs) var(--app-space-m);
  
  span {
    font-size: var(--app-font-size-s);
  }
}
</style>

