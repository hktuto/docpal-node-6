# Separation of Concerns Fix - Column Creation & Views

## Problem Identified

The initial implementation of the `POST /columns` API automatically added new columns to the default view. This violated separation of concerns because:

1. **API mixing responsibilities**: The column creation API was responsible for both creating columns AND updating views
2. **Lack of flexibility**: Other contexts using `ColumnDialog` might not need view updates
3. **Tight coupling**: Column creation logic was coupled to view logic

## Solution Implemented

### 1. **API Layer** - Column Creation Only

**File**: `server/api/apps/[appSlug]/tables/[tableSlug]/columns/index.post.ts`

**Changed**:
- ❌ Removed automatic view update logic
- ✅ API now ONLY creates column in metadata + physical table
- ✅ Returns the created column object

**Responsibilities**:
- Create column in `dataTableColumns` table
- Execute `ALTER TABLE ADD COLUMN`
- Update column ordering
- Return created column data

---

### 2. **Component Layer** - Emit Column Data

**File**: `app/components/app/table/ColumnDialog.vue`

**Changed**:
- ✅ Updated emit signature to include column data
- ✅ Captures API response
- ✅ Emits created/updated column to parent

**Before**:
```typescript
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved'): void  // ❌ No data
}>()

emit('saved')  // ❌ No column data passed
```

**After**:
```typescript
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved', column: DataTableColumn): void  // ✅ Includes column
}>()

const response: any = await $api(...)
emit('saved', response.data)  // ✅ Pass column data
```

---

### 3. **Page Layer** - Handle View Updates

**File**: `app/pages/apps/[appSlug]/tables/[tableSlug]/index.vue`

**Changed**:
- ✅ Receives column data from dialog
- ✅ Decides whether to add to view (only for new columns, not edits)
- ✅ Calculates correct insertion position
- ✅ Updates view via new PUT endpoint

**Logic**:
```typescript
async function handleColumnSaved(savedColumn: DataTableColumn) {
  if (savedColumn && currentView.value?.data && !editingColumn.value) {
    // Only add to view if it's a NEW column (not editing)
    
    // Calculate insert position based on columnPosition
    // Update view's visibleColumns array
    // Call PUT /views/[viewId] API
  }
  
  // Refresh to show updated data
  await refreshView()
  await refreshTable()
}
```

---

### 4. **New API** - Update View

**File**: `server/api/apps/[appSlug]/tables/[tableSlug]/views/[viewId].put.ts`

**Created**: New endpoint for updating views

**Features**:
- Updates any view property (name, slug, type, visibleColumns, etc.)
- Returns enriched view data with full column objects
- Validates view exists
- Updates `updatedAt` timestamp

**Usage**:
```typescript
PUT /api/apps/[appSlug]/tables/[tableSlug]/views/[viewId]
Body: {
  visibleColumns: ['col-1', 'col-2', 'col-3']
}
```

---

## Benefits of This Approach

### 1. **Separation of Concerns** ✅
- **API**: Creates columns (single responsibility)
- **Component**: Emits data (reusable)
- **Page**: Decides what to do with data (context-specific)

### 2. **Flexibility** ✅
- `ColumnDialog` can be used in other contexts
- Some contexts may not have views
- Parent component decides the behavior

### 3. **Testability** ✅
- Each layer can be tested independently
- Clear boundaries between layers
- Easier to mock dependencies

### 4. **Maintainability** ✅
- Changes to view logic don't affect API
- API stays focused on column operations
- Clear data flow: API → Component → Page

---

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│         User Action (Right-click)           │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│     index.vue (Table View Page)             │
│  - Opens ColumnDialog                       │
│  - Passes position (after:uuid)             │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│     ColumnDialog Component                  │
│  - User fills form                          │
│  - Calls POST /columns API                  │
│  - Emits saved(columnData)                  │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌──────────────┐    ┌──────────────────────┐
│  POST        │    │  Emit Event          │
│  /columns    │    │  saved(column)       │
│              │    │                      │
│ - Create     │    └──────────┬───────────┘
│   metadata   │               │
│ - ALTER      │               │
│   TABLE      │               │
│ - Return     │               │
│   column     │               │
└──────────────┘               │
                               ▼
                   ┌─────────────────────────┐
                   │  index.vue Handler      │
                   │  - Receives column      │
                   │  - Calculates position  │
                   │  - Calls PUT /views/[id]│
                   └────────────┬────────────┘
                                │
                                ▼
                   ┌─────────────────────────┐
                   │  PUT /views/[id]        │
                   │  - Updates view         │
                   │  - Returns enriched view│
                   └─────────────────────────┘
```

---

## Files Changed

### Created (1)
1. `server/api/apps/[appSlug]/tables/[tableSlug]/views/[viewId].put.ts` - New view update endpoint

### Modified (3)
1. `server/api/apps/[appSlug]/tables/[tableSlug]/columns/index.post.ts` - Removed view update logic
2. `app/components/app/table/ColumnDialog.vue` - Emit column data
3. `app/pages/apps/[appSlug]/tables/[tableSlug]/index.vue` - Handle view update

---

## Testing Checklist

### Column Creation
- [x] Create column via dialog
- [x] Column appears in metadata
- [x] Column appears in physical table
- [x] Column data emitted to parent

### View Update (Table Page)
- [x] New column added to view's visibleColumns
- [x] Column appears in correct position (left/right)
- [x] Grid refreshes and shows new column
- [x] Edit mode does NOT add column again

### Reusability
- [ ] ColumnDialog can be used in settings page
- [ ] ColumnDialog can be used without view context
- [ ] Parent controls what happens after save

---

## Code Quality

### Before
- ❌ API had multiple responsibilities
- ❌ Tight coupling between columns and views
- ❌ Hard to reuse ColumnDialog
- ❌ View update hidden in API layer

### After
- ✅ Clear separation of concerns
- ✅ Each layer has single responsibility
- ✅ ColumnDialog is reusable
- ✅ View update is explicit and visible
- ✅ Easy to test each layer

---

## User Experience

**No change** - Users still experience the same flow:
1. Right-click column header
2. Click "Add Column Left/Right"
3. Fill in column details
4. Click "Save"
5. ✅ Column appears in grid

The difference is **architectural**, not functional.

---

## Future Enhancements

With this architecture, it's now easy to:

1. **Use ColumnDialog in other contexts**:
   - Settings page
   - Table builder
   - Schema editor

2. **Add more view operations**:
   - Hide column from view
   - Change column width in view
   - Reorder columns in view

3. **Support multiple views**:
   - Different views can show different columns
   - Parent decides which view to update

---

## Summary

This refactoring improves the codebase by:
- ✅ Following single responsibility principle
- ✅ Making components more reusable
- ✅ Improving testability
- ✅ Clarifying data flow
- ✅ Enabling future flexibility

**Status**: ✅ Complete  
**Testing**: Ready for QA  
**Impact**: Architectural improvement, no UX change

