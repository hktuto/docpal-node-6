# ElectricSQL Row-Level Permissions - Deep Dive

## 🤔 The Challenge

### Current Solution (Table-Level)
```
User has access to workspace123
  → Sync ALL data_tables for workspace123
  → User sees all tables in that workspace
```

### Future Need (Row-Level)
```
User has access to workspace123
  BUT only specific rows:
    - Tables they own (owner_id = user.id)
    - Tables shared with them (shared_with contains user.id)
    - Public tables (visibility = 'public')
    
  → How to sync only those specific rows?
```

---

## 🚫 Why This is Hard

### Problem 1: Electric's WHERE Clause Limitations
Electric's WHERE clause can't reference:
- User context dynamically
- Complex OR conditions across multiple fields
- Array contains operations (`user.id IN shared_with`)

```sql
-- ❌ Can't do this in Electric WHERE
where=owner_id='user123' OR 'user123'=ANY(shared_with) OR visibility='public'

-- ✅ Can only do simple conditions
where=company_id='company456'
```

### Problem 2: Security
If we sync all rows and filter client-side:
- ❌ User receives unauthorized data (security breach!)
- ❌ Wastes bandwidth syncing data they can't see
- ❌ Can be inspected in browser DevTools

### Problem 3: Dynamic Nature
Permissions can change:
- User added to `shared_with` array
- Row visibility changes from private → public
- User becomes owner (transfer ownership)

---

## 💡 Solution Options

### Option 1: Denormalized Permission Column ⭐ (Recommended)

**Concept**: Add `accessible_by_user_ids` column to each table that stores which users can access each row.

#### Schema
```sql
CREATE TABLE data_tables (
  id UUID PRIMARY KEY,
  name TEXT,
  workspace_id UUID,
  company_id UUID,
  owner_id UUID,
  visibility TEXT,  -- 'private', 'shared', 'public'
  shared_with UUID[],
  
  -- Denormalized permission column
  accessible_by_user_ids UUID[] NOT NULL DEFAULT '{}',
  
  -- Other columns...
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Index for efficient filtering
CREATE INDEX idx_data_tables_accessible_by ON data_tables USING GIN (accessible_by_user_ids);
```

#### How It Works
```sql
-- When creating/updating a row, automatically compute who can access it
CREATE OR REPLACE FUNCTION compute_accessible_users()
RETURNS TRIGGER AS $$
BEGIN
  NEW.accessible_by_user_ids = ARRAY(
    SELECT DISTINCT user_id FROM (
      -- Owner can always access
      SELECT NEW.owner_id AS user_id
      
      UNION
      
      -- Shared users can access
      SELECT unnest(NEW.shared_with) AS user_id
      WHERE NEW.visibility IN ('shared', 'public')
      
      UNION
      
      -- All company users can access if public
      SELECT u.id AS user_id
      FROM users u
      WHERE u.company_id = NEW.company_id
        AND NEW.visibility = 'public'
    ) AS accessible_users
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compute_accessible_users
  BEFORE INSERT OR UPDATE ON data_tables
  FOR EACH ROW
  EXECUTE FUNCTION compute_accessible_users();
```

#### Electric Sync
```sql
-- Now we can use a simple WHERE clause!
where=company_id='company456' AND 'user123'=ANY(accessible_by_user_ids)
```

#### Pros
- ✅ Simple Electric WHERE clause
- ✅ Secure (only sync accessible rows)
- ✅ Fast queries (GIN index)
- ✅ Automatic updates via trigger
- ✅ Works with Electric's limitations

#### Cons
- ❌ Denormalized data
- ❌ Need trigger maintenance
- ❌ Large arrays if many users (for public rows)

---

### Option 2: Multiple Shapes per Table

**Concept**: Create separate Electric shapes for different permission contexts.

#### Implementation
```typescript
// Client syncs multiple shapes for the same table
const { syncShape } = useSecureElectricSync()

// Shape 1: Tables owned by user
await syncShape({
  url: '/api/electric/shape',
  table: 'data_tables',
  params: {
    filter: 'owned',  // Custom param
  }
})

// Shape 2: Tables shared with user  
await syncShape({
  url: '/api/electric/shape',
  table: 'data_tables',
  params: {
    filter: 'shared',
  }
})

// Shape 3: Public tables
await syncShape({
  url: '/api/electric/shape',
  table: 'data_tables',
  params: {
    filter: 'public',
  }
})
```

