<script setup lang="ts">
import type { WorkspaceContext } from '~/composables/useWorkspaceContext'
import { WorkspaceContextKey } from '~/composables/useWorkspaceContext'
import type { MenuItem } from '#shared/types/db'
import {useDebounceFn} from '@vueuse/core'

const { isDesktopMode, isMobile } = useDisplayMode()

const route = useRoute()
const router = useRouter()
const workspaceSlug = computed(() => route.params.workspaceSlug as string)
const expandState = ref(false)
const mobileMenuOpen = ref(false)
const mobileWorkspaceMenuOpen = ref(false)

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
  // Close workspace menu if opening main menu
  if (mobileMenuOpen.value) {
    mobileWorkspaceMenuOpen.value = false
  }
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
}

function toggleMobileWorkspaceMenu() {
  mobileWorkspaceMenuOpen.value = !mobileWorkspaceMenuOpen.value
  // Close main menu if opening workspace menu
  if (mobileWorkspaceMenuOpen.value) {
    mobileMenuOpen.value = false
  }
}

function closeMobileWorkspaceMenu() {
  mobileWorkspaceMenuOpen.value = false
}

// Setup desktop shortcuts (will send postMessage to parent if in iframe)
useDesktopShortcuts()

// Close mobile menus when route changes
watch(() => route.path, () => {
  if (isMobile.value) {
    closeMobileMenu()
    closeMobileWorkspaceMenu()
  }
})

// Fetch app data
const { data: appResponse, pending, refresh: refreshWorkspace, error } = await useApi<SuccessResponse<Workspace>>(() => `/api/workspaces/${workspaceSlug.value}`, {
  key: `workspace-${workspaceSlug.value}`,
  watch: [workspaceSlug]
})
const workspace = computed(() => appResponse.value?.data)
// ==================== App Context Methods ====================

// Update app
const updateWorkspace = useDebounceFn(updateWorkspaceApi, 500)

async function updateWorkspaceApi(data: Partial<Pick<Workspace, 'name' | 'icon' | 'description' | 'menu'>>) {
  const {$api} = useNuxtApp()
  try {
    const response = await $api<SuccessResponse<Workspace>>(`/api/workspaces/${workspaceSlug.value}`, {
      method: 'PUT',
      body: data
    })
    const updated = response.data
    
    await refreshWorkspace()
    return updated
  } catch (error) {
    console.error('Failed to update app:', error)
    return null
  }
}

// Delete app
async function deleteWorkspace(): Promise<boolean> {
  const {$api} = useNuxtApp()
  try {
    await $api(`/api/workspaces/${workspaceSlug.value}`, {
      method: 'DELETE'
    })
    return true
  } catch (error) {
    console.error('Failed to delete app:', error)
    return false
  }
}

// Update menu
async function updateMenu(newMenu: any[]) {
  try {
    console.log('🚀 updateMenu calling updateApp with:', JSON.stringify(newMenu))
    await updateWorkspace({ menu: newMenu })
  } catch (error) {
    console.error('Failed to update menu:', error)
  }
}

// Navigation helpers
function getWorkspacePath(subPath?: string): string {
  const base = `/workspaces/${workspaceSlug.value}`
  return subPath ? `${base}/${subPath}` : base
}

async function navigateToWorkspace() {
  await router.push(getWorkspacePath())
}

async function navigateToSettings() {
  await router.push(getWorkspacePath('settings'))
}

// Refresh current page
function refreshCurrentPage() {
  router.go(0)
}

// Provide app context to all child components
const appContext: WorkspaceContext = {
  // Data
  workspace: workspace as ComputedRef<Workspace | null>,
  workspaceSlug: computed(() => workspaceSlug.value),
  workspaceId: computed(() => workspace.value?.id),
  workspaceName: computed(() => workspace.value?.name || ''),
  
  // State
  pending,
  
  // Methods
  refreshWorkspace,
  updateWorkspace,
  deleteWorkspace,
  updateMenu,
  
  // Navigation
  navigateToWorkspace,
  navigateToSettings,
  getWorkspacePath,
}

provide(WorkspaceContextKey, appContext)

// ==================== Menu Handlers ====================

// Handle menu creation
async function handleCreateMenuItem(type: 'folder' | 'table' | 'view' | 'dashboard') {
  console.log('Create:', type)
  // TODO: Navigate to create page or open modal
  // For now, just log
  alert(`Creating ${type} - this will be implemented in next step`)
}

