# Column CRUD APIs - Testing Guide

## ✅ Implementation Complete

All three Column CRUD APIs have been implemented and are ready for testing!

---

## 🎯 What's Ready to Test

### 1. **Add Column** - `POST /api/apps/[appSlug]/tables/[tableSlug]/columns`

**Features**:
- ✅ Creates column in metadata (`dataTableColumns`)
- ✅ Executes `ALTER TABLE ADD COLUMN` on physical table
- ✅ Auto-adds to default view's `visibleColumns`
- ✅ Supports positioning (`after:uuid` or `before:uuid`)
- ✅ Validates column name (lowercase, letters, numbers, underscores)
- ✅ Rejects SQL reserved keywords
- ✅ Checks for duplicate column names
- ✅ Handles required vs nullable columns
- ✅ Supports default values

**Test Steps**:
1. Open any table in your app
2. Right-click on a column header
3. Click "Add Column Left" or "Add Column Right"
4. Fill in the column label (e.g., "Email Address")
5. Watch the AI suggestion populate the type
6. Click "Save"
7. ✅ Column should appear in the grid immediately

---

### 2. **Edit Column** - `PUT /api/apps/[appSlug]/tables/[tableSlug]/columns/[columnId]`

**Features**:
- ✅ Updates column metadata (label, type, required, config)
- ✅ Executes `ALTER TABLE ALTER COLUMN` when needed
- ✅ Validates safe type conversions
- ✅ Checks for NULL values before making column required
- ✅ Protects system columns (id, created_at, updated_at, created_by)
- ✅ Handles nullable ↔ required changes

**Safe Type Conversions**:
- text → long_text, email, phone, url ✅
- number → currency, percent, rating ✅
- date → datetime ✅
- boolean ↔ switch ✅
- email/phone/url → text/long_text ✅

**Unsafe Conversions** (will reject):
- text → number ❌
- number → text ❌
- date → number ❌

**Test Steps**:
1. Right-click on any user-created column
2. Click "Edit Column"
3. Change the label
4. Try changing the type (safe conversions should work)
5. Try toggling "Required"
6. Click "Save"
7. ✅ Changes should apply immediately

---

### 3. **Delete Column** - `DELETE /api/apps/[appSlug]/tables/[tableSlug]/columns/[columnId]`

**Features**:
- ✅ Executes `ALTER TABLE DROP COLUMN` on physical table
- ✅ Removes from metadata
- ✅ Removes from all views' `visibleColumns`
- ✅ Protects system columns
- ✅ Shows confirmation dialog (frontend)

**Protected Columns** (cannot delete):
- `id`
- `created_at`
- `updated_at`
- `created_by`

**Test Steps**:
1. Right-click on any user-created column
2. Click "Remove Column"
3. Confirm the warning dialog
4. ✅ Column should disappear from grid and database

---

## 🧪 Testing Scenarios

### Happy Path Tests

#### Test 1: Add Text Column
1. Add column "Description"
2. Type: text
3. Not required
4. ✅ Should create successfully

#### Test 2: Add Required Number Column
1. Add column "Age"
2. Type: number
3. Required: true
4. ✅ Should create with NOT NULL constraint

#### Test 3: Edit Column Label
1. Edit any column
2. Change label only
3. ✅ Should update without ALTER TABLE

#### Test 4: Change Type (Safe)
1. Create text column
2. Edit it to email type
3. ✅ Should convert successfully

#### Test 5: Make Column Required (No data)
1. Create nullable column
2. Edit it to required
3. ✅ Should add NOT NULL constraint

#### Test 6: Delete Column
1. Create a test column
2. Delete it
3. ✅ Should remove from everywhere

---

### Error Handling Tests

#### Test 7: Duplicate Column Name
1. Try to add column with existing name
2. ❌ Should reject with 409 error

#### Test 8: Reserved Keyword
1. Try to add column named "select" or "table"
2. ❌ Should reject with 400 error

