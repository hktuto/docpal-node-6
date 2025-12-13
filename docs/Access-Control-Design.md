# Access Control Design (Multi-User)

## Overview
Design for access control when we add multi-user support. Keep POC simple, but design for future.

---

## Access Control Levels

### 1. Database Level (Workspace Access)
**Who can access this database?**

### 2. Table Level (Optional - inherit from database)
**Who can access this specific table?**

### 3. View Level (What can be seen)
**Who can access this view?**

### 4. Column Level (Field Visibility)
**Which columns are visible/editable?**

### 5. Row Level (Record Filtering)
**Which records can be seen/edited?**

---

## Recommended Architecture (Revised - Database-Scoped Roles)

### Level 1 & 2: Database/Table Access (Database-Scoped Roles) ✅

**Key Concept: Roles are defined per database, not company-wide!**

**Why Database-Scoped Roles:**
- ✅ Each database is independent (like Airtable)
- ✅ Database owner controls roles within their database
- ✅ Roles are context-specific ("Sales Manager" in CRM vs "Editor" in Blog)
- ✅ Simpler permission model
- ✅ Better isolation

**Schema:**

```sql
-- Roles table (database-scoped, not company-scoped!)
CREATE TABLE roles (
  id UUID PRIMARY KEY,
  database_id UUID REFERENCES databases(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,  -- e.g., "Sales Manager", "Content Editor"
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP,
  UNIQUE(database_id, name)  -- Role names unique per database
);

-- Database members (who can access this database)
CREATE TABLE database_members (
  id UUID PRIMARY KEY,
  database_id UUID REFERENCES databases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  role_id UUID REFERENCES roles(id),
  permission VARCHAR(50) CHECK (permission IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP,
  UNIQUE(database_id, user_id)
);

-- Table permissions per role (what actions can this role do on this table)
CREATE TABLE table_permissions (
  id UUID PRIMARY KEY,
  table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  can_read BOOLEAN DEFAULT true,
  can_create BOOLEAN DEFAULT false,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP,
  UNIQUE(table_id, role_id)
);
```

**Database Member Permissions:**
- **owner** - Created the database, can delete it, manage all access
- **admin** - Can manage roles, invite users, full access to data
- **member** - Access determined by assigned role

**Example:**
```
CRM Database
├─ Roles (defined by database owner):
│   ├─ "Sales Manager" role
│   │   ├─ Customers table → can_read, can_create, can_update
│   │   └─ Orders table → can_read, can_create, can_update
│   ├─ "Sales Rep" role
│   │   ├─ Customers table → can_read, can_update
│   │   └─ Orders table → can_read, can_create
│   └─ "Support" role
│       ├─ Customers table → can_read
│       └─ Orders table → can_read
│
└─ Members:
    ├─ Alice → owner (full access)
    ├─ Bob → "Sales Manager" role
    ├─ Carol → "Sales Rep" role
    └─ David → "Support" role
```

**User Flow (Your Vision):**
```
1. User logs in
   ↓
2. List databases → Filter by database_members (where user_id = current_user)
   ↓
3. Open database → Get user's role in this database
   ↓
4. List tables → Filter by table_permissions (where role_id = user's_role)
   ↓
5. Open table → Get column permissions for user's role
   ↓
6. Open view → Apply row rules and column rules
   ↓
7. Return filtered data
```

**Access Check:**
```typescript
async function canAccessDatabase(userId: string, databaseId: string) {
  const [member] = await sql`
    SELECT role_id, permission 
    FROM database_members 
    WHERE database_id = ${databaseId} 
      AND user_id = ${userId}
  `;
  
  return !!member;  // User is a member of this database
}

async function canAccessTable(userId: string, tableId: string) {
  // Get user's role in this database
  const [member] = await sql`
    SELECT dm.role_id 
    FROM database_members dm
    JOIN tables t ON t.database_id = dm.database_id
    WHERE t.id = ${tableId} 
      AND dm.user_id = ${userId}
  `;
  
  if (!member) return false;
  
  // Check if role has read permission on this table
  const [permission] = await sql`
    SELECT can_read 
    FROM table_permissions 
    WHERE table_id = ${tableId} 
      AND role_id = ${member.role_id}
  `;
  
  return permission?.can_read ?? false;
}
```

---

### Alternative: Direct User Assignment

Allow assigning users directly (without roles):