#### Backend Proxy
```typescript
// server/api/electric/shape.get.ts
export default defineEventHandler(async (event) => {
  const user = requireCompany(event)
  const query = getQuery(event)
  const filter = query.filter as string
  
  let whereClause = ''
  
  if (query.table === 'data_tables') {
    switch (filter) {
      case 'owned':
        whereClause = `owner_id='${user.id}'`
        break
      case 'shared':
        // This is the problem - can't do array contains in Electric WHERE!
        whereClause = `??? how to check user.id in shared_with array ???`
        break
      case 'public':
        whereClause = `visibility='public' AND company_id='${user.company.id}'`
        break
    }
  }
  
  // ... proxy to Electric
})
```

#### Problem
❌ Can't check if `user.id` is in `shared_with` array using Electric's WHERE syntax!

#### Verdict
❌ Doesn't solve the core problem

---

### Option 3: Row Permission Table (Similar to user_permissions)

**Concept**: Separate table tracking user access to each row.

#### Schema
```sql
CREATE TABLE user_row_permissions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  row_id UUID NOT NULL,
  permission_level TEXT,  -- 'read', 'write', 'admin'
  granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, table_name, row_id)
);

CREATE INDEX idx_user_row_perms_user ON user_row_permissions(user_id, table_name);
CREATE INDEX idx_user_row_perms_row ON user_row_permissions(table_name, row_id);
```

#### How It Works
```sql
-- When data_table row is created/updated, sync permissions
CREATE OR REPLACE FUNCTION sync_row_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete old permissions for this row
  DELETE FROM user_row_permissions
  WHERE table_name = 'data_tables'
    AND row_id = NEW.id;
  
  -- Insert owner permission
  INSERT INTO user_row_permissions (user_id, table_name, row_id, permission_level)
  VALUES (NEW.owner_id, 'data_tables', NEW.id, 'admin');
  
  -- Insert shared user permissions
  IF NEW.visibility IN ('shared', 'public') THEN
    INSERT INTO user_row_permissions (user_id, table_name, row_id, permission_level)
    SELECT unnest(NEW.shared_with), 'data_tables', NEW.id, 'write';
  END IF;
  
  -- Insert public permissions (all company users)
  IF NEW.visibility = 'public' THEN
    INSERT INTO user_row_permissions (user_id, table_name, row_id, permission_level)
    SELECT u.id, 'data_tables', NEW.id, 'read'
    FROM users u
    WHERE u.company_id = NEW.company_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_row_permissions
  AFTER INSERT OR UPDATE ON data_tables
  FOR EACH ROW
  EXECUTE FUNCTION sync_row_permissions();
```

#### Client-Side Usage
```typescript
// 1. Sync user_row_permissions first
await syncTable('user_row_permissions')

// 2. Watch for accessible row IDs
const accessibleTableIds = await watchQuery(`
  SELECT row_id 
  FROM user_row_permissions 
  WHERE user_id = $1 
    AND table_name = 'data_tables'
`, [user.id])

// 3. Query data_tables, filtered by accessible IDs
const tables = await watchQuery(`
  SELECT * 
  FROM data_tables 
  WHERE id = ANY($1)
`, [accessibleTableIds.value.map(r => r.row_id)])
```

#### Problem with Electric Sync
```typescript
// ❌ Can't do this in Electric WHERE clause
where=id IN (SELECT row_id FROM user_row_permissions WHERE user_id='user123')

// Electric doesn't support subqueries!
```

#### Workaround: Sync All, Filter Client-Side
```typescript
// Step 1: Sync user_row_permissions (small table)
await syncTable('user_row_permissions')

// Step 2: Sync ALL data_tables for company (might be large!)
await syncTable('data_tables')  // where=company_id='company123'

// Step 3: Filter client-side using JOIN
const tables = await db.query(`
  SELECT dt.* 
  FROM data_tables dt
  INNER JOIN user_row_permissions urp 
    ON dt.id = urp.row_id 
    AND urp.table_name = 'data_tables'
  WHERE urp.user_id = $1
