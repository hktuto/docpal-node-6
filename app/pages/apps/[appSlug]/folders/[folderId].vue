<script setup lang="ts">
import type { MenuItem } from '#shared/types/db'

definePageMeta({
  layout: 'app'
})

const route = useRoute()
const { app } = useAppContext()

// Get folder slug from route (parameter name is folderId but it contains the slug)
const folderSlug = computed(() => route.params.folderId as string)

// Find the folder in the menu structure by slug
const folder = computed(() => {
  if (!app.value?.menu) return null
  
  const findFolder = (items: MenuItem[]): MenuItem | null => {
    for (const item of items) {
      if (item.slug === folderSlug.value) {
        return item
      }
      if (item.children) {
        const found = findFolder(item.children)
        if (found) return found
      }
    }
    return null
  }
  
  return findFolder(app.value.menu)
})

// Get folder children
const folderChildren = computed(() => folder.value?.children || [])

// Helper functions
function getItemIcon(type: string) {
  const icons: Record<string, string> = {
    folder: 'lucide:folder',
    table: 'lucide:table',
    view: 'lucide:eye',
    dashboard: 'lucide:layout-dashboard'
  }
  return icons[type] || 'lucide:file'
}

function getChildPath(child: MenuItem) {
  const appSlug = route.params.appSlug
  // Use slug for all navigation
  return `/apps/${appSlug}/${child.type}s/${child.slug}`
}
</script>

<template>
  <div class="folder-page">
    <!-- Folder Content -->
    <div class="folder-content">
      <div v-if="folderChildren.length === 0" class="empty-state">
        <Icon name="lucide:folder-open" size="64" />
        <h3>Empty Folder</h3>
        <p>This folder doesn't contain any items yet.</p>
        <p class="hint">Use the + button in the menu to add items to this folder.</p>
      </div>
      
      <div v-else class="folder-items">
        <h2 class="section-title">Contents ({{ folderChildren.length }})</h2>
        <div class="items-grid">
          <NuxtLink
            v-for="child in folderChildren"
            :key="child.id"
            :to="getChildPath(child)"
            class="item-card"
          >
            <div class="item-icon">
              <Icon :name="getItemIcon(child.type)" size="24" />
            </div>
            <div class="item-info">
              <h3 class="item-name">{{ child.label }}</h3>
              <p v-if="child.description" class="item-description">
                {{ child.description }}
              </p>
              <span class="item-type">{{ child.type }}</span>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>


<style lang="scss" scoped>
.folder-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--app-bg-color);
}

.folder-content {
  flex: 1;
  padding: var(--app-space-xl);
  overflow-y: auto;
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--app-text-color-placeholder);
    text-align: center;
    padding: var(--app-space-xxl);
    
    h3 {
      margin: var(--app-space-m) 0 var(--app-space-xs);
      font-size: var(--app-font-size-xl);
      color: var(--app-text-color-secondary);
    }
    
    p {
      margin: var(--app-space-xs) 0;
      font-size: var(--app-font-size-m);
    }
    
    .hint {
      font-size: var(--app-font-size-s);
      color: var(--app-text-color-placeholder);
      margin-top: var(--app-space-m);
    }
  }
  
  .folder-items {
    .section-title {
      font-size: var(--app-font-size-l);
      font-weight: 600;
      color: var(--app-text-color-primary);
      margin: 0 0 var(--app-space-l);
    }
    
    .items-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--app-space-m);
      
      .item-card {
        display: flex;
        align-items: flex-start;
        gap: var(--app-space-m);
        padding: var(--app-space-l);
        border: 1px solid var(--app-border-color-light);
        border-radius: var(--app-border-radius-m);
        background: var(--app-bg-color);
        transition: all 0.2s;
        text-decoration: none;
        color: inherit;
        cursor: pointer;
        
        &:hover {
          border-color: var(--app-primary-color);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transform: translateY(-2px);
          
          .item-name {
            color: var(--app-primary-color);
          }
        }
        
        .item-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: var(--app-border-radius-m);
          background: var(--app-fill-color-light);
          color: var(--app-primary-color);
          flex-shrink: 0;
        }
        
        .item-info {
          flex: 1;
          min-width: 0;
          
          .item-name {
            font-size: var(--app-font-size-m);
            font-weight: 600;
            color: var(--app-text-color-primary);
            margin: 0 0 var(--app-space-xxs);
            transition: color 0.2s;
          }
          
          .item-description {
            font-size: var(--app-font-size-s);
            color: var(--app-text-color-secondary);
            margin: 0 0 var(--app-space-xs);
            line-height: 1.5;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }
          
          .item-type {
            display: inline-block;
            padding: 2px var(--app-space-xs);
            font-size: var(--app-font-size-xs);
            color: var(--app-text-color-placeholder);
            background: var(--app-fill-color-light);
            border-radius: var(--app-border-radius-s);
            text-transform: capitalize;
          }
        }
      }
    }
  }
}
</style>