```sql
-- Add user_id to database_access
ALTER TABLE database_access ADD COLUMN user_id UUID REFERENCES users(id);
ALTER TABLE database_access DROP CONSTRAINT database_access_database_id_role_id_key;
ALTER TABLE database_access ADD CONSTRAINT check_role_or_user CHECK (
  (role_id IS NOT NULL AND user_id IS NULL) OR
  (role_id IS NULL AND user_id IS NOT NULL)
);
```

**Example:**
```
CRM Database
├─ Sales role → editor
└─ john@example.com → viewer (direct assignment)
```

**When to use:**
- Quick exceptions ("give John access just to this one database")
- Guest users without roles
- Contractors with limited access

---

## Level 3: View Access (Explicit Grants)

Already designed in BRD - views can have explicit access:

```sql
CREATE TABLE view_access (
  id UUID PRIMARY KEY,
  view_id UUID REFERENCES views(id),
  role_id UUID REFERENCES roles(id),
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP,
  CHECK ((role_id IS NOT NULL AND user_id IS NULL) OR 
         (role_id IS NULL AND user_id IS NOT NULL))
);
```

**Behavior:**
- If no view_access records → inherit table access
- If view_access exists → only those roles/users can access

---

## Level 4: Column Rules (Condition-Based)

From BRD - use flexible condition rules:

```sql
CREATE TABLE column_rules (
  id UUID PRIMARY KEY,
  column_id UUID REFERENCES columns(id),
  role_id UUID REFERENCES roles(id),
  user_id UUID REFERENCES users(id),
  mode VARCHAR(50) CHECK (mode IN ('hide', 'readonly', 'masked')),
  condition JSONB,  -- Optional: show/hide based on record data
  created_at TIMESTAMP
);
```

**Modes:**
- **hide** - Column not visible
- **readonly** - Visible but can't edit
- **masked** - Visible but values masked (****)

**Example:**
```json
// Hide salary column from everyone except HR role
{
  "column_id": "col_salary",
  "role_id": "role_hr",
  "mode": "hide"  // Inverted: HR can see, others can't
}

// Make status readonly for Viewer role
{
  "column_id": "col_status",
  "role_id": "role_viewer",
  "mode": "readonly"
}

// Conditional: Hide email if record is archived
{
  "column_id": "col_email",
  "mode": "hide",
  "condition": {
    "column_id": "col_archived",
    "operator": "equals",
    "value": true
  }
}
```

---

## Level 5: Row Rules (Condition-Based)

From BRD - filter which records users can see:

```sql
CREATE TABLE row_rules (
  id UUID PRIMARY KEY,
  table_id UUID REFERENCES tables(id),
  role_id UUID REFERENCES roles(id),
  user_id UUID REFERENCES users(id),
  condition JSONB NOT NULL,
  action VARCHAR(50) CHECK (action IN ('read', 'edit', 'delete')),
  created_at TIMESTAMP
);
```

**Example:**
```json
// Sales role can only see their own leads
{
  "table_id": "leads_table",
  "role_id": "role_sales",
  "action": "read",
  "condition": {
    "column_id": "col_assigned_to",
    "operator": "equals",
    "value": "{{current_user_id}}"  // Dynamic value
  }
}

// Support can only edit active tickets
{
  "table_id": "tickets_table",
  "role_id": "role_support",
  "action": "edit",
  "condition": {
    "column_id": "col_status",
    "operator": "equals",
    "value": "active"
  }
}
```

---

## Complete Access Control Flow (Your Vision)

```
1. User logs in
   ↓
2. GET /api/databases
   ├─ Query: SELECT * FROM databases WHERE id IN (
   │         SELECT database_id FROM database_members WHERE user_id = current_user
   │       )
   └─ Returns: Only databases user is a member of
   ↓
3. User opens database → Get user's role in this database
   ├─ Query: SELECT role_id, permission FROM database_members
   │         WHERE database_id = ? AND user_id = ?
   └─ Store: user's role_id and permission level
   ↓
4. GET /api/databases/:id/tables
   ├─ Query: SELECT * FROM tables WHERE database_id = ?
   │         AND id IN (
   │           SELECT table_id FROM table_permissions
   │           WHERE role_id = user's_role_id AND can_read = true
   │         )
   └─ Returns: Only tables user's role can read
   ↓
5. User opens table → Check permissions
   ├─ Query: SELECT can_read, can_create, can_update, can_delete
   │         FROM table_permissions
   │         WHERE table_id = ? AND role_id = user's_role_id
   └─ Returns: User's action permissions
   ↓
6. User opens view → Apply column rules
   ├─ Get column rules for user's role
   ├─ Hide/readonly/mask columns as needed
   └─ Return visible columns only
   ↓
7. GET /api/views/:id/records → Apply row rules
   ├─ Get row rules for user's role
   ├─ Filter records based on conditions
   └─ Return filtered records with allowed columns
```