// Handle menu update (drag & drop)
async function handleMenuUpdate(newMenu: any[]) {
  console.log('🎯 handleMenuUpdate received:', JSON.stringify(newMenu))
  await updateMenu(newMenu)
}

// Check if menu item is active
function isMenuActive(itemUrl: string): boolean {
  if (route.path === itemUrl) return true
  if (itemUrl !== `/workspaces/${workspaceSlug.value}` && route.path.startsWith(itemUrl + '/')) return true
  return false
}

// Find menu item and its parents by slug
function findMenuItemPath(items: MenuItem[], targetSlug: string, path: MenuItem[] = []): MenuItem[] | null {
  for (const item of items) {
    const currentPath = [...path, item]
    
    if (item.slug === targetSlug) {
      return currentPath
    }
    
    if (item.children && item.children.length > 0) {
      const found = findMenuItemPath(item.children, targetSlug, currentPath)
      if (found) return found
    }
  }
  
  return null
}

// Breadcrumb built from menu structure
const breadcrumb = computed(() => {
  const crumbs = [
    { label: 'Workspaces', url: '/workspaces', clickable: true },
    { label: workspace.value?.name || 'Loading...', url: `/workspaces/${workspaceSlug.value}`, clickable: true },
  ]
  
  // If not on app home, find current item in menu
  if (route.path !== `/workspaces/${workspaceSlug.value}`) {
    const pathParts = route.path.replace(`/workspaces/${workspaceSlug.value}/`, '').split('/')
    const type = pathParts[0] // e.g., "tables", "folders", "dashboards"
    const slug = pathParts[1] // e.g., "contacts", "my-folder"
    
    if (slug && workspace.value?.menu) {
      // Find the item and its parent path in the menu
      const menuPath = findMenuItemPath(workspace.value.menu, slug)
      
      if (menuPath && menuPath.length > 0) {
        // Add each item in the path as a breadcrumb
        menuPath.forEach((item, index) => {
          const isLast = index === menuPath.length - 1
          crumbs.push({
            label: item.label,
            url: `/workspaces/${workspaceSlug.value}/${item.type}s/${item.slug}`,
            clickable: !isLast // Last item is current page, not clickable
          })
        })
      }
    }
  }
  
  return crumbs
})

// Static nav items
const staticNav = [
  {
    label: 'Overview',
    icon: 'lucide:home',
    url: computed(() => `/workspaces/${workspaceSlug.value}`)
  },
]
</script>

