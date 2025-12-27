# Phase 2.6 Frontend Integration Guide

**Status**: ✅ Complete  
**Date**: December 27, 2025

## Components Created

### 1. FilterBuilder.vue ✅
Visual filter creation UI with:
- Add/remove filter conditions
- Column selection with icons
- 13 filter operators
- Dynamic value inputs based on column type
- Support for text, number, date, select fields
- AND/OR condition groups

### 2. SortBuilder.vue ✅
Sort configuration UI with:
- Add/remove sort rules
- Drag & drop to reorder priority
- Column selection
- Ascending/descending toggle
- Visual sort priority indicators

### 3. ViewToolbar.vue ✅
Complete view management toolbar with:
- View switcher dropdown
- Create/edit/delete views
- Duplicate views
- Share view dialog (public/team)
- Filter & sort panels
- Column visibility
- Export options

## Integration Example

### Table Page Integration

```vue
<template>
  <div class="table-page">
    <!-- View Toolbar -->
    <ViewToolbar
      :views="views"
      :current-view-id="currentViewId"
      :columns="columns"
      :workspace-slug="workspaceSlug"
      :table-slug="tableSlug"
      @view-change="handleViewChange"
      @view-update="handleViewUpdate"
      @view-create="handleViewCreate"
      @view-delete="handleViewDelete"
      @view-duplicate="handleViewDuplicate"
    />

    <!-- Data Grid -->
    <DataGrid
      :rows="filteredRows"
      :columns="visibleColumns"
      :loading="loading"
      @row-click="handleRowClick"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ViewToolbar from '~/components/app/views/ViewToolbar.vue'
import DataGrid from '~/components/app/data/DataGrid.vue'

// Props
const props = defineProps<{
  workspaceSlug: string
  tableSlug: string
}>()

// State
const currentViewId = ref('')
const views = ref([])
const columns = ref([])
const rows = ref([])
const loading = ref(false)

// Fetch initial data
onMounted(async () => {
  await Promise.all([
    fetchViews(),
    fetchColumns(),
  ])
  
  // Load default view
  const defaultView = views.value.find(v => v.isDefault)
  if (defaultView) {
    currentViewId.value = defaultView.id
    await fetchRows(defaultView.id)
  }
})

// Fetch views
async function fetchViews() {
  const { data } = await $fetch(
    `/api/workspaces/${props.workspaceSlug}/tables/${props.tableSlug}/views`
  )
  views.value = data
}

// Fetch columns
async function fetchColumns() {
  const { data } = await $fetch(
    `/api/workspaces/${props.workspaceSlug}/tables/${props.tableSlug}/columns`
  )
  columns.value = data
}

// Fetch rows with view filters applied
async function fetchRows(viewId: string) {
  loading.value = true
  try {
    const { data } = await $fetch(
      `/api/query/views/${viewId}/rows?limit=50&offset=0`
    )
    rows.value = data
  } finally {
    loading.value = false
  }
}

// Handlers
async function handleViewChange(viewId: string) {
  currentViewId.value = viewId
  await fetchRows(viewId)
}

async function handleViewUpdate(updates: any) {
  const { data } = await $fetch(
    `/api/workspaces/${props.workspaceSlug}/tables/${props.tableSlug}/views/${currentViewId.value}`,
    {
      method: 'PUT',
      body: updates
    }
  )
  
  // Update local views
  const index = views.value.findIndex(v => v.id === currentViewId.value)
  if (index !== -1) {
    views.value[index] = { ...views.value[index], ...data }
  }
  
  // Refresh data if filters/sorts changed
  if (updates.filters || updates.sort) {
    await fetchRows(currentViewId.value)
  }
}

async function handleViewCreate(viewData: any) {
  const { data } = await $fetch(
    `/api/workspaces/${props.workspaceSlug}/tables/${props.tableSlug}/views`,
    {
      method: 'POST',
      body: viewData
    }
  )
  
  views.value.push(data)
  currentViewId.value = data.id
  await fetchRows(data.id)
}

async function handleViewDelete(viewId: string) {
  await $fetch(
    `/api/workspaces/${props.workspaceSlug}/tables/${props.tableSlug}/views/${viewId}`,
    {
      method: 'DELETE'
    }
  )
  
  views.value = views.value.filter(v => v.id !== viewId)
  
  // Switch to default view
  const defaultView = views.value.find(v => v.isDefault)
  if (defaultView) {
    currentViewId.value = defaultView.id
    await fetchRows(defaultView.id)
  }
}

async function handleViewDuplicate(viewId: string) {
  const { data } = await $fetch(
    `/api/workspaces/${props.workspaceSlug}/tables/${props.tableSlug}/views/${viewId}/duplicate`,
    {
      method: 'POST'
    }
  )
  
  views.value.push(data)
  currentViewId.value = data.id
  await fetchRows(data.id)
}

// Computed
const currentView = computed(() => 
  views.value.find(v => v.id === currentViewId.value)
)

const visibleColumns = computed(() => {
  if (!currentView.value?.visibleColumns) return columns.value
  
  return currentView.value.visibleColumns
    .map(id => columns.value.find(c => c.id === id))
    .filter(Boolean)
})

const filteredRows = computed(() => rows.value)
</script>
```