---

## Schema Summary (Revised - Database-Scoped)

**New Tables for Multi-User:**

```sql
-- Roles (database-scoped, not company-scoped!)
roles (id, database_id, name, description, created_by)

-- Database membership
database_members (id, database_id, user_id, role_id, permission)

-- Table permissions per role
table_permissions (id, table_id, role_id, can_read, can_create, can_update, can_delete)

-- Column rules (per role)
column_rules (id, column_id, role_id, mode, condition)

-- Row rules (per role)
row_rules (id, table_id, role_id, condition, action)

-- View access (optional - explicit grants)
view_access (id, view_id, role_id/user_id)
```

**Key Differences from Original:**
- ❌ No company-wide roles
- ✅ Roles scoped to database
- ✅ `database_members` instead of `database_access`
- ✅ `table_permissions` with granular CRUD flags

---

## POC Implementation (Phase 2+)

**Phase 1 (POC):**
- ✅ Single fixed user
- ✅ No access control
- ✅ Design schema for future

**Phase 2 (Basic Multi-User):**
- Add `roles` and `user_roles` tables
- Add `database_access` table
- Implement database-level access checks
- UI to invite users and assign roles

**Phase 3 (Advanced Permissions):**
- Add `column_rules` and `row_rules`
- Implement column visibility
- Implement row filtering
- Add `view_access` for view-level permissions

---

## Example Scenarios

### Scenario 1: Simple CRM Access (Database-Scoped)
```
CRM Database
├─ Owner: Alice (created the database)
│
├─ Roles (created by Alice):
│   ├─ "Sales Manager"
│   │   ├─ Customers: read, create, update, delete
│   │   └─ Orders: read, create, update, delete
│   ├─ "Sales Rep"
│   │   ├─ Customers: read, update
│   │   └─ Orders: read, create
│   └─ "Support"
│       ├─ Customers: read
│       └─ Orders: read
│
└─ Members:
    ├─ Alice → owner
    ├─ Bob → "Sales Manager" role
    ├─ Carol → "Sales Rep" role
    └─ David → "Support" role

Blog Database (completely separate!)
├─ Owner: Bob
└─ Roles:
    ├─ "Editor" → can write posts
    └─ "Viewer" → can read posts
```

### Scenario 2: Multi-Database Access
```
Engineering Database
├─ Owner: Alice
└─ Members:
    ├─ Bob → "Lead Engineer" role
    └─ Carol → "Engineer" role

Marketing Database
├─ Owner: Alice
└─ Members:
    ├─ Carol → "Marketing Manager" role
    └─ David → "Content Writer" role

Note: Carol is a member of BOTH databases with different roles!
- In Engineering DB: "Engineer" role (limited access)
- In Marketing DB: "Marketing Manager" role (full access)
```

### Scenario 3: Row-Level Filtering
```
Leads Table
├─ Sales role can see only their assigned leads
│   Row Rule: col_assigned_to = current_user_id
│
└─ Manager role can see all leads
    No row rules (full access)
```

### Scenario 4: Column-Level Privacy
```
Employees Table
├─ HR role → can see salary column
├─ Manager role → salary column is masked (****)
└─ Employee role → salary column is hidden
```

---

## Recommended Approach for Your App

### Start Simple, Add Complexity as Needed

**Phase 1 (POC):**
```sql
-- Just these tables (already have)
users
companies
databases
tables
columns
records
views
```

**Phase 2 (Multi-User):**
```sql
-- Add role system
roles
user_roles
database_access
```

**Phase 3 (Granular):**
```sql
-- Add fine-grained control
table_access     (optional)
view_access      (explicit view grants)
column_rules     (hide/readonly/mask)
row_rules        (filter records)
```

---

## Benefits of This Approach

**✅ Simple at Database Level**
- Role-based access is easy to understand
- "Give Sales team access to CRM" - intuitive
- Few database records to manage

**✅ Flexible at Column/Row Level**
- Condition-based rules allow complex scenarios
- Can handle dynamic requirements
- Matches BRD design

**✅ Scalable**
- Start simple, add complexity later
- Each level independent
- Can skip table_access if not needed

**✅ User-Friendly**
- Admins think in roles, not rules
- Simple 95% of the time
- Power-user features when needed

---

## Migration Path

