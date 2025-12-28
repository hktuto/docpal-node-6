<template>
  <div class="view-tab">
    <!-- View Toolbar (Temporary Filters & Sorts) -->
    <AppViewsViewToolbar
      :columns="view.allColumns || view.columns"
      :default-filters="view.filters"
      :default-sorts="view.sorts"
    />
    
    <!-- View Content -->
    <div class="view-content">
      <!-- Grid View -->
      <template v-if="view.viewType === 'grid'">
        <DataGrid
          :columns="view.columns"
          :workspace-slug="workspaceSlug"
          :table-slug="tableSlug"
          :view-id="view.id"
          :auto-proxy="true"
          :allow-column-management="true"
          :virtual-scroll="true"
          :scroll-y-load="false"
          :page-size="view.pageSize || 50"
          height="100%"
          v-bind="$attrs"
        />
      </template>
      
      <!-- Kanban View -->
      <template v-else-if="view.viewType === 'kanban'">
        <AppViewsKanbanBoard
          :columns="view.columns"
          :workspace-slug="workspaceSlug"
          :table-slug="tableSlug"
          :view-id="view.id"
          :group-by-column-name="(view.viewConfig as any)?.groupBy"
          @card-click="handleCardClick"
          @configure="handleConfigure"
        />
      </template>
      
      <!-- Calendar View -->
      <template v-else-if="view.viewType === 'calendar'">
        <div class="view-placeholder">
          <el-icon :size="48"><Calendar /></el-icon>
          <h3>Calendar View</h3>
          <p>Coming soon...</p>
        </div>
      </template>
      
      <!-- Gallery View -->
      <template v-else-if="view.viewType === 'gallery'">
        <div class="view-placeholder">
          <el-icon :size="48"><Picture /></el-icon>
          <h3>Gallery View</h3>
          <p>Coming soon...</p>
        </div>
      </template>
      
      <!-- Form View -->
      <template v-else-if="view.viewType === 'form'">
        <div class="view-placeholder">
          <el-icon :size="48"><Document /></el-icon>
          <h3>Form View</h3>
          <p>Coming soon...</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Tickets, Calendar, Picture, Document } from '@element-plus/icons-vue'
import type { DataTableView, DataTableColumn } from '#shared/types/db'

interface Props {
  view: DataTableView & {
    columns: DataTableColumn[]
    allColumns: DataTableColumn[]
  }
  workspaceSlug: string
  tableSlug: string
}

defineProps<Props>()

// Inject table context to get temporary filters/sorts
const tableContext = useTableContext()

// Get reactive refs for temporary filters/sorts from context
const tempFilters = tableContext.tempFilters
const tempSorts = tableContext.tempSorts

// Event handlers for Kanban
function handleCardClick(card: any) {
  // Open row dialog
  tableContext.handleEditRow(card)
}

function handleConfigure() {
  // Open view settings dialog
  const view = tableContext.currentView.value
  if (view && tableContext.handleViewEdit) {
    tableContext.handleViewEdit(view)
  }
}

// Inherit all events from DataGrid
defineOptions({
  inheritAttrs: false
})
</script>

<style scoped>
.view-tab {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* View Content */
.view-content {
  flex: 1;
  overflow: hidden;
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
</style>