## Component APIs

### FilterBuilder

**Props:**
```typescript
{
  columns: DataTableColumn[]  // Table columns
  filters?: FilterGroup | null  // Initial filters
}
```

**Events:**
```typescript
{
  change: (filters: FilterGroup | null) => void  // Filters changed
}
```

**Filter Structure:**
```typescript
interface FilterGroup {
  operator: 'AND' | 'OR'
  conditions: FilterCondition[]
}

interface FilterCondition {
  columnId: string
  operator: 'equals' | 'notEquals' | 'contains' | ...
  value?: any
}
```

### SortBuilder

**Props:**
```typescript
{
  columns: DataTableColumn[]  // Table columns
  sorts?: SortConfig[] | null  // Initial sorts
}
```

**Events:**
```typescript
{
  change: (sorts: SortConfig[] | null) => void  // Sorts changed
}
```

**Sort Structure:**
```typescript
interface SortConfig {
  columnId: string
  direction: 'asc' | 'desc'
}
```

### ViewToolbar

**Props:**
```typescript
{
  views: DataTableView[]       // All views
  currentViewId: string         // Active view ID
  columns: DataTableColumn[]    // Table columns
  workspaceSlug: string         // For API calls
  tableSlug: string             // For API calls
}
```

**Events:**
```typescript
{
  viewChange: (viewId: string) => void
  viewUpdate: (updates: Partial<DataTableView>) => void
  viewCreate: (viewData: Partial<DataTableView>) => void
  viewDelete: (viewId: string) => void
  viewDuplicate: (viewId: string) => void
}
```

## Standalone Usage

### Use FilterBuilder Alone

```vue
<template>
  <FilterBuilder
    :columns="columns"
    :filters="filters"
    @change="handleFiltersChange"
  />
</template>

<script setup>
const filters = ref({
  operator: 'AND',
  conditions: [
    { columnId: 'status-id', operator: 'equals', value: 'active' }
  ]
})

function handleFiltersChange(newFilters) {
  console.log('Filters changed:', newFilters)
  // Apply filters to your data
}
</script>
```

### Use SortBuilder Alone

```vue
<template>
  <SortBuilder
    :columns="columns"
    :sorts="sorts"
    @change="handleSortsChange"
  />
</template>

<script setup>
const sorts = ref([
  { columnId: 'created-at', direction: 'desc' }
])

function handleSortsChange(newSorts) {
  console.log('Sorts changed:', newSorts)
  // Apply sorts to your data
}
</script>
```

## Styling Customization

### CSS Variables

```css
/* Override component styles */
.view-toolbar {
  --toolbar-bg: var(--el-bg-color);
  --toolbar-border: var(--el-border-color);
  --toolbar-padding: 16px;
}

.filter-builder,
.sort-builder {
  --builder-bg: var(--el-bg-color);
  --builder-border: var(--el-border-color);
  --builder-border-radius: 8px;
}
```

### Dark Mode

Components automatically support dark mode via Element Plus CSS variables:

