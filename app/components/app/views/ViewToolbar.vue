<template>
  <div class="view-toolbar">
    <!-- View Switcher -->
    <div class="toolbar-left">
      <el-select
        :model-value="currentViewId"
        placeholder="Select view"
        size="large"
        class="view-selector"
        @change="handleViewChange"
      >
        <template #prefix>
          <el-icon><Grid /></el-icon>
        </template>
        
        <el-option
          v-for="view in views"
          :key="view.id"
          :label="view.name"
          :value="view.id"
        >
          <div class="view-option">
            <span class="view-name">
              {{ view.name }}
              <el-tag v-if="view.isDefault" size="small" type="info">Default</el-tag>
            </span>
            <el-icon 
              v-if="view.isPublic" 
              class="view-badge"
              title="Public view"
            >
              <Link />
            </el-icon>
            <el-icon 
              v-if="view.isShared && !view.isPublic" 
              class="view-badge"
              title="Shared with team"
            >
              <User />
            </el-icon>
          </div>
        </el-option>
        
        <template #footer>
          <el-button 
            text 
            class="create-view-btn"
            @click="showCreateDialog = true"
          >
            <el-icon><Plus /></el-icon>
            Create New View
          </el-button>
        </template>
      </el-select>

      <!-- View Actions -->
      <el-dropdown trigger="click">
        <el-button size="large">
          <el-icon><MoreFilled /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="showEditDialog = true">
              <el-icon><Edit /></el-icon>
              Edit View
            </el-dropdown-item>
            <el-dropdown-item @click="handleDuplicate">
              <el-icon><CopyDocument /></el-icon>
              Duplicate View
            </el-dropdown-item>
            <el-dropdown-item 
              v-if="!currentView?.isPublic"
              @click="showShareDialog = true"
            >
              <el-icon><Share /></el-icon>
              Share View
            </el-dropdown-item>
            <el-dropdown-item 
              v-if="!currentView?.isDefault"
              divided
              @click="handleDelete"
            >
              <el-icon><Delete /></el-icon>
              Delete View
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- Toolbar Actions -->
    <div class="toolbar-right">
      <!-- Filter Toggle -->
      <el-badge 
        :value="filterCount" 
        :hidden="filterCount === 0"
        type="primary"
      >
        <el-button 
          size="large"
          :type="showFilters ? 'primary' : 'default'"
          @click="showFilters = !showFilters"
        >
          <el-icon><Filter /></el-icon>
          Filter
        </el-button>
      </el-badge>

      <!-- Sort Toggle -->
      <el-badge 
        :value="sortCount" 
        :hidden="sortCount === 0"
        type="primary"
      >
        <el-button 
          size="large"
          :type="showSorts ? 'primary' : 'default'"
          @click="showSorts = !showSorts"
        >
          <el-icon><Sort /></el-icon>
          Sort
        </el-button>
      </el-badge>

      <!-- More Options -->
      <el-dropdown trigger="click">
        <el-button size="large">
          <el-icon><Setting /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="showColumnsDialog = true">
              <el-icon><View /></el-icon>
              Show/Hide Columns
            </el-dropdown-item>
            <el-dropdown-item @click="handleExport">
              <el-icon><Download /></el-icon>
              Export Data
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- Filter Panel -->
    <el-collapse-transition>
      <div v-if="showFilters" class="toolbar-panel">
        <FilterBuilder
          :columns="columns"
          :filters="currentView?.filters"
          @change="handleFiltersChange"
        />
      </div>
    </el-collapse-transition>

    <!-- Sort Panel -->
    <el-collapse-transition>
      <div v-if="showSorts" class="toolbar-panel">
        <SortBuilder
          :columns="columns"
          :sorts="currentView?.sort"
          @change="handleSortsChange"
        />
      </div>
    </el-collapse-transition>

    <!-- Create/Edit View Dialog -->
    <el-dialog
      v-model="showEditDialog"
      :title="isCreatingView ? 'Create New View' : 'Edit View'"
      width="500px"
    >
      <el-form :model="viewForm" label-position="top">
        <el-form-item label="View Name" required>
          <el-input v-model="viewForm.name" placeholder="e.g., Active Tasks" />
        </el-form-item>
        
        <el-form-item label="Description">
          <el-input
            v-model="viewForm.description"
            type="textarea"
            :rows="3"
            placeholder="Describe what this view shows"
          />
        </el-form-item>

        <el-form-item label="View Type">
          <el-radio-group v-model="viewForm.viewType">
            <el-radio value="grid">
              <el-icon><Grid /></el-icon>
              Grid
            </el-radio>
            <el-radio value="kanban">
              <el-icon><Tickets /></el-icon>
              Kanban
            </el-radio>
            <el-radio value="calendar">
              <el-icon><Calendar /></el-icon>
              Calendar
            </el-radio>
            <el-radio value="gallery">
              <el-icon><Picture /></el-icon>
              Gallery
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item>
          <el-checkbox v-model="viewForm.isDefault">
            Set as default view
          </el-checkbox>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showEditDialog = false">Cancel</el-button>
        <el-button type="primary" @click="handleSaveView">
          {{ isCreatingView ? 'Create' : 'Save' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Share View Dialog -->
    <el-dialog
      v-model="showShareDialog"
      title="Share View"
      width="500px"
    >
      <div class="share-options">
        <el-form label-position="top">
          <el-form-item>
            <template #label>
              <div class="share-label">
                <el-icon><Link /></el-icon>
                <span>Public Access</span>
              </div>
            </template>
            <el-switch
              v-model="shareForm.isPublic"
              active-text="Anyone with the link can view"
              @change="handleShareChange"
            />
          </el-form-item>

          <el-form-item v-if="shareForm.isPublic">
            <template #label>Share Link</template>
            <el-input
              :value="publicShareUrl"
              readonly
            >
              <template #append>
                <el-button @click="copyShareLink">
                  <el-icon><CopyDocument /></el-icon>
                  Copy
                </el-button>
              </template>
            </el-input>
          </el-form-item>

          <el-divider />

          <el-form-item>
            <template #label>
              <div class="share-label">
                <el-icon><User /></el-icon>
                <span>Team Access</span>
              </div>
            </template>
            <el-switch
              v-model="shareForm.isShared"
              active-text="Workspace members can view"
              @change="handleShareChange"
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="showShareDialog = false">Close</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useClipboard } from '@vueuse/core'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Grid, MoreFilled, Plus, Edit, CopyDocument, Share, Delete,
  Filter, Sort, Setting, View, Download, Link, User,
  Tickets, Calendar, Picture
} from '@element-plus/icons-vue'
import FilterBuilder from './FilterBuilder.vue'
import SortBuilder from './SortBuilder.vue'
import type { DataTableColumn } from '#shared/types/db'

