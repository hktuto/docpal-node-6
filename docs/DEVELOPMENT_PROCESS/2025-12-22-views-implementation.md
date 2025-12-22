# Views Implementation - December 22, 2025

## Overview

Implemented the new `dataTableView` system and simplified table creation to only require name and description. The system now auto-generates default columns and creates a default view for each table.

---

## Part 1: Simplified Table Creation

### Changes Made

#### 1. **Backend: Auto-Generate Default Columns**

**File**: `server/api/apps/[appSlug]/tables/index.post.ts`

- Added `generateDefaultColumns()` function that creates a default "name" column
- Made `columns` parameter optional in the API
- System columns (id, created_at, updated_at) are still auto-added by `createPhysicalTable()`

**Default Column**:
```typescript
{
  name: 'name',
  label: 'Name',
  type: 'text',
  required: true,
  order: 0,
  config: { placeholder: 'Enter name...' }
}
```

#### 2. **Frontend: Simplified Create Dialog**

**File**: `app/components/app/table/CreateDialog.vue`

- Removed default column from initial form state
- Added info alert explaining default column will be created
- Made columns section clearly optional with "(Optional)" badge
- Columns can now be added optionally by the user

**User Experience**:
- User enters table name and description
- Can optionally add custom columns
- If no columns added, system creates default "name" column
- Much faster table creation workflow!

---

## Part 2: View System Implementation

### Architecture Decision: Backend Returns Full Column Data ✅

**Why this approach?**
1. ✅ **Less frontend complexity** - No need to map IDs to columns
2. ✅ **Efficient JOIN queries** - Backend can optimize database queries
3. ✅ **Single source of truth** - Backend controls data shape
4. ✅ **Better caching** - Can cache enriched views
5. ✅ **Easier to maintain** - Logic centralized in backend

### API Endpoints Created

#### 1. **GET `/api/apps/[appSlug]/tables/[tableSlug]/views`**
**Purpose**: List all views for a table

**Response**:
```typescript
{
  data: [
    {
      id: "uuid",
      name: "All Records",
      slug: "all-records",
      type: "table",
      isDefault: true,
      visibleColumns: ["col-id-1", "col-id-2"], // IDs for reference
      columns: [ // Full column objects (enriched)
        { id: "col-id-1", name: "name", label: "Name", type: "text", ... },
        { id: "col-id-2", name: "email", label: "Email", type: "email", ... }
      ],
      filters: { operator: "AND", conditions: [] },
      sort: [],
      viewConfig: { rowHeight: "default", showRowNumbers: true }
    }
  ]
}
```

#### 2. **GET `/api/apps/[appSlug]/tables/[tableSlug]/views/[viewId]`**
**Purpose**: Get a specific view by ID or slug

**Response**:
```typescript
{
  data: {
    // ... same as above, plus:
    allColumns: [ /* All table columns for reference */ ]
  }
}
```

#### 3. **GET `/api/apps/[appSlug]/tables/[tableSlug]/views/default`**
**Purpose**: Convenience endpoint to get the default view

**Response**: Same as single view endpoint

### Backend Implementation Details

**Column Enrichment Process**:
1. Fetch view from database
2. Fetch all columns for the table
3. Create a Map for O(1) column lookups
4. Map `visibleColumns` (array of IDs) to full column objects
5. Filter out any columns that no longer exist
6. Return enriched view with full column data

**Performance Optimization**:
- Single query for all columns (not N+1)
- Map-based lookups (O(1) instead of O(n))
- Columns ordered as specified in view

---

## Part 3: Frontend Integration

### 1. **Table View Page Updates**

**File**: `app/pages/apps/[appSlug]/tables/[tableSlug]/index.vue`

**Changes**:
- Added `currentView` fetch using `/views/default` endpoint
- Updated `gridColumns` to use view's visible columns
- Respects column order from view
- Applies custom column widths from view config
- Respects `isHidden` flag on columns
- Shows loading state for both table and view

**Before**:
```typescript
// Used table.columns directly
const gridColumns = computed(() => {
  if (!table.value?.columns) return []
  return table.value.columns.map(col => ({ ... }))
})
```

**After**:
```typescript
// Uses view's columns (already filtered and ordered)
const gridColumns = computed(() => {
  if (!currentView.value?.columns) return []
  return currentView.value.columns.map(col => {
    const customWidths = currentView.value?.columnWidths
    const width = customWidths?.[col.id]
    return {
      field: col.name,
      title: col.label,
      width: width || 120,
      visible: !col.isHidden,
      sortable: true,
    }
  })
})
```

### 2. **DataGrid Component Updates**

**File**: `layers/datagrid/app/components/DataGrid.vue`

**Changes**:
- Added `visible` property to Column interface
- Filter out hidden columns in `buildColumns()`
- Columns with `visible: false` are not rendered

**Enhancement**:
```typescript
interface Column {
  // ... existing properties
  visible?: boolean // NEW: Support column visibility from view
}

function buildColumns(): any[] {
  return props.columns
    .filter(col => col.visible !== false) // Filter hidden columns
    .map(col => ({ ... }))
}
```

