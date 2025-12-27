# 🐛 Sample Data Not Importing - Debug Guide

**Date**: December 27, 2025  
**Issue**: Sample data not appearing after creating workspace from template  
**Status**: 🔍 Debugging

---

## ✅ What's Working

1. **Menu created** - Folders and tables visible in sidebar
2. **Tables created** - All 5 tables exist
3. **Columns created** - All columns configured
4. **Views created** - Default views present
5. **Frontend sending data** - `includeSampleData: true` in request

---

## 🔍 Debug Logs Added

Added logging to track sample data import:

### Log 1: Sample Data Configuration
```typescript
console.log('📊 Sample Data Config:')
console.log('  - includeSampleData (from request):', includeSampleData)
console.log('  - template.includesSampleData:', template.includesSampleData)
console.log('  - shouldIncludeSampleData (final):', shouldIncludeSampleData)
```

### Log 2: Per-Table Check
```typescript
console.log(`🔍 Checking sample data for ${tableDef.name}:`)
console.log(`  - shouldIncludeSampleData: ${shouldIncludeSampleData}`)
console.log(`  - has sampleData: ${!!tableDef.sampleData}`)
console.log(`  - sampleData length: ${tableDef.sampleData?.length || 0}`)
```

---

## 🧪 How to Test

### Step 1: Check Server Logs

After creating a workspace from template, look for these logs:

**Expected:**
```
📊 Sample Data Config:
  - includeSampleData (from request): true
  - template.includesSampleData: true
  - shouldIncludeSampleData (final): true

🔍 Checking sample data for Companies:
  - shouldIncludeSampleData: true
  - has sampleData: true
  - sampleData length: 3

📊 Importing 3 sample rows for Companies...
  ✓ Inserted row with id: 019d1234-5678-7100-8000-000000000001
  ✓ Inserted row with id: 019d1234-5678-7100-8000-000000000002
  ✓ Inserted row with id: 019d1234-5678-7100-8000-000000000003
✅ Completed sample data import for Companies
```

**If Missing:** One of these conditions is false

### Step 2: Verify Template Has Sample Data

```bash
# Check template in database
psql -d docpal -c "
  SELECT 
    name, 
    includes_sample_data,
    (template_definition->'tables'->0->'sampleData') IS NOT NULL as has_sample_data,
    jsonb_array_length(template_definition->'tables'->0->'sampleData') as sample_count
  FROM app_templates 
  WHERE name = 'Advanced CRM';
"
```

**Expected:**
```
      name      | includes_sample_data | has_sample_data | sample_count
----------------+----------------------+-----------------+--------------
 Advanced CRM   | t                    | t               | 3
```

### Step 3: Check Frontend Checkbox

In the create dialog, verify:
- ☑ **Include sample data** checkbox is visible
- ☑ Checkbox is **checked** by default
- ☑ `includesSampleData.value` is `true`

---

## 🔎 Possible Issues

### Issue 1: Template Not Seeded Properly

**Symptom:** `template.includesSampleData` is `false` or `undefined`

**Solution:**
```bash
# Re-seed template
curl -X POST http://localhost:3000/api/db-reset
curl -X POST http://localhost:3000/api/seed
```

### Issue 2: Sample Data Missing from JSON

**Symptom:** `tableDef.sampleData` is `undefined` or empty array

**Check:**
```bash
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('server/data/seed-templates-advanced.json', 'utf-8'));
const tables = data.templates[0].templateDefinition.tables;
tables.forEach(t => {
  console.log(\`\${t.name}: \${t.sampleData?.length || 0} rows\`);
});
"
```

**Expected:**
```
Companies: 3 rows
Contacts: 3 rows
Deals: 3 rows
Activities: 3 rows
Company_Stats: 0 rows
```

### Issue 3: Frontend Not Sending Flag

**Symptom:** `includeSampleData` is `undefined` in server logs

**Check:** Look in Network tab for the POST request body:
```json
{
  "templateId": "...",
  "name": "Test CRM",
  "description": "...",
  "includeSampleData": true  // ← Should be present
}
```

### Issue 4: SQL Errors During Insert

**Symptom:** See error messages like:
- `invalid input syntax for type uuid`
- `invalid input syntax for type json`
- `null value in column ... violates not-null constraint`

**Check:** Server console for detailed error messages

---

## 🛠️ Quick Fixes

### Fix 1: Reset and Re-seed

```bash
# 1. Reset database
curl -X POST http://localhost:3000/api/db-reset

# 2. Seed with proper UUID fix
curl -X POST http://localhost:3000/api/seed

# 3. Try creating workspace again
```

### Fix 2: Force Sample Data

In frontend, ensure checkbox is checked:
```typescript
// In applyTemplate function
includesSampleData.value = true  // Force to true
```

### Fix 3: Check Template Definition

```bash
# Verify JSON is valid
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('server/data/seed-templates-advanced.json', 'utf-8'));
console.log('✅ JSON is valid');
console.log('Template:', data.templates[0].name);
console.log('includesSampleData:', data.templates[0].includesSampleData);
console.log('Tables:', data.templates[0].templateDefinition.tables.length);
"
```

---

## 📝 Test Checklist

Run through this checklist:

- [ ] Database reset and re-seeded
- [ ] Template exists in `app_templates` table
- [ ] Template has `includes_sample_data = true`
- [ ] JSON file has sample data arrays
- [ ] All sample rows have `id` fields
- [ ] Frontend checkbox is visible and checked
- [ ] Request includes `includeSampleData: true`
- [ ] Server logs show "Importing sample rows"
- [ ] No SQL errors in server console
- [ ] Tables show rows after creation

---

## 🎯 Expected Flow

1. User clicks "From Template"
2. Selects "Advanced CRM"
3. Dialog opens with checkbox ☑ **Include sample data**
4. User clicks "Create App"
5. **Server receives:** `{ includeSampleData: true }`
6. **Server logs:** `📊 Sample Data Config: shouldIncludeSampleData: true`
7. **Server logs:** `📊 Importing 3 sample rows for Companies...`
8. **Server logs:** `✓ Inserted row with id: ...` (x12 times)
9. **User sees:** 12 rows across 4 tables

---

## 🚀 Next Steps

1. **Try creating a workspace from template**
2. **Check server console** for debug logs
3. **Share the logs** if issue persists
4. **Verify template** has sample data in database

---

**Files to Check:**
- `server/api/app-templates/create-workspace.post.ts` - Import logic
- `server/data/seed-templates-advanced.json` - Sample data
- `app/pages/workspaces/index.vue` - Frontend checkbox
- Server console - Debug logs