**Now (POC):**
- Design schema (done in this doc)
- Skip implementation

**Later (Phase 2):**
- Add 3 tables: `roles`, `user_roles`, `database_access`
- Implement access checks in middleware
- UI for role management

**Future (Phase 3):**
- Add `column_rules` and `row_rules`
- Implement permission engine
- UI for advanced rules

---

## Alternative: Everything Role-Based

If you want maximum simplicity:

```sql
-- No condition rules, just role-based everything
database_access (database_id, role_id, permission)
column_access (column_id, role_id, mode)
view_access (view_id, role_id)
```

**Pros:**
- Simpler to implement
- Fewer edge cases

**Cons:**
- Less flexible
- Can't do "show salary only if user is manager of that employee"
- Can't do "show records only if status = active"

---

## Cross-Database Linking Strategy

### Question
What happens when a link column points to a table in another database?

### Decision: Hybrid Three-Mode Approach ✅

**Phase 1 (POC):**
- ✅ **Same-database links only**
- Link columns can only reference tables within the same database
- Keeps permissions simple
- Defer cross-database complexity

**Phase 4 (Production):**
- ✅ **Three sharing modes per table**
- Database owner chooses how their table can be shared
- Flexible from "no sharing" to "public" to "approval required"

**Schema Addition (Phase 4):**
```sql
-- Add sharing mode to tables
ALTER TABLE tables ADD COLUMN sharing_mode VARCHAR(50) 
  DEFAULT 'private'
  CHECK (sharing_mode IN ('private', 'public', 'on_request'));

-- Track access requests (for on_request mode)
CREATE TABLE cross_database_access_requests (
  id UUID PRIMARY KEY,
  requesting_database_id UUID REFERENCES databases(id),
  target_database_id UUID REFERENCES databases(id),
  target_table_id UUID REFERENCES tables(id),
  requested_by UUID REFERENCES users(id),
  status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Track approved grants (which databases can access which tables)
CREATE TABLE cross_database_grants (
  id UUID PRIMARY KEY,
  source_database_id UUID REFERENCES databases(id),
  source_table_id UUID REFERENCES tables(id),
  target_database_id UUID REFERENCES databases(id),
  allowed_columns JSONB,  -- null = all columns, or array of column IDs
  granted_by UUID REFERENCES users(id),
  created_at TIMESTAMP,
  UNIQUE(source_table_id, target_database_id)
);

-- Query for linkable tables from Database B
SELECT t.* FROM tables t
WHERE t.deleted_at IS NULL
  AND (
    -- Own database tables
    t.database_id = ${currentDatabaseId}
    OR
    -- Public tables from any database
    t.sharing_mode = 'public'
    OR
    -- Tables with explicit grants
    EXISTS (
      SELECT 1 FROM cross_database_grants g
      WHERE g.source_table_id = t.id
        AND g.target_database_id = ${currentDatabaseId}
    )
  );
```

### Three Sharing Modes

**1. Private (Default)**
```sql
sharing_mode = 'private'
```
- **No cross-database linking allowed**
- Only tables within same database can link
- Maximum data isolation
- Use for: Sensitive data, internal-only tables

