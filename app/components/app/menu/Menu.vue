<script setup lang="ts">
import type { MenuItem, DataTable, DataTableView } from '#shared/types/db'
import draggable from 'vuedraggable'
import { nanoid } from 'nanoid'
import { generateUniqueSlug } from '#shared/utils/slug'

const props = defineProps<{
  workspaceSlug: string
  menu: MenuItem[]
}>()

const emit = defineEmits<{
  'create': [type: 'folder' | 'table' | 'view' | 'dashboard']
  'update': [menu: MenuItem[]]
}>()

const route = useRoute()
const showCreateFolderDialog = ref(false)
const showCreateDashboardDialog = ref(false)
const showCreateTableDialog = ref(false)
const showSelectTableDialog = ref(false)
const showRenameDialog = ref(false)
const renamingItem = ref<MenuItem | null>(null)
const expandedFolders = ref<Set<string>>(new Set())
const highlightedItems = ref<Set<string>>(new Set())
const justCreatedItemId = ref<string | null>(null)
const currentParentFolderId = ref<string | null>(null)

const {navigateTo} = useSmartNavigation()
// Local copy of menu for drag and drop
const localMenu = ref<MenuItem[]>([])

// Watch for menu prop changes
watch(() => props.menu, (newMenu) => {
  localMenu.value = JSON.parse(JSON.stringify(newMenu || []))
  // Expand all folders by default
  expandAllFolders()
}, { immediate: true })

// Watch route changes (no need to expand again since all are already expanded)
watch(() => route.path, () => {
  // Folders remain expanded
})

// Expand all folders recursively
function expandAllFolders() {
  const collectAllFolderIds = (items: MenuItem[]) => {
    items.forEach(item => {
      if (item.type === 'folder') {
        expandedFolders.value.add(item.id)
        // Recursively expand nested folders
        if (item.children && item.children.length > 0) {
          collectAllFolderIds(item.children)
        }
      }
    })
  }
  
  if (localMenu.value.length > 0) {
    collectAllFolderIds(localMenu.value)
  }
}

// Legacy function - kept for compatibility but no longer used
function expandActiveFolders() {
  const expandParentFolders = (items: MenuItem[], parents: string[] = []): boolean => {
    for (const item of items) {
      const currentParents = [...parents, item.id]
      
      // Check if this item is active
      if (isItemActive(item)) {
        // Expand all parent folders
        parents.forEach(parentId => {
          expandedFolders.value.add(parentId)
        })
        return true
      }
      
      // If it's a folder, recursively check children
      if (item.type === 'folder' && item.children && item.children.length > 0) {
        if (expandParentFolders(item.children, currentParents)) {
          // Expand this folder too if it contains an active item
          expandedFolders.value.add(item.id)
          return true
        }
      }
    }
    return false
  }
  
  if (localMenu.value.length > 0) {
    expandParentFolders(localMenu.value)
  }
}

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
  const basePath = `/workspaces/${props.workspaceSlug}`
  
  // Special handling for view items (need table slug in path)
  if (item.type === 'view' && item.tableSlug && item.slug) {
    const viewPath = `${basePath}/table/${item.tableSlug}/view/${item.slug}`
    return route.path === viewPath || route.path.startsWith(viewPath + '/')
  }
  
  // Standard handling for other item types
  const itemPath = `${basePath}/${item.type}/${item.slug}`
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
const basePath = computed(() => `/workspaces/${props.workspaceSlug}`)
function navigateToItem(item: MenuItem, event?: MouseEvent) {
  if (!props.workspaceSlug) return
  
  // If it's a folder, also expand it when clicking
  if (item.type === 'folder') {
    expandedFolders.value.add(item.id)
  }
  
  // Special handling for view items (need both table and view slug)
  if (item.type === 'view' && item.tableSlug && item.slug) {
    navigateTo(`${basePath.value}/table/${item.tableSlug}/view/${item.slug}`, event)
    return
  }
  
  navigateTo(`${basePath.value}/${item.type}/${item.slug}`, event)
}

