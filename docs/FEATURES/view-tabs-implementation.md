# View Tabs Implementation Guide

**Goal**: Replace view dropdown with tabs, use URL hash for view selection  
**URL Format**: `/workspaces/[slug]/table/[slug]#view-[viewSlug]`  
**Example**: `http://localhost:3000/workspaces/advanced-crm/table/companies#view-kanban-board`

---

## 🎯 **Why URL Hash?**

### Advantages
- ✅ **No page reload** - Instant switching
- ✅ **Shareable** - Full URL with view included
- ✅ **Browser history** - Back/forward work
- ✅ **Simple** - No query params complexity
- ✅ **Vue Router reactive** - `route.hash` auto-updates

### URL Examples
```
# Default view (no hash)
/workspaces/crm/table/companies

# Specific view via hash
/workspaces/crm/table/companies#view-all-records
/workspaces/crm/table/companies#view-kanban-board
/workspaces/crm/table/companies#view-active-only
```

---

## 📋 **Implementation Steps**

### Step 1: Update Table Page Logic

**File**: `app/pages/workspaces/[workspaceSlug]/table/[tableSlug]/index.vue`

#### Change 1: Use Hash Instead of Query Params

```typescript
// BEFORE (using query params)
const currentViewId = ref<string>('')
watch(allViews, (views) => {
  const urlViewId = route.query.viewId as string
  // ...
})

// AFTER (using hash)
const currentViewSlug = ref<string>('')

// Parse hash to get view slug
const viewSlugFromHash = computed(() => {
  const hash = route.hash
  if (hash.startsWith('#view-')) {
    return hash.replace('#view-', '')
  }
  return null
})

// Find view by slug
watch([allViews, viewSlugFromHash], ([views, slugFromHash]) => {
  if (!views?.data || views.data.length === 0) return
  
  if (slugFromHash) {
    // Try to find view by slug from hash
    const view = views.data.find(v => v.slug === slugFromHash)
    if (view) {
      currentViewSlug.value = view.slug
      return
    }
  }
  
  // Fallback to default view
  const defaultView = views.data.find(v => v.isDefault)
  currentViewSlug.value = defaultView?.slug || views.data[0].slug
}, { immediate: true })
```

#### Change 2: Update View Change Handler

```typescript
// BEFORE
async function handleViewChange(viewId: string) {
  currentViewId.value = viewId
  await router.push({
    query: { ...route.query, viewId }
  })
}

// AFTER
async function handleViewChange(viewSlug: string) {
  currentViewSlug.value = viewSlug
  await router.push({
    hash: `#view-${viewSlug}`
  })
}
```

#### Change 3: Fetch View by Slug

```typescript
// BEFORE
const { data: currentView } = await useApi(
  () => `/api/.../views/${currentViewId.value || 'default'}`,
  { watch: [currentViewId] }
)

