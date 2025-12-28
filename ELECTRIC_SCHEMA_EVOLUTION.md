# ElectricSQL Schema Evolution - Dynamic Tables

## 🤔 The Problem

### Scenario
```typescript
// Day 1: User creates "Customers" table with 3 columns
data_table_columns:
  - name, type: 'text'
  - email, type: 'text'
  - phone, type: 'text'

// PostgreSQL table created:
user_table_customers_abc123 (id, name, email, phone, ...)

// Client syncs and creates matching PGlite schema
CREATE TABLE user_table_customers_abc123 (
  id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  ...
)

// Day 2: User adds "address" column
data_table_columns:
  - name, type: 'text'
  - email, type: 'text'
  - phone, type: 'text'
  - address, type: 'text'  ← NEW!

// Backend runs:
ALTER TABLE user_table_customers_abc123 ADD COLUMN address TEXT;

// ❓ What happens in Electric and PGlite?
```

---

## ⚡ How Electric Handles Schema Changes

### Electric's Schema Tracking

Electric tracks the schema of each table via the `electric-schema` header in sync responses:

```http
GET /v1/shape?table=user_table_customers_abc123

Response Headers:
  electric-schema: "abc123def456..."  ← Hash of current schema
  electric-offset: "0_0"
  ...
```

### When Schema Changes

1. **PostgreSQL**: Schema altered (ADD/DROP/MODIFY column)
2. **Electric**: Detects schema change, generates new schema hash
3. **Client**: Next sync request receives new `electric-schema` header
4. **Client Detects Mismatch**: Old schema hash ≠ new schema hash
5. **Client Action Required**: Must handle the schema change

---

## 🔧 Solution Options

### Option 1: Drop and Recreate ⭐ (Recommended)

When schema change detected, drop local table and recreate.

#### Implementation

```typescript
// app/composables/useTableData.ts
export const useTableData = (tableSlug: string) => {
  const { syncTable, watchQuery, getDB } = useSecureElectricSync()
  
  // Track schema version
  const schemaVersionKey = `schema_version_${tableSlug}`
  const currentSchemaVersion = ref(localStorage.getItem(schemaVersionKey))
  
  onMounted(async () => {
    // 1. Get data_table metadata
    const dataTable = await getDataTableBySlug(tableSlug)
    
    // 2. Get current columns (data_table_columns is already synced)
    const columns = await getTableColumns(dataTable.id)
    
    // 3. Calculate schema version (hash of columns)
    const newSchemaVersion = calculateSchemaHash(columns)
    
    // 4. Check if schema changed
    if (currentSchemaVersion.value !== newSchemaVersion) {
      console.log('[Electric] Schema changed, recreating table...')
      
      // Drop old table
      await dropTable(dataTable.table_name)
      
      // Create with new schema
      await createTableSchema(dataTable, columns)
      
      // Update stored version
      localStorage.setItem(schemaVersionKey, newSchemaVersion)
      currentSchemaVersion.value = newSchemaVersion
    }
    
    // 5. Sync (will re-download if dropped)
    await syncTable(dataTable.table_name)
    
    // 6. Query
    const result = await watchQuery(`
      SELECT * FROM ${dataTable.table_name}
    `)
    
    return result
  })
}

function calculateSchemaHash(columns: any[]) {
  // Simple hash based on column definitions
  const columnDef = columns
    .sort((a, b) => a.order - b.order)
    .map(c => `${c.name}:${c.type}:${c.is_required}`)
    .join('|')
  
  // Use a simple hash or just the string itself
  return btoa(columnDef)
}

async function dropTable(tableName: string) {
  const { db } = useSecureElectricSync()
  
  try {
    await db.exec(`DROP TABLE IF EXISTS ${tableName}`)
    console.log(`[Electric] Dropped table: ${tableName}`)
  } catch (err) {
    console.error('[Electric] Failed to drop table:', err)
  }
}

async function createTableSchema(dataTable: any, columns: any[]) {
  const { db } = useSecureElectricSync()
  
  const columnDefs = columns.map(col => {
    let def = `"${col.name}" `
    
    switch (col.type) {
      case 'text': def += 'TEXT'; break
      case 'number': def += 'NUMERIC'; break
      case 'date': def += 'TIMESTAMP'; break
      case 'boolean': def += 'BOOLEAN'; break
      case 'json': def += 'JSONB'; break
      default: def += 'TEXT'
    }
    
    if (col.is_required) def += ' NOT NULL'
    
    return def
  }).join(',\n    ')
  
  const schema = `
    CREATE TABLE IF NOT EXISTS "${dataTable.table_name}" (
      id UUID PRIMARY KEY,
      company_id UUID NOT NULL,
      ${columnDefs},
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL,
      created_by UUID
    )
  `
  
  await db.exec(schema)
  console.log(`[Electric] Created table schema: ${dataTable.table_name}`)
}
```