<template>
  <div class="app-layout-wrapper">
    <div v-if="error" class="error">
      Workspace not found
    </div>
    
    <div v-else-if="workspace" class="appContainer" :class="{ 'desktop-mode': isDesktopMode, 'mobile': isMobile }">
      <!-- Mobile: Hamburger button -->
      
      
      <!-- Desktop: Sidebar -->
      <aside v-if="!isDesktopMode && !isMobile" class="sidebar">
         <CommonMenu v-model:expandState="expandState" />
       </aside>
       
       <!-- Mobile: Drawer menu -->
       <CommonMenu 
         v-if="!isDesktopMode && isMobile"
         v-model:expandState="expandState"
         v-model:mobileOpen="mobileMenuOpen"
         @close="closeMobileMenu"
       />
       <main :class="{ 'no-sidebar': isDesktopMode || (isMobile && !mobileMenuOpen && !mobileWorkspaceMenuOpen) }">
        <!-- Mobile: Workspace Sidebar Drawer -->
        <Teleport to="body">
          <Transition name="fade">
            <div 
              v-if="isMobile && mobileWorkspaceMenuOpen" 
              class="mobile-workspace-overlay" 
              @click="closeMobileWorkspaceMenu"
            />
          </Transition>
        </Teleport>
        
        <Transition name="slide">
          <aside 
            v-if="isMobile && mobileWorkspaceMenuOpen"
            class="app-sidebar mobile-sidebar"
          >
            <!-- Mobile: Close button -->
            <div class="mobile-workspace-close">
              <div class="app-header-mobile">
                <div class="app-icon">
                  <Icon v-if="workspace.icon" :name="workspace.icon" size="24" />
                  <Icon v-else name="lucide:box" size="24" />
                </div>
                <div v-if="workspace.name" class="app-info">
                  <h2 class="app-name">{{ workspace.name }}</h2>
                </div>
              </div>
              <button class="mobile-close-btn" @click="closeMobileWorkspaceMenu">
                <Icon name="lucide:x" />
              </button>
            </div>
            
            <!-- Mobile: Action buttons row -->
            <div class="mobile-workspace-actions">
              <button 
                class="mobile-action-button"
                @click="refreshCurrentPage"
                title="Refresh Page"
              >
                <Icon name="lucide:refresh-cw" />
                <span>Refresh</span>
              </button>
              <button 
                class="mobile-action-button"
                @click="navigateToSettings"
                title="App Settings"
              >
                <Icon name="lucide:settings" />
                <span>Settings</span>
              </button>
            </div>
            
            <!-- Dynamic App Menu -->
            <AppMenu
              :workspace-slug="workspaceSlug"
              :menu="workspace.menu || []"
              @create="handleCreateMenuItem"
              @update="handleMenuUpdate"
            />
          </aside>
        </Transition>
        
        <el-splitter class="app-splitter" :class="{ 'mobile': isMobile }">
          <el-splitter-panel 
            v-if="!isMobile"
            size="260px" 
            :min="200" 
            :max="500"
          >
            <!-- Desktop: Workspace Sidebar -->
            <aside class="app-sidebar">
              <!-- App Header -->
              <div v-loading="pending" class="app-header">
                <div class="app-icon">
                  <Icon v-if="workspace.icon" :name="workspace.icon" size="24" />
                  <Icon v-else name="lucide:box" size="24" />
                </div>
                <div v-if="workspace.name" class="app-info">
                  <h2 class="app-name">{{ workspace.name }}</h2>
                  <!-- <p v-if="app.description" class="app-description">{{ app.description }}</p> -->
                </div>
                <div class="actionsButtons">
                  <button 
                    class="app-header-button"
                    @click="refreshCurrentPage"
                    title="Refresh Page"
                  >
                    <Icon name="lucide:refresh-cw" />
                  </button>
                  <button 
                    class="app-header-button"
                    @click="navigateToSettings"
                    title="App Settings"
                  >
                    <Icon name="lucide:settings"  />
                  </button>
                </div>
              </div>
              
              <!-- Dynamic App Menu -->
              <AppMenu
                :workspace-slug="workspaceSlug"
                :menu="workspace.menu || []"
                @create="handleCreateMenuItem"
                @update="handleMenuUpdate"
              />
            </aside>
          </el-splitter-panel>
          
          <el-splitter-panel :min="400">
            <!-- Right Content Area -->
            <div class="app-content">
              <!-- Page Header -->
              <header class="content-header">
                <!-- Mobile: Workspace menu button -->
                 <div class="mobileMenuToggle">
                  <button 
                    v-if="isMobile && !isDesktopMode" 
                    class="mobile-menu-toggle"
                    @click="toggleMobileMenu"
                    aria-label="Toggle menu"
                  >
                    <Icon name="lucide:menu" />
                  </button>
                  <button 
                    v-if="isMobile"
                    class="mobile-workspace-toggle"
                    @click="toggleMobileWorkspaceMenu"
                    aria-label="Toggle workspace menu"
                  >
                    <Icon v-if="workspace.icon" :name="workspace.icon" size="20" />
                    <Icon v-else name="lucide:menu" size="20" />
                  </button>
                </div>
                <!-- Breadcrumb -->
                <div class="breadcrumb">
                  <template v-for="(crumb, index) in breadcrumb" :key="crumb.url">
                    <NuxtLink 
                      v-if="crumb.clickable"
                      :to="crumb.url" 
                      class="breadcrumb-item breadcrumb-link"
                    >
                      {{ crumb.label }}
                    </NuxtLink>
                    <span v-else class="breadcrumb-item breadcrumb-current">
                      {{ crumb.label }}
                    </span>
                    <span v-if="index < breadcrumb.length - 1" class="breadcrumb-separator">
                      /
                    </span>
                  </template>
                </div>
                
                <!-- Teleport Target: Page Actions -->
                <div id="app-page-actions" class="page-actions"></div>
              </header>
              
              <!-- Main Content (pages render here) -->
              <div class="content-body">
                <slot />
              </div>
            </div>
          </el-splitter-panel>
        </el-splitter>
       </main>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.appContainer {
  display: flex;
  height: 100dvh;
  overflow: hidden;
  position: relative;
}

.mobileMenuToggle{
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
  gap: var(--app-space-s);
}
.sidebar {
  
  background: var(--app-bg-color);
  border-right: 1px solid var(--app-border-color);
}