// AFTER
const { data: currentView } = await useApi(
  () => `/api/.../views/${currentViewSlug.value || 'default'}`,
  { watch: [currentViewSlug] }
)
```

---

### Step 2: Replace Dropdown with Tabs

**File**: `app/components/app/views/ViewTabs.vue` (NEW)

```vue
<template>
  <div class="view-tabs-container">
    <!-- Tabs -->
    <div class="view-tabs">
      <el-tabs
        :model-value="currentViewSlug"
        type="card"
        @tab-change="handleTabChange"
      >
        <el-tab-pane
          v-for="view in views"
          :key="view.slug"
          :label="view.name"
          :name="view.slug"
        >
          <template #label>
            <div class="tab-label">
              <!-- View type icon -->
              <el-icon>
                <component :is="getViewIcon(view.viewType)" />
              </el-icon>
              
              <!-- View name -->
              <span>{{ view.name }}</span>
              
              <!-- Badges -->
              <el-tag v-if="view.isDefault" size="small" type="info">
                Default
              </el-tag>
              <el-icon 
                v-if="view.isPublic" 
                class="badge-icon"
                title="Public"
              >
                <Link />
              </el-icon>
            </div>
          </template>
        </el-tab-pane>
        
        <!-- Add view button -->
        <template #add-icon>
          <el-button
            type="primary"
            size="small"
            :icon="Plus"
            @click="$emit('view-create')"
          >
            New View
          </el-button>
        </template>
      </el-tabs>
      
      <!-- View actions (more menu) -->
      <el-dropdown trigger="click" class="view-actions">
        <el-button size="small" :icon="MoreFilled" />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="$emit('view-edit')">
              <el-icon><Edit /></el-icon>
              Edit View
            </el-dropdown-item>
            <el-dropdown-item @click="$emit('view-duplicate')">
              <el-icon><CopyDocument /></el-icon>
              Duplicate
            </el-dropdown-item>
            <el-dropdown-item 
              v-if="!currentView?.isPublic"
              @click="$emit('view-share')"
            >
              <el-icon><Share /></el-icon>
              Share
            </el-dropdown-item>
            <el-dropdown-item 
              v-if="!currentView?.isDefault"
              divided
              @click="$emit('view-delete')"
            >
              <el-icon><Delete /></el-icon>
              Delete
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    
    <!-- Filter & Sort Toolbar (below tabs) -->
    <div class="view-toolbar">
      <!-- Filter Button -->
      <el-badge :value="filterCount" :hidden="filterCount === 0">
        <el-button
          size="small"
          :type="showFilters ? 'primary' : 'default'"
          @click="showFilters = !showFilters"
        >
          <el-icon><Filter /></el-icon>
          Filter
        </el-button>
      </el-badge>
      
      <!-- Sort Button -->
      <el-badge :value="sortCount" :hidden="sortCount === 0">
        <el-button
          size="small"
          :type="showSorts ? 'primary' : 'default'"
          @click="showSorts = !showSorts"
        >
          <el-icon><Sort /></el-icon>
          Sort
        </el-button>
      </el-badge>
      
      <!-- View-specific controls (Grid grouping, Kanban settings, etc.) -->
      <ViewTypeControls
        v-if="currentView"
        :view="currentView"
        @update="$emit('view-update', $event)"
      />
    </div>
    
    <!-- Filter Panel -->
    <el-collapse-transition>
      <FilterBuilder
        v-if="showFilters"
        :columns="columns"
        :filters="currentView?.filters"
        @change="$emit('filters-change', $event)"
      />
    </el-collapse-transition>
    
    <!-- Sort Panel -->
    <el-collapse-transition>
      <SortBuilder
        v-if="showSorts"
        :columns="columns"
        :sorts="currentView?.sort"
        @change="$emit('sorts-change', $event)"
      />
    </el-collapse-transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { 
  Grid, Tickets, Calendar, Picture, Form,
  Plus, MoreFilled, Edit, CopyDocument, Share, Delete,
  Filter, Sort, Link
} from '@element-plus/icons-vue'
import type { DataTableView, DataTableColumn } from '#shared/types/db'

interface Props {
  views: DataTableView[]
  currentViewSlug: string
  columns: DataTableColumn[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'tab-change': [slug: string]
  'view-create': []
  'view-edit': []
  'view-duplicate': []
  'view-delete': []
  'view-share': []
  'filters-change': [filters: any]
  'sorts-change': [sorts: any]
  'view-update': [updates: any]
}>()

const currentView = computed(() => 
  props.views.find(v => v.slug === props.currentViewSlug)
)

const filterCount = computed(() => 
  currentView.value?.filters?.conditions?.length || 0
)

const sortCount = computed(() => 
  currentView.value?.sort?.length || 0
)

function getViewIcon(viewType: string) {
  switch (viewType) {
    case 'grid': return Grid
    case 'kanban': return Tickets
    case 'calendar': return Calendar
    case 'gallery': return Picture
    case 'form': return Form
    default: return Grid
  }
}

function handleTabChange(slug: string) {
  emit('tab-change', slug)
}
</script>

<style scoped>
.view-tabs-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
}

.view-tabs {
  display: flex;
  align-items: center;
  gap: 12px;
}