`, [user.id])
```

#### Pros
- ✅ Normalized design
- ✅ Flexible permission model
- ✅ Can do client-side JOINs in PGlite

#### Cons
- ❌ Syncs all rows (bandwidth waste)
- ❌ User receives unauthorized data (security concern!)
- ❌ Large `user_row_permissions` table
- ❌ Complex trigger maintenance

---

### Option 4: Hybrid - Denormalized Column + Permission Table

**Concept**: Best of both worlds - use denormalized column for Electric sync, permission table for detailed tracking.

#### Schema
```sql
-- Main table with denormalized access column
CREATE TABLE data_tables (
  id UUID PRIMARY KEY,
  name TEXT,
  workspace_id UUID,
  company_id UUID,
  owner_id UUID,
  visibility TEXT,
  shared_with UUID[],
  
  -- For Electric sync (denormalized)
  accessible_by_user_ids UUID[] NOT NULL,
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Detailed permission tracking (optional, for audit/management)
CREATE TABLE user_row_permissions (
  user_id UUID,
  table_name TEXT,
  row_id UUID,
  permission_level TEXT,
  granted_at TIMESTAMP,
  granted_by UUID,
  PRIMARY KEY (user_id, table_name, row_id)
);
```

#### Sync Strategy
```typescript
// Electric syncs using denormalized column
where=company_id='company123' AND 'user456'=ANY(accessible_by_user_ids)

// Client queries directly from data_tables (already filtered)
const tables = await db.query(`
  SELECT * FROM data_tables 
  WHERE workspace_id = $1
`, [workspaceId])
```

#### Pros
- ✅ Secure (only accessible rows synced)
- ✅ Fast (no client-side JOIN needed)
- ✅ Efficient bandwidth
- ✅ Optional detailed tracking

#### Cons
- ❌ Denormalized data
- ❌ Trigger complexity
- ❌ Large arrays for public rows

---

## 🎯 Recommended Solution: Option 1 + Optimizations

### Core Approach: Denormalized `accessible_by_user_ids` Column

#### For Small-to-Medium User Count per Row
Use array column directly:
```sql
accessible_by_user_ids UUID[]
where='user123'=ANY(accessible_by_user_ids) AND company_id='company456'
```

#### For Large User Count (Public Rows)
Use special sentinel values:
```sql
-- Instead of listing all company users for public rows
accessible_by_user_ids = ARRAY['00000000-0000-0000-0000-000000000000']::UUID[]

-- Backend proxy translates 'public' access
if (row.accessible_by_user_ids.includes('00000000-0000-0000-0000-000000000000')) {
  // User in same company can access
  return true
}
```

Or use a separate boolean flag:
```sql
is_public BOOLEAN,
accessible_by_user_ids UUID[]  -- Only for private/shared

-- WHERE clause
where=(is_public=true AND company_id='company456') 
      OR 'user123'=ANY(accessible_by_user_ids)
```

Wait, can Electric do OR in WHERE? Let me check the syntax...

Actually, Electric's WHERE clause syntax is limited. It might not support OR.

Let me reconsider...

---

## 🔄 Revised Recommendation: Separate Shapes by Visibility

### Approach
Instead of one shape with complex OR logic, create **separate shapes for different access patterns**:

#### Schema (Keep Simple)
```sql
CREATE TABLE data_tables (
  id UUID PRIMARY KEY,
  name TEXT,
  workspace_id UUID,
  company_id UUID,
  owner_id UUID,
  visibility TEXT,  -- 'private', 'shared', 'public'
  shared_with_user_ids UUID[],
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### Client Syncs Multiple Filtered Shapes
```typescript
const user = useCurrentUser()

// Shape 1: Private tables (owned by user)
await syncShape({
  url: '/api/electric/shape',
  table: 'data_tables',
  shapeId: 'data_tables_private',
  params: { access_type: 'private' }
})

// Shape 2: Shared tables (user in shared_with array)
await syncShape({
  url: '/api/electric/shape',
  table: 'data_tables_shared',  // Virtual table name
  shapeId: 'data_tables_shared',
  params: { access_type: 'shared' }
})