**2. Public**
```sql
sharing_mode = 'public'
```
- **Anyone in company can link immediately**
- No approval needed
- All columns visible (respecting user's database membership)
- Use for: Reference data, company-wide resources

**3. On Request**
```sql
sharing_mode = 'on_request'
```
- **Requires owner approval per database**
- Granular control over who can access
- Can specify which columns to share
- Audit trail of all access
- Use for: Shared but controlled data

---

### Access Request Flow (on_request mode)

**Step 1: User Attempts to Link**
```typescript
// User in Database B tries to create link to Database A's table
const linkableTables = await getAvailableTablesForLinking(databaseBId);
// Table not in list → Show "Request Access" button
```

**Step 2: Submit Request**
```typescript
await sql`
  INSERT INTO cross_database_access_requests (
    requesting_database_id,
    target_database_id,
    target_table_id,
    requested_by,
    status,
    message
  ) VALUES (
    ${databaseBId},
    ${databaseAId},
    ${tableId},
    ${userId},
    'pending',
    'Need to link orders to your product catalog'
  )
`;

// Notify Database A owner
await sendNotification(databaseAOwnerId, 'Access request pending');
```

**Step 3: Owner Reviews Request**
```typescript
// Database A owner sees pending requests
const requests = await sql`
  SELECT * FROM cross_database_access_requests
  WHERE target_database_id = ${databaseAId}
    AND status = 'pending'
`;
```

**Step 4: Owner Approves (with options)**
```typescript
// Option 1: Approve all columns
await sql`
  INSERT INTO cross_database_grants (
    source_database_id,
    source_table_id,
    target_database_id,
    allowed_columns,
    granted_by
  ) VALUES (
    ${databaseAId},
    ${tableId},
    ${databaseBId},
    null,  -- null = all columns
    ${ownerId}
  )
`;

// Option 2: Approve specific columns only
await sql`
  INSERT INTO cross_database_grants (...)
  VALUES (
    ...,
    ${JSON.stringify(['col_id_1', 'col_id_2'])},  -- specific columns
    ...
  )
`;

// Update request status
await sql`
  UPDATE cross_database_access_requests
  SET status = 'approved',
      approved_by = ${ownerId},
      approved_at = NOW()
  WHERE id = ${requestId}
`;
```

**Step 5: Owner Rejects (with reason)**
```typescript
await sql`
  UPDATE cross_database_access_requests
  SET status = 'rejected',
      rejection_reason = 'This data is for internal use only',
      approved_by = ${ownerId},
      approved_at = NOW()
  WHERE id = ${requestId}
`;
```

**Step 6: Display Linked Records**
```typescript
async function getLinkedRecord(
  recordId: string, 
  currentDatabaseId: string,
  userId: string
) {
  const record = await sql`SELECT * FROM records WHERE id = ${recordId}`;
  const table = await sql`SELECT * FROM tables WHERE id = ${record.table_id}`;
  
  // Check access
  if (table.database_id === currentDatabaseId) {
    return record;  // Own database, full access
  }
  
  if (table.sharing_mode === 'public') {
    return record;  // Public table, full access
  }
  
  // Check for explicit grant
  const [grant] = await sql`
    SELECT allowed_columns 
    FROM cross_database_grants
    WHERE source_table_id = ${table.id}
      AND target_database_id = ${currentDatabaseId}
  `;
  
  if (grant) {
    if (grant.allowed_columns === null) {
      return record;  // All columns granted
    } else {
      // Return only allowed columns
      const filteredData = {};
      for (const colId of grant.allowed_columns) {
        filteredData[colId] = record.data[colId];
      }
      return { ...record, data: filteredData };
    }
  }
  
  // No access
  return {
    id: record.id,
    _display: record.data[table.primary_column_id],
    _no_access: true
  };
}
```

---

### Use Cases by Mode

**Private Mode:**
```
HR Database
├─ Payroll table (sharing_mode = 'private')
│   → Only HR members can access
│   → No cross-database linking
├─ Performance Reviews (sharing_mode = 'private')
└─ Disciplinary Actions (sharing_mode = 'private')
```

**Public Mode:**
```
Company Resources
├─ Users table (sharing_mode = 'public')
│   → Everyone can link to users
├─ Departments table (sharing_mode = 'public')
│   → Everyone can link to departments
└─ Office Locations (sharing_mode = 'public')
    → Everyone can reference locations
```

**On Request Mode:**
```
Inventory Database
├─ Products table (sharing_mode = 'on_request')
│   → Sales DB requests access → Approved (all columns)
│   → Support DB requests access → Approved (name, SKU only)
│   → Marketing DB requests access → Rejected
├─ Suppliers table (sharing_mode = 'on_request')
└─ Warehouse Locations (sharing_mode = 'on_request')
```

---

### Benefits of Hybrid Approach

**✅ Flexibility**
- Owner chooses appropriate mode per table
- Can change mode as needs evolve

**✅ Control**
- On-request mode gives full control
- Can approve per database
- Can limit which columns

**✅ Convenience**
- Public mode for common data (no friction)
- Private mode for sensitive data (no risk)

**✅ Audit Trail**
- All requests tracked
- Know who requested, when, why
- Know who approved/rejected

**✅ Revocable**
- Owner can delete grants anytime
- Existing links continue to work but show limited info

**✅ Scalable**
- Works for 2 databases or 200
- Clear ownership model

---

## My Strong Recommendation

Use **hybrid approach**:
- **Database/Table** → Role-based (simple, intuitive)
- **Column/Row** → Condition-based (flexible, powerful)
- **Cross-Database** → Public read flag + permission checks (flexible, secure)

This gives you:
- Simple mental model for access ("Sales team has editor access to CRM")
- Powerful flexibility for edge cases ("hide salary except for HR")
- Shared reference data across databases (Products, Users)
- Matches how users think about permissions

