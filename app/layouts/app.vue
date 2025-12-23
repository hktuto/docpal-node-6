<script setup lang="ts">
import type { WorkspaceContext } from '~/composables/useWorkspaceContext'
import { WorkspaceContextKey } from '~/composables/useWorkspaceContext'
import type { MenuItem } from '#shared/types/db'
import {useDebounceFn} from '@vueuse/core'

const isDesktopMode= useIsDesktopMode

const route = useRoute()
const router = useRouter()
const workspaceSlug = computed(() => route.params.workspaceSlug as string)
const expandState = ref(false)

// Fetch app data
const { data: appResponse, pending, refresh: refreshApp, error } = await useApi<Workspace>(() => `/api/workspaces/${workspaceSlug.value}`, {
  key: `app-${workspaceSlug.value}`,
  watch: [workspaceSlug]
})
const app = computed(() => appResponse.value?.data)
// ==================== App Context Methods ====================

// Update app
const updateApp = useDebounceFn(updateAppApi, 500)

async function updateAppApi(data: Partial<Pick<Workspace, 'name' | 'icon' | 'description' | 'menu'>>) {
  const {$api} = useNuxtApp()
  try {
    const response = await $api<Workspace>(`/api/workspaces/${workspaceSlug.value}`, {
      method: 'PUT',
      body: data
    })
    const updated = response.data
    
    await refreshApp()
    return updated
  } catch (error) {
    console.error('Failed to update app:', error)
    return null
  }
}

// Delete app
async function deleteApp(): Promise<boolean> {
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
    await updateApp({ menu: newMenu })
  } catch (error) {
    console.error('Failed to update menu:', error)
  }
}

// Navigation helpers
function getAppPath(subPath?: string): string {
  const base = `/workspaces/${workspaceSlug.value}`
  return subPath ? `${base}/${subPath}` : base
}

async function navigateToApp() {
  await router.push(getAppPath())
}

async function navigateToSettings() {
  await router.push(getAppPath('settings'))
}

// Refresh current page
function refreshCurrentPage() {
  router.go(0)
}

// Provide app context to all child components
const appContext: WorkspaceContext = {
  // Data
  app: computed(() => app.value),
  workspaceSlug: computed(() => workspaceSlug.value),
  appId: computed(() => app.value?.id),
  appName: computed(() => app.value?.name || ''),
  
  // State
  pending,
  
  // Methods
  refreshApp,
  updateApp,
  deleteApp,
  updateMenu,
  
  // Navigation
  navigateToApp,
  navigateToSettings,
  getAppPath,
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
    { label: app.value?.name || 'Loading...', url: `/workspaces/${workspaceSlug.value}`, clickable: true },
  ]
  
  // If not on app home, find current item in menu
  if (route.path !== `/workspaces/${workspaceSlug.value}`) {
    const pathParts = route.path.replace(`/workspaces/${workspaceSlug.value}/`, '').split('/')
    const type = pathParts[0] // e.g., "tables", "folders", "dashboards"
    const slug = pathParts[1] // e.g., "contacts", "my-folder"
    
    if (slug && app.value?.menu) {
      // Find the item and its parent path in the menu
      const menuPath = findMenuItemPath(app.value.menu, slug)
      
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
      App not found
    </div>
    
    <div v-else-if="app" class="appContainer" :class="{ 'desktop-mode': isDesktopMode }">
      <aside v-if="!isDesktopMode" class="sidebar">
         <CommonMenu v-model:expandState="expandState" :menu="app.menu || []" />
       </aside>
       <main :class="{ 'no-sidebar': isDesktopMode }">
        <el-splitter class="app-splitter">
          <el-splitter-panel size="260px" :min="200" :max="500">
            <!-- Left Sidebar: Workspace Menu -->
            <aside class="app-sidebar">
              <!-- App Header -->
              <div v-loading="pending" class="app-header">
                <div class="app-icon">
                  <Icon v-if="app.icon" :name="app.icon" size="24" />
                  <Icon v-else name="lucide:box" size="24" />
                </div>
                <div v-if="app.name" class="app-info">
                  <h2 class="app-name">{{ app.name }}</h2>
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
                :menu="app.menu || []"
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
    gap: var(--app-space-l);
    padding: var(--app-space-m) var(--app-space-l);
    border-bottom: 1px solid var(--app-border-color);
    background: var(--app-bg-color);
    flex-shrink: 0;
    height: var(--app-header-height);
    .breadcrumb {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: var(--app-space-s);
      font-size: var(--app-font-size-s);
      
      .breadcrumb-item {
        color: var(--app-text-color-secondary);
        white-space: nowrap;
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