#### Pros
- ✅ Simple and reliable
- ✅ Guaranteed schema consistency
- ✅ Works for all schema changes (ADD, DROP, MODIFY)
- ✅ Electric re-syncs data automatically

#### Cons
- ❌ Re-downloads all data (bandwidth)
- ❌ Brief loading state

---

### Option 2: Manual ALTER TABLE in PGlite

Try to mirror PostgreSQL's ALTER TABLE in PGlite.

#### Implementation

```typescript
async function migrateSchema(
  tableName: string,
  oldColumns: any[],
  newColumns: any[]
) {
  const { db } = useSecureElectricSync()
  
  // Find added columns
  const addedColumns = newColumns.filter(
    nc => !oldColumns.some(oc => oc.id === nc.id)
  )
  
  // Find removed columns
  const removedColumns = oldColumns.filter(
    oc => !newColumns.some(nc => nc.id === oc.id)
  )
  
  // Find modified columns
  const modifiedColumns = newColumns.filter(nc => {
    const old = oldColumns.find(oc => oc.id === nc.id)
    return old && (old.type !== nc.type || old.name !== nc.name)
  })
  
  // Apply migrations
  for (const col of addedColumns) {
    const colType = mapColumnType(col.type)
    await db.exec(`
      ALTER TABLE "${tableName}" 
      ADD COLUMN "${col.name}" ${colType}
    `)
  }
  
  for (const col of removedColumns) {
    await db.exec(`
      ALTER TABLE "${tableName}" 
      DROP COLUMN "${col.name}"
    `)
  }
  
  for (const col of modifiedColumns) {
    // Type changes are tricky - might need to drop and recreate
    const colType = mapColumnType(col.type)
    await db.exec(`
      ALTER TABLE "${tableName}" 
      ALTER COLUMN "${col.name}" TYPE ${colType}
    `)
  }
}
```

#### Problems
- ❌ **Data mismatch risk**: Electric might send data with new schema before migration runs
- ❌ **Complex**: Handle all edge cases (rename, type change, constraints)
- ❌ **Race conditions**: Schema changes while sync in progress
- ❌ **Electric doesn't support partial syncs**: Can't tell Electric "only send new data"

#### Verdict
❌ **Not recommended** - Too complex and error-prone

---

### Option 3: Watch data_table_columns for Changes ⭐ (Best UX)

Combine Option 1 with reactive schema detection.

#### Implementation

```typescript
// app/composables/useTableData.ts
export const useTableData = (tableSlug: string) => {
  const { syncTable, watchQuery } = useSecureElectricSync()
  const rows = ref([])
  const isLoading = ref(true)
  const isResyncing = ref(false)
  
  let currentDataTable: any = null
  let currentSchemaHash: string = ''
  
  onMounted(async () => {
    // 1. Get data_table metadata (already synced)
    currentDataTable = await getDataTableBySlug(tableSlug)
    
    // 2. Watch data_table_columns for this table
    const columnsResult = await watchQuery(`
      SELECT * FROM data_table_columns 
      WHERE data_table_id = $1 
      ORDER BY "order" ASC
    `, [currentDataTable.id])
    
    // 3. Initial schema setup
    await setupTableSchema(columnsResult.value)
    
    // 4. Watch for column changes
    watch(columnsResult, async (newColumns, oldColumns) => {
      const newHash = calculateSchemaHash(newColumns)
      
      if (oldColumns && currentSchemaHash !== newHash) {
        console.log('[Electric] Schema changed, resyncing...')
        isResyncing.value = true
        
        // Drop and recreate
        await dropTable(currentDataTable.table_name)
        await setupTableSchema(newColumns)
        
        isResyncing.value = false
      }
    }, { deep: true })
    
    // 5. Watch table data
    const dataResult = await watchQuery(`
      SELECT * FROM "${currentDataTable.table_name}"
      ORDER BY created_at DESC
    `)
    
    rows.value = dataResult.value
    isLoading.value = false
    
    watch(dataResult, (newData) => {
      rows.value = newData
    }, { deep: true })
  })
  
  async function setupTableSchema(columns: any[]) {
    currentSchemaHash = calculateSchemaHash(columns)
    
    // Create schema
    await createTableSchema(currentDataTable, columns)
    
    // Sync data
    await syncTable(currentDataTable.table_name)
  }
  
  return {
    rows: readonly(rows),
    isLoading: readonly(isLoading),
    isResyncing: readonly(isResyncing)
  }
}
```

#### User Experience