main {
  flex: 1;
  padding: 0;
  height: 100%;
  overflow: hidden;
  position: relative;
}

main.no-sidebar {
  width: 100%;
}

/* Mobile hamburger button */
.mobile-menu-toggle {
  
  background: var(--app-bg-color);
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-border-radius-m);
  padding: var(--app-space-s);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-text-color-primary);
  box-shadow: var(--app-shadow-s);
  transition: all 0.2s;
  
  &:hover {
    background: var(--app-fill-color-light);
    border-color: var(--app-primary-color);
  }
  
  &:active {
    transform: scale(0.95);
  }
}

/* Mobile: Hide splitter, show full-width content */
.appContainer.mobile .app-splitter {
  :deep(.el-splitter__wrapper) {
    flex-direction: column;
  }
  
  :deep(.el-splitter-panel) {
    width: 100% !important;
  }
  
  :deep(.el-splitter__bar) {
    display: none;
  }
}

/* Mobile: Workspace sidebar as drawer */
.app-sidebar.mobile-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 280px;
  max-width: 85vw;
  z-index: 10002;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  background: var(--app-bg-color-page);
  overflow-y: auto;
  height: 100dvh;
  display: flex;
  flex-direction: column;
}

.mobile-workspace-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10001;
  backdrop-filter: blur(2px);
}

.mobile-workspace-close {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--app-space-s) calc(var(--app-space-s) * 2);
  border-bottom: 1px solid var(--app-border-color);
  flex-shrink: 0;
  height: var(--app-header-height);
}

.app-header-mobile {
  display: flex;
  align-items: center;
  gap: var(--app-space-m);
  flex: 1;
  min-width: 0;
  
  .app-icon {
    color: var(--app-primary-color);
    flex-shrink: 0;
  }
  
  .app-info {
    flex: 1;
    min-width: 0;
    
    .app-name {
      margin: 0;
      font-size: var(--app-font-size-l);
      font-weight: 600;
      color: var(--app-text-color-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.mobile-close-btn {
  background: transparent;
  border: none;
  padding: var(--app-space-xs);
  cursor: pointer;
  color: var(--app-text-color-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--app-border-radius-s);
  transition: all 0.2s;
  flex-shrink: 0;
  
  &:hover {
    background: var(--app-fill-color-light);
    color: var(--app-text-color-primary);
  }
}

.mobile-workspace-actions {
  display: flex;
  gap: var(--app-space-s);
  padding: var(--app-space-s) calc(var(--app-space-s) * 2);
  border-bottom: 1px solid var(--app-border-color);
  flex-shrink: 0;
}

.mobile-action-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--app-space-xs);
  padding: var(--app-space-s);
  background: var(--app-bg-color);
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-border-radius-m);
  color: var(--app-text-color-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: var(--app-font-size-s);
  
  &:hover {
    background: var(--app-fill-color-light);
    border-color: var(--app-primary-color);
    color: var(--app-primary-color);
  }
  
  &:active {
    transform: scale(0.98);
  }
  
  span {
    font-weight: 500;
  }
}

.mobile-workspace-toggle {
  background: var(--app-bg-color);
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-border-radius-m);
  padding: var(--app-space-xs);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-text-color-primary);
  transition: all 0.2s;
  flex-shrink: 0;
  margin-right: var(--app-space-s);
  
  &:hover {
    background: var(--app-fill-color-light);
    border-color: var(--app-primary-color);
    color: var(--app-primary-color);
  }
  
  &:active {
    transform: scale(0.95);
  }
}


/* Desktop: Hide mobile-specific styles */
@media (min-width: 768px) {
  .mobile-menu-toggle {
    display: none;
  }
  
  .appContainer.mobile .app-content {
    padding-top: 0;
  }
  
  .app-sidebar.mobile-sidebar {
    position: static;
    box-shadow: none;
    width: 100%;
    max-width: 100%;
    height: 100%;
  }
  
  .mobile-workspace-overlay,
  .mobile-workspace-close,
  .mobile-workspace-actions,
  .mobile-workspace-toggle {
    display: none;
  }
  
  .appContainer.mobile .app-splitter {
    :deep(.el-splitter__wrapper) {
      flex-direction: row;
    }
    
    :deep(.el-splitter-panel) {
      width: auto !important;
    }
    
    :deep(.el-splitter__bar) {
      display: block;
    }
  }
}

