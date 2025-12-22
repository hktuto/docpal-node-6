# Testing Checklist - Column Management

## 🚀 Ready to Test!

All features are implemented and ready for manual testing.

---

## Quick Test Flow

### 1. **Add Column** (2 minutes)
```
1. Open any table
2. Right-click on any column header
3. Click "Add Column Right"
4. Type label: "Company Size"
5. Watch AI suggest type automatically
6. Click "Save"
✅ Column should appear immediately to the right
```

### 2. **Edit Column** (1 minute)
```
1. Right-click the new column
2. Click "Edit Column"
3. Change label to "Organization Size"
4. Click "Save"
✅ Column should update immediately
```

### 3. **Reorder Column** (30 seconds)
```
1. Click and drag the column header left or right
2. Drop it in a new position
✅ Column should move and stay there after refresh
```

### 4. **Delete Column** (30 seconds)
```
1. Right-click the column
2. Click "Remove Column"
3. Confirm the dialog
✅ Column should disappear from table and database
```

---

## Detailed Test Scenarios

### Scenario 1: Add Column with AI Suggestions
**Steps**:
1. Right-click any column → "Add Column Right"
2. Type label: "Email Address"
3. Wait 500ms for AI suggestion
4. Verify type becomes "text" automatically
5. Click "Save"

**Expected**:
- ✅ AI suggests type within 500ms
- ✅ Column name auto-generated: `email_address`
- ✅ Column appears in correct position
- ✅ Column persists after refresh

---

### Scenario 2: Add Column Left
**Steps**:
1. Right-click first column → "Add Column Left"
2. Type label: "ID"
3. Click "Save"

**Expected**:
- ✅ Column appears as first column
- ✅ All other columns shift right
- ✅ Order persists after refresh

---

### Scenario 3: Edit Column Type
**Steps**:
1. Create a text column
2. Right-click → "Edit Column"
3. Change type to "number"
4. Click "Save"

**Expected**:
- ✅ Type updates successfully
- ✅ Column metadata updated
- ✅ Physical table column type changed

---

### Scenario 4: Drag Multiple Times
**Steps**:
1. Drag column A to position 1
2. Drag column B to position 2
3. Drag column A to position 3
4. Refresh page

**Expected**:
- ✅ Each drag updates immediately
- ✅ Final position persists after refresh
- ✅ View's column order correct

---