```css
/* Automatic dark mode support */
html.dark .view-toolbar {
  background: var(--el-bg-color); /* Auto adjusts */
}
```

## Dependencies

### Required Packages

```json
{
  "dependencies": {
    "element-plus": "^2.x",
    "@element-plus/icons-vue": "^2.x",
    "vuedraggable": "^4.x",
    "@vueuse/core": "^10.x"
  }
}
```

### Install VueDraggable

```bash
pnpm add vuedraggable@next
```

## Best Practices

### 1. Debounce Filter/Sort Changes

```typescript
import { useDebounceFn } from '@vueuse/core'

const debouncedFilterChange = useDebounceFn(async (filters) => {
  await updateView({ filters })
  await fetchRows()
}, 500)

function handleFiltersChange(filters) {
  debouncedFilterChange(filters)
}
```

### 2. Optimistic Updates

```typescript
async function handleViewUpdate(updates) {
  // Update UI immediately
  const index = views.value.findIndex(v => v.id === currentViewId.value)
  if (index !== -1) {
    views.value[index] = { ...views.value[index], ...updates }
  }
  
  // Then sync with backend
  try {
    await $fetch(`/api/.../views/${currentViewId.value}`, {
      method: 'PUT',
      body: updates
    })
  } catch (error) {
    // Rollback on error
    await fetchViews()
    ElMessage.error('Failed to update view')
  }
}
```

### 3. Loading States

```typescript
const updatingView = ref(false)

async function handleViewUpdate(updates) {
  updatingView.value = true
  try {
    await updateViewAPI(updates)
  } finally {
    updatingView.value = false
  }
}
```

### 4. Error Handling

```typescript
async function handleViewCreate(viewData) {
  try {
    const { data } = await $fetch('/api/.../views', {
      method: 'POST',
      body: viewData
    })
    
    views.value.push(data)
    ElMessage.success('View created successfully!')
  } catch (error) {
    ElMessage.error(error.message || 'Failed to create view')
  }
}
```

## Testing

### Component Testing

```typescript
import { mount } from '@vue/test-utils'
import FilterBuilder from '~/components/app/views/FilterBuilder.vue'

describe('FilterBuilder', () => {
  it('adds a filter condition', async () => {
    const wrapper = mount(FilterBuilder, {
      props: {
        columns: [
          { id: '1', name: 'Status', type: 'select' }
        ]
      }
    })
    
    await wrapper.find('.add-filter-btn').trigger('click')
    
    expect(wrapper.emitted('change')).toBeTruthy()
  })
})
```

## Performance Tips

### 1. Virtual Scrolling for Large Datasets

Use Element Plus's `el-table-v2` for tables with 1000+ rows.

### 2. Memoize Column Lookups

```typescript
const columnMap = computed(() => 
  new Map(columns.value.map(c => [c.id, c]))
)

function getColumn(id) {
  return columnMap.value.get(id)
}
```

### 3. Lazy Load Views

```typescript
// Only fetch view data when selected
watch(currentViewId, async (viewId) => {
  if (!viewDataCache.has(viewId)) {
    const data = await fetchViewData(viewId)
    viewDataCache.set(viewId, data)
  }
})
```

## Troubleshooting

### Filters Not Applying

**Issue:** Filters change but data doesn't update

**Solution:** Ensure you're calling `fetchRows()` after filter changes:

```typescript
async function handleFiltersChange(filters) {
  await handleViewUpdate({ filters })
  await fetchRows(currentViewId.value) // ← Don't forget this!
}
```

### Drag & Drop Not Working

**Issue:** Sort items can't be reordered

**Solution:** Ensure vuedraggable is installed:

```bash
pnpm add vuedraggable@next
```

### Icons Missing

**Issue:** Icons not displaying

**Solution:** Import Element Plus icons globally:

```typescript
// plugins/element-plus.ts
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

export default defineNuxtPlugin((nuxtApp) => {
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    nuxtApp.vueApp.component(key, component)
  }
})
```

---

**Phase 2.6.1 Frontend: COMPLETE** ✅  
**All components created and ready for integration!** 🚀