---

## Data Flow

### Table Creation Flow
```
User Input (name + description)
  ↓
Frontend: CreateDialog.vue
  ↓
POST /api/apps/[appSlug]/tables
  ↓
Backend: Generate default columns
  ↓
Create physical table
  ↓
Insert table metadata
  ↓
Insert column metadata
  ↓
Create default view (with column IDs)
  ↓
Return success
```

### View Loading Flow
```
Page Load
  ↓
Fetch table metadata (for context)
  ↓
Fetch default view
  ↓
Backend enriches view with full column data
  ↓
Frontend receives view + columns
  ↓
Transform columns for DataGrid
  ↓
Apply view settings (order, width, visibility)
  ↓
Render grid
```

---

## Benefits

### For Users
1. **Faster table creation** - Just name and description needed
2. **Flexible column management** - Add columns now or later
3. **Multiple views** - Can create custom views per table (future)
4. **Persistent view settings** - Column order, width, filters saved

### For Developers
1. **Clean separation** - Table structure vs. presentation
2. **Backend control** - Data shape managed centrally
3. **Easy to extend** - Add new view types without frontend changes
4. **Type-safe** - Full TypeScript support throughout

### For Performance
1. **Efficient queries** - Single JOIN for column enrichment
2. **Reduced payload** - Only visible columns sent to frontend
3. **Better caching** - Can cache enriched views
4. **Virtual scrolling** - DataGrid handles large datasets

---

## Type Definitions

### Backend Types
```typescript
// server/db/schema/dataTableView.ts
export const dataTableViews = pgTable('data_table_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  dataTableId: uuid('data_table_id').notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  type: text('type').notNull().default('table'),
  isDefault: boolean('is_default').notNull().default(false),
  visibleColumns: jsonb('visible_columns').$type<string[]>(),
  columnWidths: jsonb('column_widths').$type<Record<string, number>>(),
  filters: jsonb('filters').$type<FilterConfig>(),
  sort: jsonb('sort').$type<SortConfig[]>(),
  viewConfig: jsonb('view_config').$type<ViewConfig>(),
  // ... timestamps, etc.
})
```

### Shared Types
```typescript
// shared/types/db.ts
export type DataTableView = typeof dataTableViews.$inferSelect
export type NewDataTableView = typeof dataTableViews.$inferInsert
```

---

## Testing Checklist

### Backend
- [x] Table creation with no columns creates default "name" column
- [x] Table creation with custom columns works as before
- [x] Default view is created automatically
- [x] View endpoints return enriched data with full columns
- [x] Column ordering matches view configuration
- [x] Hidden columns are filtered out

### Frontend
- [x] Create dialog shows optional columns section
- [x] Info alert explains default column creation
- [x] Table view page fetches and uses default view
- [x] Grid respects column order from view
- [x] Grid respects column widths from view
- [x] Grid respects column visibility
- [x] Loading states work correctly

### Integration
- [ ] Create table → View created → Grid displays correctly
- [ ] Custom columns → View includes all columns
- [ ] Column visibility → Grid hides columns
- [ ] Column widths → Grid applies custom widths

---

## Future Enhancements

### Phase 2.4 (Column Management)
- [ ] Add/edit/delete columns after table creation
- [ ] Update view's `visibleColumns` when columns change
- [ ] Handle column deletion (remove from view configs)

### Phase 2.5+ (View Management)
- [ ] Create custom views UI
- [ ] View switcher component
- [ ] Filter builder UI
- [ ] Sort configuration UI
- [ ] View sharing (isPublic flag)
- [ ] View templates
- [ ] Multiple view types (kanban, calendar, gantt)

---

## Files Changed

### Backend
- ✅ `server/api/apps/[appSlug]/tables/index.post.ts` - Simplified table creation
- ✅ `server/api/apps/[appSlug]/tables/[tableSlug]/views/index.get.ts` - List views
- ✅ `server/api/apps/[appSlug]/tables/[tableSlug]/views/[viewId].get.ts` - Get view
- ✅ `server/api/apps/[appSlug]/tables/[tableSlug]/views/default.get.ts` - Get default view
- ✅ `server/db/schema/dataTableView.ts` - View schema
- ✅ `shared/types/db.ts` - Type exports

### Frontend
- ✅ `app/pages/apps/[appSlug]/tables/[tableSlug]/index.vue` - Use view settings
- ✅ `app/components/app/table/CreateDialog.vue` - Simplified UI
- ✅ `layers/datagrid/app/components/DataGrid.vue` - Column visibility support

---

## Migration Notes

### Existing Tables
- Old tables without views will need migration (future task)
- Can run a script to create default views for existing tables

### Database
- Migration `0001_add_data_table_views.sql` creates new table
- Adds new columns to `data_table_columns` (isHidden, etc.)

---

**Status**: ✅ Complete  
**Next Steps**: Phase 2.4 - Column Management (add/edit/delete columns)