### Scenario 5: Close Dialog Without Saving
**Steps**:
1. Right-click → "Add Column Right"
2. Start typing a label
3. Click X to close dialog (don't save)
4. Right-click another column → "Add Column Right"

**Expected**:
- ✅ Dialog closes without creating column
- ✅ Position state resets
- ✅ New dialog opens at correct position
- ✅ No stale data

---

### Scenario 6: Delete System Column (Should Fail)
**Steps**:
1. Right-click "id" column
2. Try to click "Remove Column"

**Expected**:
- ✅ Option should be disabled or show error
- ✅ System columns protected

---

### Scenario 7: Multiple Views
**Steps**:
1. Reorder columns in current view
2. Create a new view (when feature available)
3. Check new view's column order

**Expected**:
- ✅ New view uses default order
- ✅ Original view keeps custom order
- ✅ Each view independent

---

## Error Cases to Test

### 1. Duplicate Column Name
**Steps**:
1. Add column with name that already exists
2. Try to save

**Expected**:
- ❌ Should show error: "Column already exists"
- ✅ Dialog stays open
- ✅ User can fix and retry

---

### 2. Invalid Column Name
**Steps**:
1. Add column with uppercase or spaces
2. Try to save

**Expected**:
- ❌ Should show error about column name format
- ✅ User can fix and retry

---

### 3. SQL Reserved Word
**Steps**:
1. Try to create column named "select" or "table"
2. Try to save

**Expected**:
- ❌ Should reject with error
- ✅ Clear error message

---

## Performance Checks

### Add Column
- ✅ Should complete in < 2 seconds
- ✅ UI responsive during operation
- ✅ Success message appears

### Edit Column
- ✅ Should complete in < 1 second (metadata only)
- ✅ ALTER TABLE completes if type changed
- ✅ No UI freeze

### Delete Column
- ✅ Should complete in < 1 second
- ✅ Confirmation dialog clear
- ✅ Column disappears immediately

### Reorder Columns
- ✅ Drag feels smooth (60fps)
- ✅ API call in background
- ✅ Success message appears

---

## UI/UX Checks

### Column Dialog
- ✅ Opens quickly
- ✅ AI suggestion appears smoothly
- ✅ Generated name shown as hint
- ✅ Type selector works
- ✅ Required toggle works
- ✅ Close button works
- ✅ Cancel button works

### Context Menu
- ✅ Appears on right-click
- ✅ Options clear and visible
- ✅ Disabled options grayed out
- ✅ Menu closes after selection

### Drag and Drop
- ✅ Visual feedback during drag
- ✅ Drop zones clear
- ✅ Cursor changes appropriately
- ✅ Column follows mouse

---

## Data Integrity Checks

### After Add Column
- ✅ Column in `data_table_columns` table
- ✅ Column in physical table (ALTER TABLE executed)
- ✅ Column in view's `visible_columns`
- ✅ Default value applied if set

### After Edit Column
- ✅ Metadata updated
- ✅ Physical table updated if needed
- ✅ Existing data preserved
- ✅ Type conversion safe

### After Delete Column
- ✅ Removed from `data_table_columns`
- ✅ Removed from physical table
- ✅ Removed from all views
- ✅ No orphaned data

### After Reorder
- ✅ View's `visible_columns` updated
- ✅ Column metadata order unchanged
- ✅ Other views unaffected
- ✅ Order persists

---

## Known Issues / Limitations

### Current Limitations
- ⚠️ Only basic field types (text, number, date, boolean)
- ⚠️ Type conversion limited to safe conversions
- ⚠️ Cannot rename column name (only label)
- ⚠️ No undo/redo
- ⚠️ One column operation at a time

### Future Enhancements
- More field types (email, phone, select, etc.)
- Bulk column operations
- Column templates
- Undo/redo
- Advanced validation rules

---

## Browser Compatibility

Test in:
- ✅ Chrome (primary)
- ✅ Firefox
- ✅ Safari
- ✅ Edge

---

## Quick Smoke Test (5 minutes)

```
✅ 1. Create table
✅ 2. Add column (right-click → Add Column Right)
✅ 3. AI suggests type
✅ 4. Edit column label
✅ 5. Drag to reorder
✅ 6. Refresh page (order persists)
✅ 7. Delete column
✅ 8. All operations work smoothly
```

---

## Debugging Tips

### If column doesn't appear:
- Check browser console for errors
- Check network tab for API response
- Verify API returned 200 status
- Check database for column

### If AI suggestion doesn't work:
- Check if AI endpoint responding (500ms delay is normal)
- Check browser console
- AI failure is silent - doesn't block user

### If reorder doesn't persist:
- Check network tab for API call
- Verify viewId sent correctly
- Check `visible_columns` in database
- Refresh page to verify

### If ALTER TABLE fails:
- Check PostgreSQL logs
- Verify column type mapping
- Check for data incompatibility
- Verify permissions

---

## Success Criteria

All features working if:
- ✅ Can add columns with AI suggestions
- ✅ Can edit column labels and types
- ✅ Can delete user columns (not system)
- ✅ Can reorder via drag-and-drop
- ✅ All changes persist after refresh
- ✅ No linter errors
- ✅ No console errors
- ✅ UI responsive and smooth

---

## Next Steps After Testing

1. Report any bugs found
2. Create GitHub issues for bugs
3. Fix critical bugs
4. Start Week 2: Advanced field types
5. Add automated tests

---

**Ready to test!** 🚀

Start with the Quick Test Flow (5 minutes) to verify everything works!

