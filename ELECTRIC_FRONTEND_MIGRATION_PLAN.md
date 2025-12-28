# Electric Frontend Migration Plan

## Current State ✅

### Synced Tables
- ✅ `users` (current user only)
- ✅ `companies` (user's company)
- ✅ `workspaces` (company workspaces)
- ✅ `data_tables` (company tables)
- ✅ `data_table_columns` (all columns, client-filtered)
- ✅ Dynamic tables (on-demand)

### Available Composables
- ✅ `useUsers()` - Current user data
- ✅ `useCompany()` - Company data
- ✅ `useDataTables(workspaceId?)` - Tables metadata
- ✅ `useTableData(dataTableId)` - Dynamic table data with schema evolution

---

## Migration Strategy

### Phase 1: Read Operations (Queries) 🎯 **START HERE**

Replace API GET calls with Electric composables for **read-only** operations.

#### 1.1 User Profile Page (`/profile`)
**Before:**
```typescript
const { data: user } = await useFetch('/api/auth/me')
```

**After:**
```typescript
const { currentUser, isLoading } = useUsers()
```

**Benefits:**
- ✅ Real-time updates
- ✅ Offline access
- ✅ No loading spinners (instant local query)

---

#### 1.2 Workspace Sidebar/Menu
**Before:**
```typescript
const { data: workspaces } = await useFetch('/api/workspaces')
```

**After:**
```typescript
// In menu component
const { workspaces, isLoading } = useWorkspaces() // Need to create this!
```

**TODO:** Create `useWorkspaces()` composable similar to `useDataTables()`

---

#### 1.3 Table List in Workspace (`/workspaces/[slug]/tables`)
**Before:**
```typescript
const { data: tables } = await useFetch(`/api/workspaces/${workspaceId}/tables`)
```

**After:**
```typescript
const { tables, isLoading } = useDataTables(workspaceId)
```

**Status:** ✅ Composable ready, just need to update component

---

#### 1.4 Table View (`/workspaces/[slug]/table/[tableSlug]`)
**Before:**
```typescript
const { data: rows } = await useFetch(`/api/workspaces/${workspaceId}/tables/${tableId}/rows`)
```

**After:**
```typescript
const { rows, columns, isLoading } = useTableData(tableId)
```

**Status:** ✅ Composable ready, just need to update component

---

### Phase 2: Write Operations (Keep API for Now) ⏸️

**Do NOT migrate yet:**
- ❌ Creating workspaces
- ❌ Creating tables
- ❌ Creating/updating/deleting rows
- ❌ Updating user profile

**Why?**
- Electric syncs data **from PostgreSQL to client**
- Writes still need server-side validation, permissions, audit logs, etc.
- API handles these correctly

**How it works:**
1. User clicks "Create Workspace" → API POST `/api/workspaces`
2. API creates row in PostgreSQL
3. Electric automatically syncs new row to client (via live query)
4. UI updates automatically (reactive)

**Example:**
```typescript
// Write: Use API
const createWorkspace = async (name: string) => {
  await $fetch('/api/workspaces', {
    method: 'POST',
    body: { name }
  })
  // Don't need to refetch! Electric will sync automatically
}

// Read: Use Electric
const { workspaces } = useWorkspaces()
```

---

## Migration Checklist

### Components to Update

#### High Priority (Most Used)
- [ ] `app/components/app/menu/WorkspaceMenu.vue` - Replace workspace fetch with `useWorkspaces()`
- [ ] `app/components/app/table/TableDataGrid.vue` - Replace table data fetch with `useTableData()`
- [ ] `app/components/app/views/DataTableList.vue` - Replace tables fetch with `useDataTables()`
- [ ] `app/pages/profile.vue` - Replace user fetch with `useUsers()`

#### Medium Priority
- [ ] `app/components/app/dashboard/DashboardStats.vue` - Replace stats queries
- [ ] `app/components/app/folder/FolderTree.vue` - Replace workspace/table tree
- [ ] Company settings pages - Use `useCompany()`

#### Low Priority (Later)
- [ ] Search/filter components
- [ ] Admin pages
- [ ] Analytics

---

## Example Migration: TableDataGrid Component

### Before (API)
```vue
<script setup>
const props = defineProps<{ tableId: string }>()
const { data: rows, pending } = await useFetch(`/api/tables/${props.tableId}/rows`)
const { data: columns } = await useFetch(`/api/tables/${props.tableId}/columns`)

// Need to refetch on changes
const refresh = () => {
  refreshNuxtData()
}
</script>

<template>
  <div v-if="pending">Loading...</div>
  <DataGrid v-else :rows="rows" :columns="columns" @refresh="refresh" />
</template>
```

### After (Electric)
```vue
<script setup>
const props = defineProps<{ tableId: string }>()
const { rows, columns, isLoading } = useTableData(props.tableId)

// No refresh needed! Data updates automatically via live queries
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <DataGrid v-else :rows="rows" :columns="columns" />
  <!-- No @refresh event - data is always fresh! -->
</template>
```

**Key Differences:**
- ✅ No `await` - data loads in background
- ✅ No `refresh()` - updates automatically
- ✅ Works offline
- ✅ Instant (local query)

---

## Missing Composables

We still need to create:

### 1. `useWorkspaces()` - Similar to `useDataTables()`
```typescript
// app/composables/useWorkspaces.ts
export const useWorkspaces = (companyId?: MaybeRef<string | null>) => {
  const { syncTable, watchQuery, getDB } = useSecureElectricSync()
  // ... similar to useDataTables implementation
  return {
    workspaces,
    isLoading,
    getWorkspaceById,
    getWorkspaceBySlug,
  }
}
```

### 2. `useWorkspace()` - Single workspace
```typescript
// app/composables/useWorkspace.ts
export const useWorkspace = (workspaceId: MaybeRef<string | null>) => {
  const { workspaces } = useWorkspaces()
  const workspace = computed(() => {
    const id = unref(workspaceId)
    return workspaces.value.find(w => w.id === id)
  })
  return { workspace }
}
```

---

## Testing Strategy

### 1. Side-by-Side Testing
Keep both implementations temporarily:
```typescript
// Old API version
const apiRows = await $fetch('/api/tables/123/rows')

// New Electric version
const { rows: electricRows } = useTableData('123')

// Compare
console.log('API:', apiRows.length, 'Electric:', electricRows.value.length)
```

### 2. Feature Flags
```typescript
const useElectric = useRuntimeConfig().public.useElectric // false by default

if (useElectric) {
  const { rows } = useTableData(tableId)
} else {
  const { data: rows } = await useFetch(`/api/tables/${tableId}/rows`)
}
```

### 3. Gradual Rollout
1. Start with `/electric-migration-poc` page (already done)
2. Migrate profile page
3. Migrate workspace menu
4. Migrate table views
5. Enable for all pages

---

## Performance Benefits

### Before (API)
```
User clicks workspace → 
  API call (100-500ms) → 
    Wait for response → 
      Render
```

### After (Electric)
```
User clicks workspace → 
  Query PGlite (1-5ms) → 
    Instant render
```

**Plus:**
- ✅ Data preloaded in background
- ✅ Automatic updates (no polling)
- ✅ Offline support
- ✅ Reduced server load

---

## Next Steps

1. **Create `useWorkspaces()` composable**
2. **Update workspace menu** to use Electric
3. **Update table list** to use `useDataTables()`
4. **Update table grid** to use `useTableData()`
5. **Add feature flag** for gradual rollout

Want to start with one of these? I'd recommend starting with **workspace menu** since it's visible on every page! 🚀