// Shape 3: Public tables
await syncShape({
  url: '/api/electric/shape',
  table: 'data_tables',
  shapeId: 'data_tables_public',
  params: { access_type: 'public' }
})
```

#### Backend Creates Filtered Views
```sql
-- Create PostgreSQL views for different access patterns

-- View 1: Private tables (owner only)
-- Handled by proxy WHERE: owner_id='user123'

-- View 2: Shared tables (user in shared_with array)
-- This is the tricky one...

-- View 3: Public tables
-- Handled by proxy WHERE: visibility='public' AND company_id='company456'
```

#### The Shared Tables Problem
How to sync tables where `user.id IN shared_with_user_ids`?

**Solution: Materialized Join Table**
```sql
-- Explode array into rows
CREATE TABLE data_table_user_access (
  data_table_id UUID NOT NULL,
  user_id UUID NOT NULL,
  access_type TEXT NOT NULL,  -- 'owner', 'shared', 'public'
  PRIMARY KEY (data_table_id, user_id)
);

-- Trigger to maintain this table
CREATE OR REPLACE FUNCTION sync_table_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete old access records
  DELETE FROM data_table_user_access WHERE data_table_id = NEW.id;
  
  -- Insert owner access
  INSERT INTO data_table_user_access (data_table_id, user_id, access_type)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  
  -- Insert shared access
  IF NEW.shared_with_user_ids IS NOT NULL THEN
    INSERT INTO data_table_user_access (data_table_id, user_id, access_type)
    SELECT NEW.id, unnest(NEW.shared_with_user_ids), 'shared';
  END IF;
  
  -- Insert public access (all company users)
  IF NEW.visibility = 'public' THEN
    INSERT INTO data_table_user_access (data_table_id, user_id, access_type)
    SELECT NEW.id, u.id, 'public'
    FROM users u
    WHERE u.company_id = NEW.company_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### Client Syncs Access Table + Main Table
```typescript
// Step 1: Sync access table (filtered by user_id)
await syncShape({
  url: '/api/electric/shape',
  table: 'data_table_user_access',
  where: `user_id='${user.id}'`
})

// Step 2: Sync main table (all rows for company)
await syncShape({
  url: '/api/electric/shape',
  table: 'data_tables',
  where: `company_id='${company.id}'`
})

// Step 3: Query with client-side JOIN
const accessibleTables = await db.query(`
  SELECT dt.* 
  FROM data_tables dt
  INNER JOIN data_table_user_access dtua 
    ON dt.id = dtua.data_table_id
  WHERE dtua.user_id = $1
    AND dt.workspace_id = $2
  ORDER BY dt.created_at DESC
`, [user.id, workspaceId])
```

#### Security Concern?
⚠️ User syncs ALL company data_tables, then filters client-side.
- User can inspect data in IndexedDB
- Can see tables they shouldn't have access to

This is only acceptable if:
1. Data within company is semi-trusted
2. Real protection is at workspace/table level, not row level
3. Sensitive data is in separate tables

---

## ✅ Final Recommendation

### For Your Use Case: **data_table_user_access Table (Materialized JOIN)**

#### Why This Works Best

1. **Handles all access patterns**:
   - Owner-only (private)
   - Shared with specific users
   - Public to all company

2. **Electric-compatible**:
   - Sync `data_table_user_access` filtered by `user_id`
   - Sync `data_tables` filtered by `company_id`
   - JOIN client-side in PGlite

3. **Real-time permission updates**:
   - Change `shared_with` → trigger updates `data_table_user_access`
   - Electric syncs changes
   - Client-side query automatically reflects new access

4. **Performance**:
   - `data_table_user_access` is small (only user's rows)
   - Client-side JOIN is fast with proper indexes
   - No array operations needed

#### Security Trade-off Decision Point

**Option A: Sync only accessible rows (Most Secure)**
- Backend computes accessible row IDs from `data_table_user_access`
- Proxy only returns those specific rows
- Requires custom shape management

**Option B: Sync all company rows (Performance)**
- Sync all `data_tables` for company
- Filter client-side using `data_table_user_access`
- Simpler sync logic, but user sees unauthorized data locally

**Which do you prefer?** This is a product decision:
- How sensitive is the data in `data_tables`?
- Is company-level trust acceptable?
- How important is sync simplicity vs. security?

Let's discuss! 🤔

