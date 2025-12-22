# Column Order vs View Order - Architectural Decision

## The Question

When a user drags to reorder columns, should we update:
1. **`dataTableColumns.order`** (global column order), OR
2. **`dataTableView.visibleColumns`** (view-specific order)?

## The Answer: View Order ✅

**Column reordering updates the VIEW order, NOT the column metadata order.**

---

## Why This Matters

### Two Types of Order

#### 1. **Column Metadata Order** (`dataTableColumns.order`)
- **Purpose**: Default/canonical order
- **Used when**: Creating new views
- **Scope**: Global (affects all new views)
- **Updated by**: System/admin when defining table structure

#### 2. **View Column Order** (`dataTableView.visibleColumns`)
- **Purpose**: View-specific customization
- **Used when**: Displaying this specific view
- **Scope**: Per-view (each view can differ)
- **Updated by**: Users customizing their view ✅

---

## Implementation

### ❌ Wrong Approach (Before)

**API**: `PUT /columns/reorder`
```typescript
// Updates dataTableColumns.order
for (let i = 0; i < columnIds.length; i++) {
  await db.update(dataTableColumns)
    .set({ order: i })
    .where(eq(dataTableColumns.id, columnIds[i]))
}
```

**Problems**:
- Changes global column order
- Affects all views
- Loses per-view customization
- User can't have different orders in different views

---

### ✅ Correct Approach (After)

**API**: `PUT /columns/reorder`
```typescript
// Updates dataTableView.visibleColumns
await db.update(dataTableViews)
  .set({ visibleColumns: columnIds })
  .where(eq(dataTableViews.id, viewId))
```

**Benefits**:
- Each view maintains its own order
- Global column order stays stable
- New views use default order
- Users can customize per view

---

## Use Cases

### Scenario 1: Multiple Views with Different Orders

**Sales View**:
- Company, Contact, Revenue, Status

**Support View**:
- Company, Status, Priority, Created Date

**Same columns, different order per view** ✅

---

### Scenario 2: Team Preferences

**Manager View**:
- Name, Revenue, Close Date, Status

**Rep View**:
- Name, Status, Next Action, Contact

**Each user/role sees optimal order** ✅

---

### Scenario 3: Context-Specific Order

**Table View**: All fields in logical order
**Kanban View**: Only key fields
**Calendar View**: Date-focused order

**Different view types = different column needs** ✅

---

## Data Flow

### When User Drags Column

```
1. User drags column in DataGrid
   ↓
2. Frontend calculates new order
   ↓
3. Frontend sends: { viewId, columnIds }
   ↓
4. Backend updates: dataTableView.visibleColumns
   ↓
5. Column metadata order unchanged ✅
```

### When Creating New View

```
1. User creates new view
   ↓
2. System uses dataTableColumns.order
   ↓
3. Populates new view.visibleColumns
   ↓
4. User can then customize this view's order
```

---

## API Signature

### Before (Wrong)
```typescript
PUT /api/apps/[appSlug]/tables/[tableSlug]/columns/reorder
Body: {
  columnIds: string[]
}
```

### After (Correct) ✅
```typescript
PUT /api/apps/[appSlug]/tables/[tableSlug]/columns/reorder
Body: {
  viewId: string,      // Which view to update
  columnIds: string[]  // New order for this view
}
```

---

## Database Impact

### Before
```sql
-- Updates column metadata (WRONG)
UPDATE data_table_columns 
SET "order" = 0 
WHERE id = 'col-1';

UPDATE data_table_columns 
SET "order" = 1 
WHERE id = 'col-2';
```

**Problem**: Global change affects all views

---

### After ✅
```sql
-- Updates view order (CORRECT)
UPDATE data_table_views 
SET visible_columns = '["col-2", "col-1", "col-3"]'
WHERE id = 'view-123';
```

**Benefit**: Only affects this specific view

---

## When Column Order SHOULD Change

The global `dataTableColumns.order` should only change when:

1. **Admin redefines table structure**
2. **Schema migration**
3. **Default order needs updating**
4. **New columns added** (append to end)

But **NOT** when users drag columns in a view!

---

## Testing

### Test 1: Reorder in View A
1. Create View A
2. Drag columns to new order
3. ✅ View A shows new order
4. ✅ Other views unchanged

### Test 2: Create New View
1. Reorder columns in View A
2. Create View B
3. ✅ View B uses default order (not View A's)

### Test 3: Multiple Users
1. User A reorders in their view
2. User B opens same table
3. ✅ User B sees default order
4. ✅ Each can customize independently

---

## Architecture Diagram

```
┌─────────────────────────────────────┐
│      dataTableColumns (Metadata)    │
│                                     │
│  - id: col-1                        │
│  - name: "company"                  │
│  - order: 0  ← Default/canonical    │
│                                     │
│  - id: col-2                        │
│  - name: "contact"                  │
│  - order: 1  ← Never changed by     │
│                  user drag!         │
└─────────────────────────────────────┘
                  │
                  │ Used as default for
                  │ new views only
                  ↓
┌─────────────────────────────────────┐
│      dataTableViews (Per-View)      │
│                                     │
│  View A: "Sales Pipeline"           │
│  - visibleColumns: [col-1, col-2]   │
│                                     │
│  View B: "Support Queue"            │
│  - visibleColumns: [col-2, col-1]   │
│                    ↑                │
│                    └ Different order│
│                      per view ✅     │
└─────────────────────────────────────┘
```

---

## Key Takeaways

1. ✅ **User drag** = Update view order
2. ✅ **Each view** = Independent order
3. ✅ **Column metadata** = Default only
4. ✅ **New views** = Start with default
5. ✅ **Flexibility** = Users customize freely

---

## Related Files

- `server/api/apps/[appSlug]/tables/[tableSlug]/columns/reorder.put.ts` - Reorder API
- `app/pages/apps/[appSlug]/tables/[tableSlug]/index.vue` - Frontend handler
- `server/db/schema/dataTableColumn.ts` - Column metadata
- `server/db/schema/dataTableView.ts` - View configuration

---

**Status**: ✅ Implemented correctly  
**Impact**: Enables per-view customization  
**Date**: December 22, 2025