interface DataTableView {
  id: string
  name: string
  description?: string | null
  viewType: string
  isDefault: boolean
  isShared: boolean
  isPublic: boolean
  filters?: any
  sort?: any
  visibleColumns?: string[]
  columnWidths?: Record<string, number>
}

interface Props {
  views: DataTableView[]
  currentViewId: string
  columns: DataTableColumn[]
  workspaceSlug: string
  tableSlug: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  viewChange: [viewId: string]
  viewUpdate: [view: Partial<DataTableView>]
  viewCreate: [view: Partial<DataTableView>]
  viewDelete: [viewId: string]
  viewDuplicate: [viewId: string]
}>()

// State
const showFilters = ref(false)
const showSorts = ref(false)
const showEditDialog = ref(false)
const showCreateDialog = ref(false)
const showShareDialog = ref(false)
const showColumnsDialog = ref(false)

const viewForm = ref({
  name: '',
  description: '',
  viewType: 'grid',
  isDefault: false
})

const shareForm = ref({
  isPublic: false,
  isShared: false
})

// Computed
const currentView = computed(() => 
  props.views.find(v => v.id === props.currentViewId)
)

const filterCount = computed(() => 
  currentView.value?.filters?.conditions?.length || 0
)

const sortCount = computed(() => 
  currentView.value?.sort?.length || 0
)

const isCreatingView = computed(() => showCreateDialog.value)

const publicShareUrl = computed(() => {
  if (!currentView.value) return ''
  return `${window.location.origin}/views/${currentView.value.id}`
})

// Clipboard
const { copy } = useClipboard()

// Methods
function handleViewChange(viewId: string) {
  emit('viewChange', viewId)
}

function handleFiltersChange(filters: any) {
  emit('viewUpdate', { filters })
}

function handleSortsChange(sorts: any) {
  emit('viewUpdate', { sort: sorts })
}

function handleSaveView() {
  if (isCreatingView.value) {
    emit('viewCreate', viewForm.value)
  } else {
    emit('viewUpdate', viewForm.value)
  }
  showEditDialog.value = false
  showCreateDialog.value = false
}

async function handleDelete() {
  try {
    await ElMessageBox.confirm(
      'This will permanently delete this view. Continue?',
      'Delete View',
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning',
      }
    )
    emit('viewDelete', props.currentViewId)
  } catch {
    // Cancelled
  }
}

function handleDuplicate() {
  emit('viewDuplicate', props.currentViewId)
}

function handleShareChange() {
  emit('viewUpdate', {
    isPublic: shareForm.value.isPublic,
    isShared: shareForm.value.isShared
  })
}

async function copyShareLink() {
  await copy(publicShareUrl.value)
  ElMessage.success('Link copied to clipboard!')
}

function handleExport() {
  ElMessage.info('Export feature coming soon!')
}

// Watch for view changes
watch(currentView, (view) => {
  if (view) {
    viewForm.value = {
      name: view.name,
      description: view.description || '',
      viewType: view.viewType,
      isDefault: view.isDefault
    }
    shareForm.value = {
      isPublic: view.isPublic,
      isShared: view.isShared
    }
  }
}, { immediate: true })

// Watch for create dialog
watch(showCreateDialog, (show) => {
  if (show) {
    showEditDialog.value = true
    viewForm.value = {
      name: '',
      description: '',
      viewType: 'grid',
      isDefault: false
    }
  }
})
</script>

<style scoped>
.view-toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-left {
  flex: 1;
}

.view-selector {
  min-width: 240px;
}

.view-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.view-name {
  display: flex;
  align-items: center;
  gap: 6px;
}

.view-badge {
  font-size: 14px;
  color: var(--el-color-info);
}

.create-view-btn {
  width: 100%;
  justify-content: flex-start;
  padding: 8px 16px;
}

.toolbar-panel {
  margin-top: 8px;
}

.share-options {
  padding: 8px 0;
}

.share-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

/* Responsive */
@media (max-width: 768px) {
  .view-toolbar {
    flex-direction: column;
  }
  
  .toolbar-right {
    width: 100%;
    justify-content: space-between;
  }
}
</style>