```typescript
// User adds "address" column in UI
await $fetch('/api/data-table-columns', {
  method: 'POST',
  body: { name: 'address', type: 'text', data_table_id: 'dt123' }
})

// Backend:
// 1. Inserts into data_table_columns ✅
// 2. Runs ALTER TABLE user_table_customers_abc123 ADD COLUMN address TEXT ✅

// Electric:
// 1. Syncs new row to data_table_columns ✅

// Client:
// 1. watchQuery detects new column ✅
// 2. Schema hash changes ✅
// 3. Drops local table ✅
// 4. Recreates with new schema ✅
// 5. Re-syncs data (now includes address column!) ✅
// 6. UI shows "Resyncing..." indicator ✅
// 7. Done! ✅
```

#### Pros
- ✅ Automatic schema detection
- ✅ Reactive to changes
- ✅ Good UX (shows resyncing state)
- ✅ Reliable
- ✅ Works across all tabs (SharedWorker)

#### Cons
- ⚠️ Re-downloads data on schema change
- ⚠️ Brief interruption for users viewing that table

---

## 🎯 Recommended Approach

**Option 3: Watch data_table_columns + Drop/Recreate**

### Why This Works Best

1. **Automatic**: No manual intervention needed
2. **Reliable**: Always in sync with PostgreSQL
3. **User-Friendly**: Shows loading state during resync
4. **Safe**: No risk of data mismatch
5. **Simple**: Just drop and recreate, Electric handles the rest

### Edge Cases Handled

#### Case 1: Schema Change While User Viewing Table
```
User viewing customers table with old schema
Admin adds "address" column
→ Client detects change
→ Shows "Schema updated, resyncing..." banner
→ Table briefly shows loading state
→ Data reappears with new column
```

#### Case 2: Multiple Columns Added/Removed
```
Admin bulk-updates columns (add 3, remove 2)
→ data_table_columns changes
→ Schema hash changes once
→ Single drop/recreate cycle
→ All changes applied together
```

#### Case 3: Offline During Schema Change
```
User offline
Admin changes schema
User comes back online
→ data_table_columns syncs first (lightweight)
→ Client detects schema mismatch
→ Drops old table
→ Creates new schema
→ Syncs data with new schema
```

---

## 🔍 Implementation Details

### Schema Version Tracking

Store schema hash in two places:
1. **Memory**: For current session checks
2. **LocalStorage**: For cross-session detection

```typescript
// Detect schema change on page load
const storedHash = localStorage.getItem(`schema_${tableId}`)
const currentHash = calculateSchemaHash(columns)

if (storedHash && storedHash !== currentHash) {
  // Schema changed between sessions
  await recreateTable()
}
```

### Handling Large Tables

For tables with > 10k rows, show better UX:

```typescript
if (rowCount > 10000) {
  // Show estimated time
  notify({
    title: 'Schema Updated',
    message: `Resyncing ${rowCount.toLocaleString()} rows... (est. ${estimatedTime}s)`,
    type: 'info'
  })
}
```

### Background Resync

For non-active tables, resync in background:

```typescript
// If user not currently viewing this table
if (currentRoute.params.tableSlug !== tableSlug) {
  // Silent resync in background
  await recreateTableInBackground(tableName)
}
```

---

## 📊 Performance Impact

### Typical Schema Change
- **Drop table**: < 10ms
- **Create schema**: < 50ms
- **Resync data**: Depends on row count
  - 100 rows: ~100-200ms
  - 1k rows: ~500ms-1s
  - 10k rows: ~2-5s
  - 100k rows: ~20-30s

### Optimization Strategies

1. **Batch Column Changes**: Encourage users to add multiple columns at once
2. **Background Sync**: Resync non-active tables in background
3. **Partial UI**: Show old data + loading indicator for new columns
4. **Change Queue**: Debounce rapid schema changes

---

## ✅ Final Recommendation

Use **Option 3** with these features:

```typescript
✅ Watch data_table_columns reactively
✅ Calculate schema hash on column change
✅ Drop + recreate on hash mismatch
✅ Show "Resyncing..." UI state
✅ Store schema hash in localStorage
✅ Handle offline schema changes
✅ Background resync for non-active tables
```

This gives you:
- ✅ Automatic schema evolution
- ✅ Always in sync with PostgreSQL
- ✅ Good user experience
- ✅ Reliable and simple
- ✅ No manual intervention needed

The brief resync is acceptable because:
1. Schema changes are infrequent
2. Most tables have < 1k rows (fast resync)
3. Users expect a brief loading after changing schema
4. Alternative (manual migrations) is error-prone

---

## 🚀 Next Steps

1. Implement `calculateSchemaHash()` helper
2. Add schema version tracking
3. Build `recreateTable()` function
4. Add UX indicators for resyncing
5. Test schema changes in real-time
6. Test with large tables (10k+ rows)

Want me to implement this? 🎯