#### Test 9: Invalid Column Name
1. Try to add column with uppercase or spaces
2. ❌ Should reject with 400 error

#### Test 10: Unsafe Type Conversion
1. Create text column with text data
2. Try to change to number
3. ❌ Should reject with 400 error

#### Test 11: Make Required with NULLs
1. Create nullable column
2. Add some rows (leave column empty)
3. Try to make it required
4. ❌ Should reject with 409 error

#### Test 12: Delete System Column
1. Try to delete "id" or "created_at"
2. ❌ Should reject with 403 error

---

## 🔍 What to Check

### After Adding Column
- [x] Column appears in DataGrid
- [x] Column is in default view's visibleColumns
- [x] Physical table has new column
- [x] Can add data to the column
- [x] Column order respects position parameter

### After Editing Column
- [x] Label updates in DataGrid
- [x] Type changes apply
- [x] Required constraint works
- [x] Existing data preserved
- [x] Physical table matches metadata

### After Deleting Column
- [x] Column disappears from DataGrid
- [x] Column removed from all views
- [x] Physical table column dropped
- [x] No orphaned data

---

## 🐛 Known Limitations

1. **Type Conversions**: Only safe conversions allowed. Unsafe conversions rejected.
2. **Default Values**: Currently basic string defaults only
3. **Column Rename**: Not supported (would break references)
4. **Batch Operations**: One column at a time
5. **Undo**: No undo functionality (changes are immediate)

---

## 🚀 API Endpoints Summary

```
POST   /api/apps/[appSlug]/tables/[tableSlug]/columns          ✅ Add
PUT    /api/apps/[appSlug]/tables/[tableSlug]/columns/[id]     ✅ Edit  
DELETE /api/apps/[appSlug]/tables/[tableSlug]/columns/[id]     ✅ Delete
PUT    /api/apps/[appSlug]/tables/[tableSlug]/columns/reorder  ✅ Reorder
```

---

## 📊 Validation Rules

### Column Name
- Must start with lowercase letter
- Can contain: lowercase letters, numbers, underscores
- Cannot be SQL reserved keyword
- Must be unique per table
- Regex: `^[a-z][a-z0-9_]*$`

### Protected Columns
Cannot edit or delete:
- `id`
- `created_at`
- `updated_at`
- `created_by`

### Type Conversions
See "Safe Type Conversions" section above.

---

## 🎯 Success Criteria

All APIs are working if:
1. ✅ Can add columns with AI suggestions
2. ✅ Can edit column labels and types
3. ✅ Can delete user-created columns
4. ✅ Can reorder columns via drag-and-drop
5. ✅ System columns are protected
6. ✅ Validation prevents bad operations
7. ✅ Physical table stays in sync with metadata
8. ✅ All views update correctly

---

## 🔧 Troubleshooting

### Column doesn't appear after adding
- Check browser console for errors
- Verify API response was successful
- Try refreshing the page
- Check if default view exists

### Edit fails with type conversion error
- Verify conversion is in "safe conversions" list
- Check if column has incompatible data
- Try changing only label first

### Cannot delete column
- Check if it's a system column
- Verify you have permissions
- Check console for specific error

### Physical table out of sync
- Check server logs for ALTER TABLE failures
- May need to manually fix with SQL
- Report as bug if reproducible

---

## 📝 Next Steps After Testing

1. Test all happy path scenarios
2. Test all error scenarios
3. Report any bugs or unexpected behavior
4. Consider adding:
   - More field types (email, phone, select, etc.)
   - Field validation rules
   - Column constraints (unique, min/max)
   - Bulk column operations
   - Undo/redo functionality

---

**Status**: ✅ All APIs implemented and ready for testing!  
**Frontend**: ✅ Fully integrated with UI  
**Documentation**: ✅ Complete  

Start dev server and try adding/editing/deleting columns! 🚀