// Handle create command
function handleCreate(type: 'folder' | 'table' | 'view' | 'dashboard', parentId?: string | null) {
  currentParentFolderId.value = parentId || null
  
  if (type === 'folder') {
    showCreateFolderDialog.value = true
  } else if (type === 'dashboard') {
    showCreateDashboardDialog.value = true
  } else if (type === 'table') {
    showCreateTableDialog.value = true
  } else if (type === 'view') {
    showSelectTableDialog.value = true
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

// Handle table creation
function handleCreateTable(table: any) {
  const newTable: MenuItem = {
    id: nanoid(),
    label: table.name,
    slug: table.slug,
    type: 'table',
    description: table.description,
    itemId: table.id,
    order: 0
  }
  
  addItemToMenu(newTable)
  
  const updatedMenu = updateOrder(localMenu.value)
  localMenu.value = updatedMenu
  emit('update', updatedMenu)
  
  // Highlight new table
  justCreatedItemId.value = newTable.id
  highlightedItems.value.add(newTable.id)
  setTimeout(() => {
    highlightedItems.value.delete(newTable.id)
    justCreatedItemId.value = null
  }, 1500)
  
  nextTick(() => {
    navigateToItem(newTable)
  })
}

// Handle table selection for view creation
function handleSelectTableForView(tableSlug: string) {
  // Navigate to table page with create view query param
  // The table page will detect this and open the ViewSettingsDialog
  navigateTo(`${basePath.value}/table/${tableSlug}?createView=true`)
}

// ============================================
// MENU ITEM ACTIONS
// ============================================

// Rename item
function handleRenameItem(item: MenuItem) {
  renamingItem.value = item
  showRenameDialog.value = true
}

// Confirm rename
function handleRenameConfirm(newName: string) {
  if (!renamingItem.value || newName === renamingItem.value.label) return
  
  // Find and update item in menu
  const updateItemName = (items: MenuItem[]): boolean => {
    for (const menuItem of items) {
      if (menuItem.id === renamingItem.value!.id) {
        menuItem.label = newName
        return true
      }
      if (menuItem.children && updateItemName(menuItem.children)) {
        return true
      }
    }
    return false
  }
  
  if (updateItemName(localMenu.value)) {
    emit('update', localMenu.value)
    ElMessage.success('Item renamed successfully')
  }
}

// Duplicate view
async function handleDuplicateItem(item: MenuItem) {
  if (item.type !== 'view' || !item.viewId || !item.tableSlug) {
    ElMessage.error('Only views can be duplicated')
    return
  }
  
  try {
    const { $api } = useNuxtApp()
    const response = await $api<SuccessResponse<DataTableView>>(
      `/api/workspaces/${props.workspaceSlug}/tables/${item.tableSlug}/views/${item.slug}/duplicate`,
      {
        method: 'POST',
        body: {
          name: `${item.label} (Copy)`
        }
      }
    )
    
    if (response.data) {
      ElMessage.success('View duplicated successfully')
      // Navigate to the duplicated view
      await navigateTo(`${basePath.value}/table/${item.tableSlug}#view-${response.data.slug}`)
    }
  } catch (error: any) {
    console.error('Error duplicating view:', error)
    ElMessage.error('Failed to duplicate view')
  }
}

// Unpin item from menu
function handleUnpinItem(item: MenuItem) {
  // Remove item from menu
  const removeItem = (items: MenuItem[], itemId: string): MenuItem[] => {
    return items.filter(menuItem => {
      if (menuItem.id === itemId) {
        return false
      }
      if (menuItem.children) {
        menuItem.children = removeItem(menuItem.children, itemId)
      }
      return true
    })
  }
  
  localMenu.value = removeItem(localMenu.value, item.id)
  emit('update', localMenu.value)
  ElMessage.success('Item unpinned from menu')
}

// Count all children in a folder (recursively)
function countFolderChildren(item: MenuItem): number {
  if (!item.children || item.children.length === 0) return 0
  
  let count = item.children.length
  
  // Recursively count children of sub-folders
  for (const child of item.children) {
    if (child.type === 'folder' && child.children) {
      count += countFolderChildren(child)
    }
  }
  
  return count
}

// Flatten all children from a folder (including nested folders) to a single level
function flattenFolderChildren(item: MenuItem): MenuItem[] {
  if (!item.children || item.children.length === 0) return []
  
  const flattened: MenuItem[] = []
  
  for (const child of item.children) {
    // Add the child
    flattened.push(child)
    
    // If child is a folder, recursively flatten its children
    if (child.type === 'folder' && child.children) {
      const nestedChildren = flattenFolderChildren(child)
      flattened.push(...nestedChildren)
      // Clear the folder's children since we're flattening
      child.children = []
    }
  }
  
  return flattened
}

// Delete item
async function handleDeleteItem(item: MenuItem) {
  try {
    let confirmMessage = `Are you sure you want to delete "${item.label}"?`
    let confirmTitle = 'Delete Item'
    
    // Special handling for folders with children
    if (item.type === 'folder') {
      const childCount = countFolderChildren(item)
      
      if (childCount > 0) {
        confirmMessage = `Delete folder "${item.label}"?\n\nThis folder contains ${childCount} item(s) (including nested items).\nAll items will be moved to the root level.`
        confirmTitle = 'Delete Folder'
      } else {
        confirmMessage = `Delete empty folder "${item.label}"?`
        confirmTitle = 'Delete Folder'
      }
    } else {
      confirmMessage = `Are you sure you want to delete "${item.label}"? This action cannot be undone.`
    }
    
    await ElMessageBox.confirm(
      confirmMessage,
      confirmTitle,
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
    
    const { $api } = useNuxtApp()
    
    // Delete based on item type
    if (item.type === 'folder') {
      // Move all children to root before deleting folder
      if (item.children && item.children.length > 0) {
        const flattenedChildren = flattenFolderChildren(item)
        localMenu.value.push(...flattenedChildren)
      }
      
      // Remove folder from menu
      handleUnpinItem(item)
      ElMessage.success(`Folder deleted. ${item.children?.length || 0} item(s) moved to root.`)
      return
    } else if (item.type === 'view' && item.viewId && item.tableSlug) {
      await $api(
        `/api/workspaces/${props.workspaceSlug}/tables/${item.tableSlug}/views/${item.slug}`,
        { method: 'DELETE' as any }
      )
      ElMessage.success('View deleted successfully')
      // Menu will be updated by the delete API
    } else if (item.type === 'table') {
      await $api(
        `/api/workspaces/${props.workspaceSlug}/tables/${item.slug}`,
        { method: 'DELETE' as any }
      )
      ElMessage.success('Table deleted successfully')
      // Manually remove from menu
      handleUnpinItem(item)
    } else {
      // For other types, just remove from menu
      handleUnpinItem(item)
      ElMessage.success('Item removed from menu')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Error deleting item:', error)
      ElMessage.error('Failed to delete item')
    }
  }
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
            :workspace-slug="workspaceSlug"
            :is-active="isItemActive"
            :has-active-child="hasActiveChild"
            :is-expanded="isFolderExpanded"
            :is-highlighted="(id) => highlightedItems.has(id)"
            :is-just-created="(id) => justCreatedItemId === id"
            :base-path="basePath"
            @navigate="(item,e) => navigateToItem(item, e)"
            @toggle="toggleFolder"
            @create="handleCreate"
            @drag-end="onDragEnd"
            @rename="handleRenameItem"
            @duplicate="handleDuplicateItem"
            @unpin="handleUnpinItem"
            @delete-item="handleDeleteItem"
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
    
    <!-- Create Table Dialog -->
    <AppTableCreateDialog
      v-model="showCreateTableDialog"
      :workspace-slug="workspaceSlug"
      @created="handleCreateTable"
    />
    
    <!-- Rename Dialog -->
    <AppMenuRenameDialog
      v-model:visible="showRenameDialog"
      :item="renamingItem"
      @confirm="handleRenameConfirm"
    />
    
    <!-- Select Table for View Creation -->
    <AppMenuSelectTableDialog
      v-model:visible="showSelectTableDialog"
      :workspace-slug="workspaceSlug"
      @confirm="handleSelectTableForView"
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

