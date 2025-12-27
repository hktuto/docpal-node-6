<template>
  <div class="view-tabs-container">
    <!-- Tabs with editable prop for add/remove -->
    <el-tabs
      :model-value="currentViewSlug"
      editable
      @tab-change="handleTabChange"
      @tab-add="handleTabAdd"
      @tab-remove="handleTabRemove"
    >
      <el-tab-pane
        v-for="view in views"
        :key="view.slug"
        :name="view.slug"
        :closable="!view.isDefault"
      >
        <template #label>
          <div class="tab-label">
            <!-- View type icon -->
            <el-icon>
              <component :is="getViewIcon(view.viewType)" />
            </el-icon>
            
            <!-- View name -->
            <span class="tab-name">{{ view.name }}</span>
            
            <!-- Badges -->
            <el-tag 
              v-if="view.isDefault" 
              size="small" 
              type="info"
              class="tab-badge"
            >
              Default
            </el-tag>
            <el-icon 
              v-if="view.isPublic" 
              class="badge-icon"
              title="Public view"
            >
              <Link />
            </el-icon>
            <el-icon 
              v-if="view.isShared && !view.isPublic" 
              class="badge-icon"
              title="Shared with team"
            >
              <User />
            </el-icon>
          </div>
        </template>
        
        <!-- Tab Content - View Type Specific -->
        <div class="tab-content">
          <!-- Grid View -->
          <template v-if="view.slug === currentViewSlug && view.viewType === 'grid'">
            <slot name="grid-view" :view="view" />
          </template>
          
          <!-- Kanban View -->
          <template v-else-if="view.slug === currentViewSlug && view.viewType === 'kanban'">
            <slot name="kanban-view" :view="view">
              <div class="view-placeholder">
                <el-icon :size="48"><Tickets /></el-icon>
                <h3>Kanban View</h3>
                <p>Coming soon...</p>
              </div>
            </slot>
          </template>
          
          <!-- Calendar View -->
          <template v-else-if="view.slug === currentViewSlug && view.viewType === 'calendar'">
            <slot name="calendar-view" :view="view">
              <div class="view-placeholder">
                <el-icon :size="48"><Calendar /></el-icon>
                <h3>Calendar View</h3>
                <p>Coming soon...</p>
              </div>
            </slot>
          </template>
          
          <!-- Gallery View -->
          <template v-else-if="view.slug === currentViewSlug && view.viewType === 'gallery'">
            <slot name="gallery-view" :view="view">
              <div class="view-placeholder">
                <el-icon :size="48"><Picture /></el-icon>
                <h3>Gallery View</h3>
                <p>Coming soon...</p>
              </div>
            </slot>
          </template>
        </div>
      </el-tab-pane>
    </el-tabs>

  </div>
</template>

<script setup lang="ts">
import { ElMessageBox } from 'element-plus'
import {
  Grid, Tickets, Calendar, Picture,
  Link, User
} from '@element-plus/icons-vue'
import type { DataTableView } from '#shared/types/db'

interface Props {
  views: DataTableView[]
  currentViewSlug: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'tab-change': [slug: string]
  'view-create': []
  'view-delete': [slug: string]
}>()

// Methods
function getViewIcon(viewType: string) {
  switch (viewType) {
    case 'grid': return Grid
    case 'kanban': return Tickets
    case 'calendar': return Calendar
    case 'gallery': return Picture
    default: return Grid
  }
}

function handleTabChange(slug: string | number) {
  emit('tab-change', slug as string)
}

function handleTabAdd() {
  emit('view-create')
}

async function handleTabRemove(slug: string | number) {
  const viewSlug = slug as string
  const view = props.views.find(v => v.slug === viewSlug)
  
  if (!view) return
  
  try {
    await ElMessageBox.confirm(
      `Delete view "${view.name}"? This cannot be undone.`,
      'Delete View',
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning',
      }
    )
    emit('view-delete', viewSlug)
  } catch {
    // Cancelled
  }
}
</script>

<style scoped>
.view-tabs-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.view-tabs-container :deep(.el-tabs) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.view-tabs-container :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
}

.view-tabs-container :deep(.el-tab-pane) {
  height: 100%;
}

/* Tab Label */
.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-name {
  font-size: 14px;
}

.tab-badge {
  margin-left: 4px;
}

.badge-icon {
  font-size: 14px;
  color: var(--el-color-info);
}

/* Tab Content */
.tab-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* View Placeholder */
.view-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  color: var(--el-text-color-secondary);
}

.view-placeholder h3 {
  margin: 0;
  font-size: 20px;
  color: var(--el-text-color-primary);
}

.view-placeholder p {
  margin: 0;
  font-size: 14px;
}

/* Responsive */
@media (max-width: 768px) {
  .tab-label {
    gap: 4px;
  }
  
  .tab-badge {
    display: none;
  }
}
</style>
