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
const highlightedItems = ref<Set<string>>(new Set())
const justCreatedItemId = ref<string | null>(null)
const currentParentFolderId = ref<string | null>(null)

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

// Handle drag end - emit updated menu with highlight animation
function onDragEnd() {
  const updatedMenu = updateOrder(localMenu.value)
  
  // Highlight all items briefly to show reorder
  const allItemIds = new Set<string>()
  const collectIds = (items: MenuItem[]) => {
    items.forEach(item => {
      allItemIds.add(item.id)
      if (item.children) {
        item.children.forEach(child => {
          allItemIds.add(child.id)
        })
      }
    })
  }
  collectIds(updatedMenu)
  highlightedItems.value = allItemIds
  setTimeout(() => {
    highlightedItems.value.clear()
  }, 1200)
  
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
  const itemPath = `${basePath}/${item.type}s/${item.slug}`
  return route.path === itemPath || route.path.startsWith(itemPath + '/')
}

// Check if any child of a folder is active (recursive)
function hasActiveChild(item: MenuItem): boolean {
  if (item.type !== 'folder' || !item.children || item.children.length === 0) {
    return false
  }
  
  for (const child of item.children) {
    if (isItemActive(child)) {
      return true
    }
    // Recursively check nested folders
    if (child.type === 'folder' && hasActiveChild(child)) {
      return true
    }
  }
  
  return false
}

// Navigate to item
function navigateToItem(item: MenuItem) {
  if (!props.appSlug) return
  
  const basePath = `/apps/${props.appSlug}`
  navigateTo(`${basePath}/${item.type}s/${item.slug}`)
}

// Handle create command
function handleCreate(type: 'folder' | 'table' | 'view' | 'dashboard', parentId?: string | null) {
  currentParentFolderId.value = parentId || null
  
  if (type === 'folder') {
    showCreateFolderDialog.value = true
  } else if (type === 'dashboard') {
    showCreateDashboardDialog.value = true
  } else {
    emit('create', type)
  }
}

// Collect all existing slugs for uniqueness check
function collectSlugs(items: MenuItem[]): string[] {
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

// Add item to folder or root
function addItemToMenu(newItem: MenuItem) {
  if (currentParentFolderId.value) {
    const addToFolder = (items: MenuItem[]): boolean => {
      for (const item of items) {
        if (item.type === 'folder' && item.id === currentParentFolderId.value) {
          if (!item.children) item.children = []
          newItem.order = item.children.length
          item.children.push(newItem)
          expandedFolders.value.add(item.id)
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
    newItem.order = localMenu.value.length
    localMenu.value.push(newItem)
  }
  
  currentParentFolderId.value = null
}

// Handle folder creation
function handleCreateFolder(data: { name: string; description?: string }) {
  const existingSlugs = collectSlugs(localMenu.value)
  const slug = generateUniqueSlug(data.name, existingSlugs)
  
  const newFolder: MenuItem = {
    id: nanoid(),
    label: data.name,
    slug: slug,
    type: 'folder',
    description: data.description,
    children: [],
    order: 0
  }
  
  addItemToMenu(newFolder)
  
  const updatedMenu = updateOrder(localMenu.value)
  localMenu.value = updatedMenu
  emit('update', updatedMenu)
  
  // Highlight and navigate to new folder
  justCreatedItemId.value = newFolder.id
  highlightedItems.value.add(newFolder.id)
  setTimeout(() => {
    highlightedItems.value.delete(newFolder.id)
    justCreatedItemId.value = null
  }, 1500)
  
  nextTick(() => {
    navigateToItem(newFolder)
  })
  
  ElMessage.success(`Folder "${data.name}" created successfully`)
}

// Handle dashboard creation
function handleCreateDashboard(data: { name: string; description?: string }) {
  const existingSlugs = collectSlugs(localMenu.value)
  const slug = generateUniqueSlug(data.name, existingSlugs)
  
  const newDashboard: MenuItem = {
    id: nanoid(),
    label: data.name,
    slug: slug,
    type: 'dashboard',
    description: data.description,
    itemId: nanoid(),
    order: 0
  }
  
  addItemToMenu(newDashboard)
  
  const updatedMenu = updateOrder(localMenu.value)
  localMenu.value = updatedMenu
  emit('update', updatedMenu)
  
  // Highlight new dashboard
  justCreatedItemId.value = newDashboard.id
  highlightedItems.value.add(newDashboard.id)
  setTimeout(() => {
    highlightedItems.value.delete(newDashboard.id)
    justCreatedItemId.value = null
  }, 1500)
  
  nextTick(() => {
    console.log('📊 Navigate to dashboard:', newDashboard.slug)
  })
  
  ElMessage.success(`Dashboard "${data.name}" created successfully`)
}
</script>

<template>
  <div class="app-menu">
    <div class="menu-header">
      <span class="menu-title">Menu</span>
      <AppMenuAddButton @create="handleCreate" />
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
          <AppMenuRecursiveItem
            :item="item"
            :app-slug="appSlug"
            :is-active="isItemActive"
            :has-active-child="hasActiveChild"
            :is-expanded="isFolderExpanded"
            :is-highlighted="(id) => highlightedItems.has(id)"
            :is-just-created="(id) => justCreatedItemId === id"
            @navigate="navigateToItem"
            @toggle="toggleFolder"
            @create="handleCreate"
            @drag-end="onDragEnd"
          />
        </template>
      </draggable>
    </div>
    
    <!-- Create Folder Dialog -->
    <AppFolderCreateDialog
      v-model:visible="showCreateFolderDialog"
      @confirm="handleCreateFolder"
    />
    
    <!-- Create Dashboard Dialog -->
    <AppDashboardCreateDialog
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
      min-height: 20px;
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
  }
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

