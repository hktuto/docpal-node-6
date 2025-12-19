<script setup lang="ts">
import type { AppContext } from '~/composables/useAppContext'
import { AppContextKey } from '~/composables/useAppContext'
import {useDebounceFn} from '@vueuse/core'
const route = useRoute()
const router = useRouter()
const appSlug = computed(() => route.params.appSlug as string)
const expandState = ref(false)

// Fetch app data
const { data: app, pending, refresh: refreshApp, error } = await useFetch<App>(() => `/api/apps/${appSlug.value}`, {
  key: `app-${appSlug.value}`,
  watch: [appSlug]
})

// ==================== App Context Methods ====================

// Update app
const updateApp = useDebounceFn(updateAppApi, 500)

async function updateAppApi(data: Partial<Pick<App, 'name' | 'icon' | 'description' | 'menu'>>) {
  try {
    console.log('💾 updateAppApi called with data:', JSON.stringify(data))
    const updated = await $fetch(`/api/apps/${appSlug.value}`, {
      method: 'PUT',
      body: data
    })
    
    await refreshApp()
    return updated as App
  } catch (error) {
    console.error('Failed to update app:', error)
    return null
  }
}

// Delete app
async function deleteApp(): Promise<boolean> {
  try {
    await $fetch(`/api/apps/${appSlug.value}`, {
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
  const base = `/apps/${appSlug.value}`
  return subPath ? `${base}/${subPath}` : base
}

async function navigateToApp() {
  await router.push(getAppPath())
}

async function navigateToSettings() {
  await router.push(getAppPath('settings'))
}

// Provide app context to all child components
const appContext: AppContext = {
  // Data
  app: computed(() => app.value),
  appSlug: computed(() => appSlug.value),
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

provide(AppContextKey, appContext)

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
  if (itemUrl !== `/apps/${appSlug.value}` && route.path.startsWith(itemUrl + '/')) return true
  return false
}

// Breadcrumb
const breadcrumb = computed(() => {
  const crumbs = [
    { label: 'Apps', url: '/apps' },
    { label: app.value?.name || 'Loading...', url: `/apps/${appSlug.value}` },
  ]
  
  // Add current page to breadcrumb if not on app home
  if (route.path !== `/apps/${appSlug.value}`) {
    const pathParts = route.path.replace(`/apps/${appSlug.value}/`, '').split('/')
    if (pathParts[0]) {
      const section = pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1)
      crumbs.push({ label: section, url: route.path })
    }
  }
  
  return crumbs
})

// Static nav items
const staticNav = [
  {
    label: 'Overview',
    icon: 'lucide:home',
    url: computed(() => `/apps/${appSlug.value}`)
  },
]
</script>

<template>
  <div class="app-layout-wrapper">

    
    <div v-if="error" class="error">
      App not found
    </div>
    
    <div v-else-if="app" class="appContainer">
      <aside class="sidebar">
         <CommonMenu v-model:expandState="expandState" />
       </aside>
       <main>
        <el-splitter class="app-splitter">
          <el-splitter-panel size="260px" :min="200" :max="500">
            <!-- Left Sidebar: App Menu -->
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
                <button 
                  class="app-header-settings"
                  @click="navigateToSettings"
                  title="App Settings"
                >
                  <Icon name="lucide:settings" size="18" />
                </button>
              </div>
              
              <!-- Dynamic App Menu -->
              <client-only>
                <AppMenu
                  :app-slug="appSlug"
                  :menu="app.menu || []"
                  @create="handleCreateMenuItem"
                  @update="handleMenuUpdate"
                />
              </client-only>
            </aside>
          </el-splitter-panel>
          
          <el-splitter-panel :min="400">
            <!-- Right Content Area -->
            <div class="app-content">
              <!-- Breadcrumb Header -->
              <header class="content-header">
                <div class="breadcrumb">
                  <template v-for="(crumb, index) in breadcrumb" :key="crumb.url">
                    <NuxtLink :to="crumb.url" class="breadcrumb-item">
                      {{ crumb.label }}
                    </NuxtLink>
                    <span v-if="index < breadcrumb.length - 1" class="breadcrumb-separator">
                      /
                    </span>
                  </template>
                </div>
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
  padding: var(--app-space-s);
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
    
    .app-header-settings {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
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
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  .content-header {
    padding: var(--app-space-m) var(--app-space-l);
    border-bottom: 1px solid var(--app-border-color);
    background: var(--app-bg-color);
    flex-shrink: 0;
    
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: var(--app-space-s);
      font-size: var(--app-font-size-s);
      
      .breadcrumb-item {
        color: var(--app-text-color-secondary);
        text-decoration: none;
        transition: color 0.2s;
        
        &:hover {
          color: var(--app-primary-color);
        }
        
        &:last-child {
          color: var(--app-text-color-primary);
          font-weight: 500;
        }
      }
      
      .breadcrumb-separator {
        color: var(--app-text-color-placeholder);
      }
    }
  }
  
  .content-body {
    height: 100%;
    flex: 1 0 auto;
    overflow: hidden;
  }
}
</style>

