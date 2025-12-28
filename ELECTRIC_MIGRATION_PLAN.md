# ElectricSQL Migration Plan - API to Local DB

## 🎯 Migration Scope

### Phase 1: Core Entities (Read-Only via Electric)
1. ✅ User profile
2. ✅ Company
3. ✅ Workspace
4. ✅ data_table
5. ✅ data_table_column
6. ✅ Dynamic tables (user data)

### Later: Table views (lower priority)
- Just queries on dynamic tables
- Can be computed client-side

---

## 📊 Current Architecture Analysis

### What to Check
Let me analyze your existing API usage to understand what needs migration:

```bash
# Find all API calls for these entities
grep -r "\/api\/users" app/
grep -r "\/api\/companies" app/
grep -r "\/api\/workspaces" app/
grep -r "\/api\/data-tables" app/
grep -r "\/api\/data-table-columns" app/
```

---

## 🗄️ Tables to Sync

### 1. Users Table
**Current Schema**: `server/db/schema/user.ts`
```typescript
// Need to sync to Electric
users {
  id: UUID
  email: TEXT
  name: TEXT
  avatar: TEXT
  company_id: UUID
  role: TEXT
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

**Sync Strategy**:
- **Option A**: Sync all company users (recommended for collaboration)
  - WHERE: `company_id = 'company123'`
  - Enables displaying "Created by User X" without API calls
  
- **Option B**: Sync only current user
  - WHERE: `id = 'user123'`
  - More private, but missing collaborator info

**Recommendation**: Option A (all company users)

---

### 2. Companies Table
**Current Schema**: `server/db/schema/company.ts`
```typescript
companies {
  id: UUID
  name: TEXT
  slug: TEXT
  logo: TEXT
  settings: JSONB
  plan: TEXT
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

**Sync Strategy**:
- WHERE: `id = 'company123'`
- Just the user's company (single row)
- Very lightweight

---

### 3. Workspaces Table ✅ Already in POC
**Current Schema**: `server/db/schema/workspace.ts`
```typescript
workspaces {
  id: UUID
  name: TEXT
  slug: TEXT
  icon: TEXT
  description: TEXT
  menu: JSONB
  company_id: UUID
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

**Sync Strategy**: ✅ Already implemented
- WHERE: `company_id = 'company123'`

---

### 4. Data Tables
**Current Schema**: `server/db/schema/data-table.ts`
```typescript
data_tables {
  id: UUID
  name: TEXT
  workspace_id: UUID
  company_id: UUID
  table_name: TEXT  // The actual PostgreSQL table name
  description: TEXT
  icon: TEXT
  settings: JSONB
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
  created_by: UUID
}
```

**Sync Strategy**:
- **Phase 1 (Simple)**: Sync all company tables
  - WHERE: `company_id = 'company123'`
  - Filter client-side by workspace_id
  
- **Phase 2 (Secure)**: Permission-based
  - Use `data_table_user_access` table
  - Only sync accessible tables

**Recommendation**: Start with Phase 1

---

### 5. Data Table Columns
**Current Schema**: `server/db/schema/data-table-column.ts`
```typescript
data_table_columns {
  id: UUID
  data_table_id: UUID
  company_id: UUID
  name: TEXT
  type: TEXT  // 'text', 'number', 'date', etc.
  config: JSONB
  order: INTEGER
  is_required: BOOLEAN
  is_unique: BOOLEAN
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

**Sync Strategy**:
- WHERE: `company_id = 'company123'`
- Client-side filter by `data_table_id`

---

### 6. Dynamic Tables (User Data)
**Current**: Each `data_table` has a corresponding PostgreSQL table

Example:
```typescript
// If user creates "Customers" table
data_tables: { id: 'dt1', table_name: 'user_table_customers_abc123' }

// Actual data is in:
user_table_customers_abc123 {
  id: UUID
  company_id: UUID
  // ... dynamic columns based on data_table_columns
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

**Sync Strategy**:
- Sync each dynamic table separately
- WHERE: `company_id = 'company123'`
- Need to handle schema creation dynamically

**Challenge**: How to sync tables that are created at runtime?

---

## 🤔 Things You Might Be Missing

### Additional Tables to Consider

#### 7. Workspace Members (if exists)
```typescript
workspace_members {
  workspace_id: UUID
  user_id: UUID
  role: TEXT
}
```
- Needed if workspaces have specific members
- For showing "Who has access" without API

#### 8. Data Table Views (you mentioned lower priority)
```typescript
data_table_views {
  id: UUID
  data_table_id: UUID
  name: TEXT
  filters: JSONB
  columns: TEXT[]
  sort: JSONB
}
```
- Can be synced for faster view switching
- Not critical if computed client-side

#### 9. Relationships/References
If you have foreign key references between dynamic tables:
```typescript
data_table_references {
  source_table_id: UUID
  target_table_id: UUID
  source_column_id: UUID
  reference_type: TEXT
}
```

#### 10. User Preferences/Settings
```typescript
user_settings {
  user_id: UUID
  key: TEXT
  value: JSONB
}
```
- Last viewed workspace
- UI preferences
- Favorites

---

## 📋 Migration Strategy

### Phase 1: Setup Infrastructure ✅ (Done in POC)
- [x] Electric service in Docker
- [x] Proxy auth endpoint
- [x] PGlite initialization
- [x] Basic sync composable

### Phase 2: Core Entity Sync (THIS PHASE)

#### Step 1: Add Tables to Electric Publication
```sql
-- Update Electric publication to include new tables
ALTER PUBLICATION electric_publication 
  ADD TABLE users,
  ADD TABLE companies,
  ADD TABLE workspaces,  -- Already included
  ADD TABLE data_tables,
  ADD TABLE data_table_columns;
```

#### Step 2: Update Proxy Endpoint
```typescript
// server/api/electric/shape.get.ts
const allowedTables = [
  'users',
  'companies', 
  'workspaces',
  'data_tables',
  'data_table_columns',
  // Dynamic tables added later
]

// Set WHERE clause per table
if (table === 'users') {
  whereClause = `company_id='${companyId}'`
}
else if (table === 'companies') {
  whereClause = `id='${companyId}'`
}
else if (table === 'workspaces') {
  whereClause = `company_id='${companyId}'`
}
else if (table === 'data_tables') {
  whereClause = `company_id='${companyId}'`
}
else if (table === 'data_table_columns') {
  whereClause = `company_id='${companyId}'`
}
```

#### Step 3: Create PGlite Schema Definitions
```typescript
// app/config/electric-schemas.ts
export const electricSchemas = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT,
      avatar TEXT,
      company_id UUID NOT NULL,
      role TEXT,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    )
  `,
  
  companies: `
    CREATE TABLE IF NOT EXISTS companies (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      logo TEXT,
      settings JSONB,
      plan TEXT,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    )
  `,
  
  // ... workspaces (already exists)
  
  data_tables: `
    CREATE TABLE IF NOT EXISTS data_tables (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      workspace_id UUID NOT NULL,
      company_id UUID NOT NULL,
      table_name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      settings JSONB,
      created_by UUID,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    )
  `,
  
  data_table_columns: `
    CREATE TABLE IF NOT EXISTS data_table_columns (
      id UUID PRIMARY KEY,
      data_table_id UUID NOT NULL,
      company_id UUID NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      config JSONB,
      "order" INTEGER NOT NULL,
      is_required BOOLEAN NOT NULL DEFAULT false,
      is_unique BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    )
  `
}
```

#### Step 4: Create Table-Specific Composables
```typescript
// app/composables/useUsers.ts
export const useUsers = () => {
  const { syncTable, watchQuery } = useSecureElectricSync()
  
  const users = ref([])
  const isLoading = ref(true)
  
  onMounted(async () => {
    await syncTable('users')
    
    const result = await watchQuery(`
      SELECT * FROM users 
      ORDER BY name ASC
    `)
    
    users.value = result.value
    isLoading.value = false
    
    // Watch for changes
    watch(result, (newUsers) => {
      users.value = newUsers
    }, { deep: true })
  })
  
  const getUserById = (userId: string) => {
    return computed(() => users.value.find(u => u.id === userId))
  }
  
  const getUsersByRole = (role: string) => {
    return computed(() => users.value.filter(u => u.role === role))
  }
  
  return {
    users: readonly(users),
    isLoading: readonly(isLoading),
    getUserById,
    getUsersByRole
  }
}
```

```typescript
// app/composables/useCompany.ts
export const useCompany = () => {
  const { syncTable, watchQuery } = useSecureElectricSync()
  const user = useCurrentUser()
  
  const company = ref(null)
  const isLoading = ref(true)
  
  onMounted(async () => {
    await syncTable('companies')
    
    const result = await watchQuery(`
      SELECT * FROM companies 
      WHERE id = $1
    `, [user.value.company.id])
    
    company.value = result.value?.[0]
    isLoading.value = false
    
    watch(result, (rows) => {
      company.value = rows?.[0]
    }, { deep: true })
  })
  
  return {
    company: readonly(company),
    isLoading: readonly(isLoading)
  }
}
```

```typescript
// app/composables/useDataTables.ts
export const useDataTables = (workspaceId?: Ref<string> | string) => {
  const { syncTable, watchQuery } = useSecureElectricSync()
  
  const tables = ref([])
  const isLoading = ref(true)
  
  const workspaceIdValue = computed(() => 
    typeof workspaceId === 'string' ? workspaceId : workspaceId?.value
  )
  
  onMounted(async () => {
    await syncTable('data_tables')
    await syncTable('data_table_columns')
    
    const query = workspaceIdValue.value
      ? `SELECT * FROM data_tables WHERE workspace_id = $1 ORDER BY created_at DESC`
      : `SELECT * FROM data_tables ORDER BY created_at DESC`
    
    const params = workspaceIdValue.value ? [workspaceIdValue.value] : []
    
    const result = await watchQuery(query, params)
    
    tables.value = result.value
    isLoading.value = false
    
    watch(result, (newTables) => {
      tables.value = newTables
    }, { deep: true })
  })
  
  const getTableById = (tableId: string) => {
    return computed(() => tables.value.find(t => t.id === tableId))
  }
  
  const getTableColumns = async (tableId: string) => {
    const { db } = useSecureElectricSync()
    const result = await db.query(`
      SELECT * FROM data_table_columns 
      WHERE data_table_id = $1 
      ORDER BY "order" ASC
    `, [tableId])
    
    return result.rows
  }
  
  return {
    tables: readonly(tables),
    isLoading: readonly(isLoading),
    getTableById,
    getTableColumns
  }
}
```

#### Step 5: Replace API Calls in Components
```typescript
// Before (API call)
const { data: workspaces } = await useFetch('/api/workspaces')

// After (Electric sync)
const { workspaces, isLoading } = useWorkspaces()
```

---

### Phase 3: Dynamic Tables Sync

This is more complex because tables are created at runtime.

#### Challenge
When user creates a new data_table:
1. API creates PostgreSQL table: `user_table_xyz_123`
2. How does client know to sync this new table?

#### Solution: Watch data_tables for Changes
```typescript
// app/composables/useDynamicTableSync.ts
export const useDynamicTableSync = () => {
  const { syncTable, watchQuery } = useSecureElectricSync()
  const syncedDynamicTables = reactive(new Set<string>())
  
  onMounted(async () => {
    // First, sync data_tables metadata
    await syncTable('data_tables')
    
    // Watch for all data tables
    const result = await watchQuery(`
      SELECT id, table_name FROM data_tables
    `)
    
    // Sync each dynamic table
    watch(result, async (tables) => {
      for (const table of tables || []) {
        if (!syncedDynamicTables.has(table.table_name)) {
          console.log(`[Electric] Syncing dynamic table: ${table.table_name}`)
          
          // Create schema for this dynamic table
          await createDynamicTableSchema(table)
          
          // Sync the table
          await syncTable(table.table_name)
          
          syncedDynamicTables.add(table.table_name)
        }
      }
    }, { deep: true, immediate: true })
  })
  
  return {
    syncedDynamicTables: readonly(syncedDynamicTables)
  }
}

async function createDynamicTableSchema(dataTable: any) {
  const { db } = useSecureElectricSync()
  
  // Get column definitions
  const columns = await db.query(`
    SELECT * FROM data_table_columns 
    WHERE data_table_id = $1 
    ORDER BY "order" ASC
  `, [dataTable.id])
  
  // Build CREATE TABLE statement
  const columnDefs = columns.rows.map(col => {
    let def = `${col.name} `
    
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
  }).join(',\n  ')
  
  const schema = `
    CREATE TABLE IF NOT EXISTS ${dataTable.table_name} (
      id UUID PRIMARY KEY,
      company_id UUID NOT NULL,
      ${columnDefs},
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL,
      created_by UUID
    )
  `
  
  await db.exec(schema)
}
```

#### Update Proxy to Allow Dynamic Tables
```typescript
// server/api/electric/shape.get.ts
export default defineEventHandler(async (event) => {
  const user = requireCompany(event)
  const query = getQuery(event)
  const table = query.table as string
  
  // Static tables whitelist
  const staticTables = [
    'users',
    'companies',
    'workspaces',
    'data_tables',
    'data_table_columns',
  ]
  
  // Check if it's a dynamic table
  const isDynamicTable = table.startsWith('user_table_')
  
  if (!staticTables.includes(table) && !isDynamicTable) {
    throw createError({
      statusCode: 403,
      message: `Table '${table}' is not allowed for sync`
    })
  }
  
  // For dynamic tables, verify it belongs to the company
  if (isDynamicTable) {
    const dataTable = await db.query.dataTables.findFirst({
      where: and(
        eq(dataTables.tableName, table),
        eq(dataTables.companyId, user.company.id)
      )
    })
    
    if (!dataTable) {
      throw createError({
        statusCode: 403,
        message: `Dynamic table '${table}' not found or access denied`
      })
    }
  }
  
  // All tables filter by company_id (except companies table itself)
  const whereClause = table === 'companies' 
    ? `id='${user.company.id}'`
    : `company_id='${user.company.id}'`
  
  // ... rest of proxy logic
})
```

---

## 🚀 Implementation Order

### Week 1: Infrastructure
1. ✅ Update Electric publication with all tables
2. ✅ Update proxy endpoint to handle all tables
3. ✅ Create PGlite schema definitions

### Week 2: Core Composables
4. ✅ Create `useUsers()`
5. ✅ Create `useCompany()`
6. ✅ Create `useWorkspaces()` (enhance existing POC)
7. ✅ Create `useDataTables()`
8. ✅ Create `useDataTableColumns()`

### Week 3: Component Migration
9. ✅ Migrate workspace list/detail pages
10. ✅ Migrate data table list/detail pages
11. ✅ Migrate user profile display
12. ✅ Test multi-tab sync behavior

### Week 4: Dynamic Tables
13. ✅ Implement `useDynamicTableSync()`
14. ✅ Update proxy for dynamic table validation
15. ✅ Test dynamic table creation/sync flow

---

## ✅ Migration Checklist

### Prerequisites
- [ ] Backup production database
- [ ] Test Electric sync with existing data
- [ ] Document rollback procedure

### Core Tables
- [ ] Add to Electric publication
- [ ] Update proxy endpoint
- [ ] Create PGlite schemas
- [ ] Create composables
- [ ] Write tests
- [ ] Migrate components

### Validation
- [ ] Test real-time updates
- [ ] Test multi-tab sync
- [ ] Test offline behavior
- [ ] Test permission filtering
- [ ] Performance testing

---

## 🤔 Open Questions

1. **User profiles**: Sync all company users or just current user?
   - Recommendation: All company users (for collaboration features)

2. **Dynamic tables**: How many dynamic tables per company?
   - If > 50 tables, may need lazy loading strategy

3. **Data volume**: What's the average row count per table?
   - If > 10k rows per table, need pagination strategy

4. **Offline editing**: Will you add this later?
   - If yes, need conflict resolution strategy

5. **Real-time collaboration**: Do you need live cursors/presence?
   - If yes, Electric can help but needs additional setup

---

## 📊 Estimated Impact

### Performance Gains
- **Initial Load**: 50-80% faster (parallel sync vs sequential API calls)
- **Navigation**: 90%+ faster (local queries are instant)
- **Multi-tab**: 70% less network usage (SharedWorker)
- **Offline**: Full read access to synced data

### Developer Experience
- ✅ Simpler component code (no loading states per query)
- ✅ Reactive by default (watchQuery)
- ✅ Type-safe local queries
- ✅ Reduced API endpoint maintenance

### Trade-offs
- ⚠️ Initial complexity (sync setup)
- ⚠️ IndexedDB storage usage
- ⚠️ Read-only (writes still via API)

---

## 🎯 Success Metrics

1. **Sync time**: All core tables < 5 seconds
2. **Query time**: Local queries < 50ms
3. **Multi-tab**: Automatic sync across tabs
4. **Offline**: Core features work offline
5. **Bandwidth**: 50%+ reduction after initial sync

---

Ready to start implementing? Which phase should we begin with? 🚀

