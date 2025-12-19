<script setup lang="ts">
const route = useRoute()
const appSlug = computed(() => route.params.appSlug as string)
const expandState = ref(false)
// Fetch app data
const { data: app, pending, refresh: refreshApp } = await useFetch<App>(() => `/api/apps/${appSlug.value}`, {
  key: `app-${appSlug.value}`,
  watch: [appSlug]
})

// Handle menu creation
async function handleCreateMenuItem(type: 'folder' | 'table' | 'view' | 'dashboard') {
  console.log('Create:', type)
  // TODO: Navigate to create page or open modal
  // For now, just log
  alert(`Creating ${type} - this will be implemented in next step`)
}

// Handle menu update (drag & drop)
async function handleMenuUpdate(newMenu: any[]) {
  console.log('Menu updated:', newMenu)
  // TODO: Save to database
  // For now, just log
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
    <div v-if="pending" class="loading">
      Loading app...
    </div>
    
    <div v-else-if="!app" class="error">
      App not found
    </div>
    
    <div v-else class="appContainer">
      <aside class="sidebar">
         <CommonMenu v-model:expandState="expandState" />
       </aside>
       <main>
        <!-- Left Sidebar: App Menu -->
        <aside class="app-sidebar">
          <!-- App Header -->
          <div class="app-header">
            <div class="app-icon">
              <Icon v-if="app.icon" :name="app.icon" size="24" />
              <Icon v-else name="lucide:box" size="24" />
            </div>
            <div v-if="app.name" class="app-info">
              <h2 class="app-name">{{ app.name }}</h2>
              <p v-if="app.description" class="app-description">{{ app.description }}</p>
            </div>
          </div>
          
          <!-- Static Navigation -->
          <nav class="static-nav">
            <NuxtLink
              v-for="item in staticNav"
              :key="item.url.value"
              :to="item.url.value"
              class="nav-item"
              :class="{ active: isMenuActive(item.url.value) }"
            >
              <Icon :name="item.icon" size="20" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </nav>
          
          <!-- Dynamic App Menu -->
          <AppMenu
            :app-slug="appSlug"
            :menu="app.menu || []"
            @create="handleCreateMenuItem"
            @update="handleMenuUpdate"
          />
        </aside>
        
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
  overflow: auto;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: flex-start;
  position: relative;
  overflow: hidden;
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
  width: 260px;
  height: 100%;
  border-right: 1px solid var(--app-border-color);
  display: flex;
  flex-direction: column;
  background: var(--app-bg-color-page);
  overflow-y: auto;
  
  .app-header {
    padding: var(--app-space-l);
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

