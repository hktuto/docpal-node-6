# API Status - December 22, 2025

## Views API ✅ Complete

All view endpoints are fully implemented and tested:

```
GET    /api/apps/[appSlug]/tables/[tableSlug]/views
GET    /api/apps/[appSlug]/tables/[tableSlug]/views/[viewId]
GET    /api/apps/[appSlug]/tables/[tableSlug]/views/default
```

**Features**:
- Backend enriches `visibleColumns` with full `DataTableColumn` objects
- Supports multiple views per table
- Default view auto-created on table creation
- View-specific column order, widths, filters, sorting

---

## Column Reorder API ✅ Complete

```
PUT    /api/apps/[appSlug]/tables/[tableSlug]/columns/reorder
```

**Request**:
```json
{
  "columnIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Implementation**:
- Frontend calculates new order from drag event
- Backend sets `order` = array index for each column
- Batch update in single transaction

---

## Column CRUD APIs 🟡 Pending

These APIs need to be implemented:

### 1. Add Column
```
POST   /api/apps/[appSlug]/tables/[tableSlug]/columns
```

**Request**:
```json
{
  "name": "email",
  "label": "Email Address",
  "type": "text",
  "required": true,
  "config": {
    "maxLength": 255,
    "placeholder": "name@example.com"
  },
  "position": "after:uuid-of-previous-column"
}
```

**Tasks**:
- [ ] Validate column name (no duplicates, no SQL keywords)
- [ ] Add to `dataTableColumns` table
- [ ] Execute `ALTER TABLE ... ADD COLUMN ...`
- [ ] Update default view's `visibleColumns`
- [ ] Handle rollback on failure
- [ ] Return full column object

---

### 2. Edit Column
```
PUT    /api/apps/[appSlug]/tables/[tableSlug]/columns/[columnId]
```

**Request**:
```json
{
  "label": "Updated Label",
  "type": "text",
  "required": false,
  "config": {
    "maxLength": 500
  }
}
```

**Tasks**:
- [ ] Validate changes (safe type conversions)
- [ ] Check for existing data
- [ ] Update `dataTableColumns` table
- [ ] Execute `ALTER TABLE ... ALTER COLUMN ...` if needed
- [ ] Handle data migration if type changed
- [ ] Handle rollback on failure

**Constraints**:
- Cannot rename column if data exists (breaking change)
- Type changes need validation
- Cannot make nullable column required if NULL values exist

---

### 3. Delete Column
```
DELETE /api/apps/[appSlug]/tables/[tableSlug]/columns/[columnId]
```

**Tasks**:
- [ ] Check if column has data (warn user)
- [ ] Remove from `dataTableColumns` table
- [ ] Remove from all views' `visibleColumns`
- [ ] Execute `ALTER TABLE ... DROP COLUMN ...`
- [ ] Handle rollback on failure

**Safety**:
- Cannot delete protected columns (id, created_at, updated_at)
- Warn if column has data
- Require confirmation for destructive action

---

## AI Suggestion API ✅ Complete (Updated)

```
POST   /api/ai/suggest-column-type
```

**Request**:
```json
{
  "columnName": "email_address",
  "columnLabel": "Email Address",
  "appSlug": "my-app"
}
```

**Response** (Simplified):
```json
{
  "type": "text",
  "required": true,
  "config": {
    "maxLength": 255,
    "placeholder": "name@example.com"
  },
  "aiEnabled": true
}
```

**Changes Made**:
- ✅ Removed verbose fields (confidence, reason, provider)
- ✅ Simplified response structure
- ✅ Integrated with ColumnDialog (500ms debounce)

---

## Implementation Priority

### Week 1: Column CRUD (Critical)
1. **Day 1-2**: Implement add column API
   - Validation
   - ALTER TABLE ADD COLUMN
   - Update views
   - Error handling

2. **Day 3-4**: Implement edit column API
   - Safe type conversions
   - ALTER TABLE ALTER COLUMN
   - Data migration
   - Error handling

3. **Day 5**: Implement delete column API
   - Safety checks
   - ALTER TABLE DROP COLUMN
   - Update views
   - Error handling

### Week 2: Field Types
- email, phone, url
- select, multi-select
- rating, currency, percent

### Week 3+: Advanced Types
- formula, aggregation
- relation, lookup
- markdown, file

---

## Database Operations Needed

### Safe Operations (Green Light 🟢)
- Add column (non-nullable with default)
- Add column (nullable)
- Rename column label (metadata only)
- Change column config (metadata only)
- Reorder columns (metadata only)

### Risky Operations (Yellow Light 🟡)
- Change column type (needs validation)
- Make nullable → required (check for NULLs first)
- Make required → nullable (usually safe)
- Add constraint (check existing data)

### Dangerous Operations (Red Light 🔴)
- Rename column name (breaks references)
- Delete column with data (data loss)
- Change type incompatibly (e.g., text → number with non-numeric data)
- Make nullable → required with existing NULLs (fails)

---

## Error Handling Strategy

### Validation Errors (400)
- Duplicate column name
- Invalid column type
- Reserved SQL keyword
- Invalid configuration

### Conflict Errors (409)
- Column already exists
- Cannot change type (incompatible data)
- Cannot make required (NULL values exist)

### Internal Errors (500)
- ALTER TABLE failed
- Database transaction failed
- Rollback failed

### Strategy
1. Validate thoroughly before database operations
2. Use database transactions
3. Rollback on any failure
4. Return detailed error messages
5. Log all operations for debugging

---

## Testing Checklist

### Add Column
- [ ] Add text column successfully
- [ ] Add column with all field types
- [ ] Reject duplicate column names
- [ ] Reject SQL keywords
- [ ] Handle ALTER TABLE failure
- [ ] Column appears in default view
- [ ] Column appears in grid

### Edit Column
- [ ] Update label only
- [ ] Update config only
- [ ] Change nullable → required (safe)
- [ ] Reject required → nullable with NULLs
- [ ] Reject incompatible type changes
- [ ] Handle ALTER TABLE failure

### Delete Column
- [ ] Delete empty column
- [ ] Warn for column with data
- [ ] Reject protected columns
- [ ] Remove from all views
- [ ] Handle CASCADE properly

---

## Next Steps

1. **Create migration** for `dataTableViews` table
2. **Implement add column API** with full validation
3. **Test with all field types**
4. **Implement edit column API** with safety checks
5. **Implement delete column API** with warnings
6. **Add comprehensive tests**
7. **Document API usage**

---

**Status Summary**:
- ✅ Views: 100% complete
- ✅ Reorder: 100% complete  
- ✅ AI Suggestion: 100% complete
- 🟡 Add Column: 0% (UI ready)
- 🟡 Edit Column: 0% (UI ready)
- 🟡 Delete Column: 0% (UI ready)

**Overall**: 50% of column management APIs complete (3/6 endpoints)