.app-splitter {
  height: 100%;
  
  :deep(.el-splitter__wrapper) {
    height: 100%;
  }
  
  :deep(.el-splitter-panel) {
    overflow: hidden;
  }
  
  :deep(.el-splitter__bar) {
    width: 1px;
    background: var(--app-border-color);
    cursor: col-resize;
    position: relative;
    
    &::before {
      content: '';
      position: absolute;
      left: -4px;
      right: -4px;
      top: 0;
      bottom: 0;
      background: transparent;
    }
    
    &:hover {
      background: var(--app-primary-color);
    }
  }
}
.app-layout-wrapper {
  height: 100%;
  
  .loading, .error {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: var(--app-font-size-l);
    color: var(--app-text-color-secondary);
  }
}

.app-layout {
  display: flex;
  height: 100%;
  background: var(--app-bg-color);
}

/* Left Sidebar */
.app-sidebar {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--app-bg-color-page);
  overflow-y: auto;
  
  .app-header {
    position: relative;
    padding: var(--app-space-s) var(--app-space-m);
    border-bottom: 1px solid var(--app-border-color);
    display: flex;
    gap: var(--app-space-m);
    flex-shrink: 0;
    height: var(--app-header-height);
    .app-icon {
      color: var(--app-primary-color);
    }
    
    .app-info {
      flex: 1;
      min-width: 0;
      
      .app-name {
        margin: 0;
        font-size: var(--app-font-size-l);
        font-weight: 600;
        color: var(--app-text-color-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .app-description {
        margin: var(--app-space-xxs) 0 0;
        font-size: var(--app-font-size-s);
        color: var(--app-text-color-secondary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
    .actionsButtons{
      display: flex;
      flex-flow: row wrap;
      align-items: center;
      justify-content: flex-end;
      gap: var(--app-space-xs);
    }
    .app-header-button {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      
      border: none;
      color: var(--app-text-color-secondary);
      cursor: pointer;
      transition: all 0.2s;
      font-size: var(--app-font-size-s);
      padding:0;
      &:hover {
        background: var(--app-fill-color-light);
        color: var(--app-primary-color);
      }
      
      &:active {
        transform: scale(0.95);
      }
    }
  }
  
  .static-nav {
    padding: var(--app-space-m);
    display: flex;
    flex-direction: column;
    gap: var(--app-space-xxs);
    border-bottom: 1px solid var(--app-border-color);
    flex-shrink: 0;
    
    .nav-item {
      display: flex;
      align-items: center;
      gap: var(--app-space-s);
      padding: var(--app-space-s);
      border-radius: var(--app-border-radius-m);
      color: var(--app-text-color-secondary);
      text-decoration: none;
      transition: all 0.2s;
      
      &:hover {
        background: var(--app-fill-color-light);
        color: var(--app-text-color-primary);
      }
      
      &.active {
        background: var(--app-primary-1);
        color: var(--app-primary-color);
        font-weight: 500;
      }
    }
  }
}
.mobile{
  .app-content{

    .content-header{
      padding: var(--app-space-s) var(--app-space-s);
    }
  }
}
/* Right Content Area */
.app-content {
  height: 100%;
  flex: 1;
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  position: relative;
  .content-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--app-space-m);
    padding: var(--app-space-m) var(--app-space-l);
    border-bottom: 1px solid var(--app-border-color);
    background: var(--app-bg-color);
    flex-shrink: 0;
    height: var(--app-header-height);
    overflow: hidden;
    .breadcrumb {
      flex: 1;
      min-width: 0;
    }
    .breadcrumb {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-flow: row nowrap;
      justify-content: flex-start;
      align-content: center;
      align-items: center;
      gap: var(--app-space-xs);
      font-size: var(--app-font-size-s);
      overflow: hidden;
      .breadcrumb-item {
        color: var(--app-text-color-secondary);
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      
      .breadcrumb-link {
        text-decoration: none;
        transition: color 0.2s;
        cursor: pointer;
        
        &:hover {
          color: var(--app-primary-color);
        }
      }
      
      .breadcrumb-current {
        color: var(--app-text-color-primary);
        font-weight: 500;
      }
      
      .breadcrumb-separator {
        color: var(--app-text-color-placeholder);
      }
    }
    
    .page-actions {
      display: flex;
      align-items: center;
      gap: var(--app-space-s);
      flex-shrink: 0;
    }
  }
  
  .content-body {
    height: 100%;
    overflow: auto;
  }
}
</style>