.view-tabs :deep(.el-tabs) {
  flex: 1;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.badge-icon {
  font-size: 12px;
  color: var(--el-color-info);
}

.view-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.view-actions {
  margin-left: auto;
}
</style>
```

---

### Step 3: Create View-Specific Controls

**File**: `app/components/app/views/ViewTypeControls.vue` (NEW)

```vue
<template>
  <div class="view-type-controls">
    <!-- Grid View Controls -->
    <template v-if="isGridView">
      <el-button size="small" @click="showGroupDialog = true">
        <el-icon><Grid /></el-icon>
        {{ groupBy ? 'Grouped by ' + groupBy.columnName : 'Group' }}
      </el-button>
    </template>
    
    <!-- Kanban View Controls -->
    <template v-if="isKanbanView">
      <el-button size="small" @click="showKanbanSettings = true">
        <el-icon><Setting /></el-icon>
        Kanban Settings
      </el-button>
    </template>
    
    <!-- Calendar View Controls -->
    <template v-if="isCalendarView">
      <el-button size="small" @click="showCalendarSettings = true">
        <el-icon><Setting /></el-icon>
        Calendar Settings
      </el-button>
    </template>
    
    <!-- Gallery View Controls -->
    <template v-if="isGalleryView">
      <el-button size="small" @click="showGallerySettings = true">
        <el-icon><Setting /></el-icon>
        Gallery Settings
      </el-button>
    </template>
    
    <!-- Dialogs for each view type -->
    <!-- ... (implement dialogs) -->
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DataTableView } from '#shared/types/db'

interface Props {
  view: DataTableView
}

const props = defineProps<Props>()

const isGridView = computed(() => props.view.viewType === 'grid')
const isKanbanView = computed(() => props.view.viewType === 'kanban')
const isCalendarView = computed(() => props.view.viewType === 'calendar')
const isGalleryView = computed(() => props.view.viewType === 'gallery')
</script>
```

---

### Step 4: Update Table Page Template

**File**: `app/pages/workspaces/[workspaceSlug]/table/[tableSlug]/index.vue`

```vue
<template>
  <div class="table-view-page">
    <!-- ... (existing teleport) -->
    
    <div v-else class="table-content">
      <!-- REPLACE ViewToolbar with ViewTabs -->
      <AppViewsViewTabs
        v-if="allViews?.data && currentViewSlug"
        :views="allViews.data"
        :current-view-slug="currentViewSlug"
        :columns="currentView?.data.allColumns || []"
        @tab-change="handleViewChange"
        @view-update="handleViewUpdate"
        @view-create="handleViewCreate"
        @view-delete="handleViewDelete"
        @view-duplicate="handleViewDuplicate"
        @filters-change="handleFiltersChange"
        @sorts-change="handleSortsChange"
      />
      
      <!-- Data Grid -->
      <div class="table-data">
        <!-- ... (existing grid) -->
      </div>
    </div>
  </div>
</template>
```

---

## 🎨 **Visual Comparison**

### Before (Dropdown)
```
┌─────────────────────────────────────────┐
│ [▼ All Records]  [⋯]  [Filter] [Sort]  │
└─────────────────────────────────────────┘
```

### After (Tabs)
```
┌───────────────────────────────────────────────────────────┐
│ [All Records] [Kanban Board] [Active Only] [+ New View]  │
├───────────────────────────────────────────────────────────┤
│ [Filter (2)] [Sort (1)] [Group] [⋯]                       │
└───────────────────────────────────────────────────────────┘
```

---

## 🧪 **Testing**

### Test Hash Navigation
1. Open table: `/workspaces/crm/table/companies`
2. Click tab: URL becomes `/...#view-kanban-board`
3. Copy URL
4. Open in new tab → Should open Kanban view ✅
5. Click browser back → Should go back to previous view ✅

### Test Direct Hash Access
```
# Direct URL with hash
http://localhost:3000/workspaces/crm/table/companies#view-active-only

Expected: Opens "Active Only" view directly ✅
```

---

## 🚀 **Implementation Order**

1. ✅ **Create view config types** (DONE above)
2. **Update table page to use hash** (15 min)
3. **Create ViewTabs component** (30 min)
4. **Create ViewTypeControls** (30 min)
5. **Test hash navigation** (15 min)
6. **Implement view-specific settings dialogs** (2-3 hours)

**Total Time**: ~4-5 hours for complete implementation

---

## 💡 **Benefits**

### User Experience
- ✅ **Faster switching** - Tabs are one click
- ✅ **Visual context** - See all views at once
- ✅ **Better organization** - View type icons help
- ✅ **Shareable URLs** - Hash is part of URL

### Developer Experience
- ✅ **Simpler routing** - No query params
- ✅ **Better history** - Back/forward work naturally
- ✅ **Type-safe configs** - TypeScript interfaces
- ✅ **Extensible** - Easy to add new view types

---

## 📋 **Next Steps**

Want me to implement this now? I can:
1. Update the table page to use hash
2. Create the ViewTabs component
3. Wire everything up
4. Test it

**Estimated time**: ~1 hour for basic implementation  
**Ready to proceed?** 🚀

