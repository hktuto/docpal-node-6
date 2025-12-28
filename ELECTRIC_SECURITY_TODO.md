# ElectricSQL Security TODO - data_table_columns Issue

## 🚨 Current POC Limitation

### Problem
`data_table_columns` table does NOT have a `company_id` column.

**Schema:**
```typescript
data_table_columns {
  id: UUID
  data_table_id: UUID  // References data_tables
  name: TEXT
  type: TEXT
  // ... NO company_id!
}
```

### Current POC Solution (⚠️ Security Risk!)
- Syncing ALL columns from ALL companies without filtering
- Client-side filtering to only show columns for accessible tables
- **This exposes column metadata across companies!**

### Why This Is a Problem
1. **Data leakage**: Users can see column names/types from other companies
2. **Bandwidth waste**: Syncing unnecessary data
3. **Not production-ready**: Security violation

---

## ✅ Production Solutions

### Option 1: Add company_id Column (RECOMMENDED)

**Denormalize `company_id` into `data_table_columns`:**

```typescript
// server/db/schema/dataTableColumn.ts
export const dataTableColumns = pgTable('data_table_columns', {
  id: uuid('id').primaryKey(),
  dataTableId: uuid('data_table_id').notNull(),
  companyId: uuid('company_id').notNull(), // ← ADD THIS
  name: text('name').notNull(),
  // ...rest
})
```

**Migration:**
```sql
-- Add company_id column
ALTER TABLE data_table_columns 
ADD COLUMN company_id UUID NOT NULL;

-- Backfill from data_tables
UPDATE data_table_columns dtc
SET company_id = dt.company_id
FROM data_tables dt
WHERE dtc.data_table_id = dt.id;

-- Add foreign key
ALTER TABLE data_table_columns
ADD CONSTRAINT fk_company
FOREIGN KEY (company_id) REFERENCES companies(id);

-- Add index
CREATE INDEX idx_data_table_columns_company_id 
ON data_table_columns(company_id);
```

**Then update proxy:**
```typescript
else if (table === 'data_table_columns') {
  whereClause = `company_id='${companyId}'`
}
```

**Pros:**
- ✅ Secure (proper filtering)
- ✅ Efficient (no extra queries)
- ✅ Simple to implement
- ✅ Works with Electric

**Cons:**
- ⚠️ Denormalized data (need to maintain sync)
- ⚠️ Requires migration
- ⚠️ Slightly larger table

---

### Option 2: Don't Sync via Electric

**Use API endpoint instead:**

```typescript
// Don't sync data_table_columns via Electric
// Fetch via API when needed

const getTableColumns = async (tableId: string) => {
  // Use API instead of Electric
  const columns = await $fetch(`/api/data-table-columns?tableId=${tableId}`)
  return columns
}
```

**Pros:**
- ✅ No schema changes
- ✅ Secure (API validates access)
- ✅ Simple

**Cons:**
- ❌ Not real-time (need to refetch)
- ❌ Requires network (doesn't work offline)
- ❌ Loses Electric benefits

---

### Option 3: Sync Only Needed Columns

**Dynamically sync columns for accessible tables:**

```typescript
// 1. Sync data_tables (filtered by company)
await syncTable('data_tables')

// 2. Get accessible table IDs
const tableIds = await db.query(`
  SELECT id FROM data_tables
`)

// 3. For each table, sync its columns
// BUT: Electric doesn't support IN queries!
// WHERE data_table_id IN ('id1', 'id2', ...)
```

**Pros:**
- ✅ No schema changes
- ✅ Secure

**Cons:**
- ❌ Complex to implement
- ❌ Electric has limited WHERE clause support
- ❌ May not be feasible

---

## 📊 Comparison

| Solution | Security | Performance | Complexity | Offline | Real-time |
|----------|----------|-------------|------------|---------|-----------|
| Add company_id | ✅ High | ✅ Fast | 🟡 Medium | ✅ Yes | ✅ Yes |
| Use API | ✅ High | 🟡 Medium | ✅ Low | ❌ No | ❌ No |
| Dynamic sync | ✅ High | 🟡 Medium | ❌ High | ✅ Yes | ✅ Yes |
| Current POC | ❌ Low | ✅ Fast | ✅ Low | ✅ Yes | ✅ Yes |

---

## 🎯 Recommendation

**For Production: Use Option 1 (Add company_id)**

1. **Create migration** to add `company_id` column
2. **Backfill** existing data from `data_tables`
3. **Update Drizzle schema** to include `company_id`
4. **Update proxy** to filter by `company_id`
5. **Remove POC warnings**

**Estimated effort**: 1-2 hours

**Risk**: Low (straightforward migration)

---

## 🚀 Implementation Steps

### Step 1: Create Migration

```bash
# Generate new migration
pnpm db:generate

# Edit the generated migration file
```

### Step 2: Update Schema

```typescript
// server/db/schema/dataTableColumn.ts
import { companies } from './company'

export const dataTableColumns = pgTable('data_table_columns', {
  // ... existing fields
  
  // Add company_id
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
})
```

### Step 3: Migration SQL

```sql
-- 1. Add column (nullable first)
ALTER TABLE data_table_columns 
ADD COLUMN company_id UUID;

-- 2. Backfill data
UPDATE data_table_columns dtc
SET company_id = dt.company_id
FROM data_tables dt
WHERE dtc.data_table_id = dt.id;

-- 3. Make NOT NULL
ALTER TABLE data_table_columns 
ALTER COLUMN company_id SET NOT NULL;

-- 4. Add constraint
ALTER TABLE data_table_columns
ADD CONSTRAINT fk_data_table_columns_company
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- 5. Add index
CREATE INDEX idx_data_table_columns_company_id 
ON data_table_columns(company_id);
```

### Step 4: Update Proxy

```typescript
// server/api/electric/shape.get.ts
else if (table === 'data_table_columns') {
  whereClause = `company_id='${companyId}'`
}
```

### Step 5: Remove Warning

Remove the POC warning from the proxy endpoint.

---

## 📝 Notes

- **Same issue might exist** for other tables (data_table_views, etc.)
- **Check all tables** for proper company_id filtering
- **Document** which tables have company_id and which don't
- **Consider** adding company_id to all relevant tables during schema design

---

## ✅ For Current POC

The current implementation works for testing but displays warnings:

```
⚠️  WARNING: data_table_columns syncing without company filter!
⚠️  This is a POC limitation. Add company_id column for production!
```

Client-side filtering provides a safety layer, but server-side filtering is required for production.

---

## 🎉 Once Fixed

After implementing Option 1, the system will be:
- ✅ Secure (proper filtering at Electric level)
- ✅ Fast (no extra client-side filtering)
- ✅ Production-ready
- ✅ Real-time sync for columns
- ✅ Works offline

This is a **must-fix** before production deployment!
