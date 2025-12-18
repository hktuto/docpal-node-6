# DocPal Development Plan

## Project Overview
A low-code platform built with Nuxt + NuxtHub allowing users to create companies, apps, dynamic data tables, views, dashboards, and automation workflows.

## Tech Stack
- **Frontend**: Nuxt 4
- **UI Library**: Element Plus
- **Styling**: SCSS + CSS Variables (no Tailwind)
- **Backend**: NuxtHub
- **Database**: PostgreSQL + Drizzle ORM
- **File Storage**: MinIO (S3-compatible)
- **Workflow Engine**: Temporal (Phase 5)
- **Real-time**: WebSockets/SSE (Phase 4)

---

## Phase 1: POC - Dynamic Tables & Views (CURRENT)

**Goal**: Prove that dynamic table creation, data management, and querying works.

**Scope**: 
- No real authentication (dummy user)
- Focus on core technical challenges
- Validate architecture decisions

### 1.1 Database Schema Foundation

**Tables to Create:**

#### Core Metadata Tables
```sql
-- Apps table
apps
  - id: uuid
  - name: string
  - icon: string (url)
  - description: text
  - menu: jsonb
  - company_id: uuid (dummy for now)
  - created_at: timestamp
  - updated_at: timestamp

-- Dynamic Tables metadata
data_tables
  - id: uuid
  - name: string
  - app_id: uuid
  - table_name: string (physical PG table name, e.g., "dt_users_8f3a")
  - schema: jsonb (column definitions)
  - default_card_view: jsonb
  - default_form: jsonb
  - default_detail_dashboard: jsonb
  - user_card_view: jsonb
  - form: jsonb
  - detail_view: jsonb
  - created_at: timestamp
  - updated_at: timestamp

-- Dynamic Table Columns metadata (for easier querying)
data_table_columns
  - id: uuid
  - data_table_id: uuid
  - name: string
  - type: string (text, number, date, select, multiselect, etc.)
  - config: jsonb (options, validation rules, etc.)
  - order: integer
  - required: boolean
  - created_at: timestamp

-- Views metadata
views
  - id: uuid
  - name: string
  - description: text
  - app_id: uuid
  - data_table_id: uuid
  - type: enum (table, kanban, gantt, calendar)
  - schema: jsonb (joined columns, aggregations)
  - query_config: jsonb (filters, sorts, groups)
  - created_at: timestamp
  - updated_at: timestamp
```

#### Column Type Support (Phase 1)

**Basic Types (Week 1-2):**
- `text` - Single line text → `TEXT`
- `long_text` - Multi-line textarea → `TEXT`
- `number` - Numeric values → `NUMERIC`
- `date` - Date/datetime (format configurable) → `DATE` or `TIMESTAMPTZ`
- `single_select` - Dropdown → `TEXT` (stores option ID)
- `multiple_select` - Multi-select → `TEXT[]` (array of option IDs)
- `url` - URL with validation → `TEXT`
- `email` - Email with validation → `TEXT`
- `switch` - Boolean toggle → `BOOLEAN`

**Advanced Types (Week 3-4):**

**User Field** - Reference to system users
- Storage: `UUID` or `UUID[]` (single/multiple)
- Config: `allowMultiple: boolean`, `filterByRole: string[]`
- Display: User name, avatar
- Example: Assigned to, Team members

**Relation Field** - Link to records in other tables
- Storage: `UUID` or `UUID[]` (single/multiple)
- Config: `targetTableId`, `allowMultiple`, `displayField`, `reverseRelationName`
- Relations: One-to-many, Many-to-many
- Example: Order → Customer, Order → Products[]
- Query: Join related data, reverse lookups

**Formula Field** - Computed from same record
- Storage: `TEXT` (or don't store, compute on-read)
- Config: `formula: string`, `returnType: 'text'|'number'|'date'`
- Syntax: `{price} * {quantity}`, `{first} + ' ' + {last}`
- Functions: Math (ROUND, ABS), String (UPPER, CONCAT), Date (DATE_DIFF), Conditional (IF)
- Computed: On-read (Phase 1) or on-write (future optimization)

**Aggregation Field** - Cross-table calculations
- Storage: `NUMERIC` (cached result)
- Config: `sourceTableId`, `relationField`, `aggregationType`, `targetField`
- Types: `count`, `sum`, `avg`, `min`, `max`
- Example: Order.total_items = COUNT(OrderItems where order_id = Order.id)
- Computed: On-read with 60s TTL cache, invalidate on source table changes

**Type Mapping:**
```typescript
const typeMap = {
  text: 'TEXT',
  long_text: 'TEXT',
  number: 'NUMERIC',
  date: 'DATE | TIMESTAMPTZ',
  single_select: 'TEXT',
  multiple_select: 'TEXT[]',
  switch: 'BOOLEAN',
  url: 'TEXT',
  email: 'TEXT',
  user: 'UUID | UUID[]',
  relation: 'UUID | UUID[]',
  formula: 'TEXT',
  aggregation: 'NUMERIC'
}
```

### 1.2 Dynamic Table Management System

**Architecture Decision: Physical Table Creation**

Each dynamic table will:
1. Create a physical PostgreSQL table with company-scoped naming: `dt_[companyId]_[tableId]`
   - Example: `dt_abc123def456_8f3a4b2c1d9e4f5a`
   - Company prefix: First 12 chars of company UUID
   - Table suffix: First 16 chars of table UUID
   - **Benefits**: Data isolation, enables sharding, same table names across companies
2. Always include system columns: `id`, `created_at`, `updated_at`, `created_by`
3. Map custom columns to appropriate PG types:
   - text/long_text/url/email → `TEXT`
   - number → `NUMERIC`
   - date → `DATE` or `TIMESTAMPTZ` (based on format config)
   - single_select → `TEXT` (store option ID)
   - multiple_select → `TEXT[]` (store array of option IDs)
   - switch → `BOOLEAN`
   - user → `UUID` or `UUID[]`
   - relation → `UUID` or `UUID[]`
   - formula → `TEXT` (computed on-read)
   - aggregation → `NUMERIC` (computed on-read with cache)

**Key Components:**

```typescript
// server/utils/dynamicTable.ts
- createDynamicTable(schema) → Creates PG table + metadata
- updateDynamicTableSchema(tableId, newSchema) → Alters PG table
- deleteDynamicTable(tableId) → Drops PG table + metadata
- generateTableName() → Creates unique table name

// server/utils/schemaGenerator.ts
- generateDrizzleSchema(columns) → Returns Drizzle table definition
- generateMigrationSQL(columns) → Returns CREATE TABLE SQL
- generateAlterSQL(oldColumns, newColumns) → Returns ALTER TABLE SQL

// server/utils/typeMapper.ts
- mapFieldTypeToPostgres(type) → Maps custom types to PG types
- mapPostgresToFieldType(type) → Reverse mapping
```

**Runtime Schema Management:**
```typescript
// Approach: Use raw SQL for dynamic tables
// Drizzle is great for static schema, but we'll use raw queries for dynamic tables

// Example with company-scoped table naming:
const companyPrefix = companyId.replace(/-/g, '').substring(0, 12)
const tableSuffix = tableId.replace(/-/g, '').substring(0, 16)
const tableName = `dt_${companyPrefix}_${tableSuffix}`

const sql = `
  CREATE TABLE ${tableName} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    ${columns.map(col => `${col.name} ${mapTypeToSQL(col.type)}`).join(',\n')}
  )
`
await db.execute(sql)

// Benefits of company-prefixed tables:
// - Physical data isolation between companies
// - Same app/table names across companies
// - Easier to implement per-company sharding
// - Simplified backup/restore per company
// - Better debugging (immediately see data ownership)
```

### 1.3 API Endpoints (Phase 1)

**App Management:**
- POST `/api/apps` - Create app
- GET `/api/apps` - List apps
- GET `/api/apps/:id` - Get app details
- PUT `/api/apps/:id` - Update app (including menu structure)
- DELETE `/api/apps/:id` - Delete app

**Folder Management:**
- POST `/api/apps/:appId/folders` - Create folder
- GET `/api/apps/:appId/folders` - List folders
- GET `/api/folders/:id` - Get folder details
- PUT `/api/folders/:id` - Update folder (name, description, parent)
- DELETE `/api/folders/:id` - Delete folder
- PUT `/api/folders/:id/items` - Reorder items in folder
- POST `/api/folders/:id/items` - Add item to folder
- DELETE `/api/folders/:folderId/items/:itemId` - Remove item from folder

**Dynamic Table Management:**
- POST `/api/apps/:appId/tables` - Create dynamic table
- GET `/api/apps/:appId/tables` - List tables in app
- GET `/api/tables/:id` - Get table metadata
- PUT `/api/tables/:id` - Update table schema
- DELETE `/api/tables/:id` - Delete table

**Dynamic Data CRUD:**
- POST `/api/tables/:tableId/records` - Create record
- GET `/api/tables/:tableId/records` - List records (with pagination, filter, sort)
- GET `/api/tables/:tableId/records/:recordId` - Get single record
- PUT `/api/tables/:tableId/records/:recordId` - Update record
- DELETE `/api/tables/:tableId/records/:recordId` - Delete record
- POST `/api/tables/:tableId/records/bulk` - Bulk insert

**View Management:**
- POST `/api/apps/:appId/views` - Create view
- GET `/api/apps/:appId/views` - List views
- GET `/api/views/:id` - Get view config
- PUT `/api/views/:id` - Update view
- DELETE `/api/views/:id` - Delete view
- GET `/api/views/:id/data` - Query view data

### 1.4 Auto-Generated UI Components

When a table is created, auto-generate:

**1. Card View (List View)**
```jsonb
{
  "type": "card",
  "title_field": "first_text_column",
  "subtitle_field": "second_column",
  "fields": [...all columns],
  "layout": "grid" // or "list"
}
```

**2. Form View (Create/Edit)**
```jsonb
{
  "fields": [
    { "column_id": "uuid", "type": "input", "validation": [...] },
    ...
  ],
  "layout": "single-column"
}
```

**3. Detail Dashboard**
```jsonb
{
  "sections": [
    { "type": "field_group", "title": "Details", "fields": [...] },
    { "type": "related_records", "table_id": "..." }
  ]
}
```

### 1.5 Frontend Structure (Phase 1)

```
pages/
  index.vue                      # App list
  apps/
    [appId]/
      index.vue                  # App home (provides app context)
      tables/
        [tableId]/
          index.vue              # Table data view (cards/table)
          records/
            new.vue              # Create record form
            [recordId]/
              index.vue          # Record detail view
              edit.vue           # Edit record form
      views/
        [viewId]/
          index.vue              # View data (table/kanban/etc)
      dashboards/
        [dashboardId]/
          index.vue              # Dashboard view
          edit.vue               # Dashboard editor
      settings/
        tables.vue               # Manage tables
        views.vue                # Manage views
        dashboards.vue           # Manage dashboards
        folders.vue              # Manage folders

components/
  app/
    AppList.vue
    AppCard.vue
    AppSidebar.vue               # Folder navigation
    FolderTree.vue               # Folder hierarchy
  table/
    TableBuilder.vue             # Create/edit table schema
    TableView.vue                # Display table data
    RecordCard.vue               # Card display
    RecordDetail.vue             # Detail view
  view/
    ViewBuilder.vue              # Create/edit views
    ViewRenderer.vue             # Render different view types
    TableView.vue
    KanbanView.vue
    GanttView.vue
    CalendarView.vue
  dashboard/
    DashboardBuilder.vue         # Dashboard editor
    DashboardRenderer.vue        # Dashboard display
    WidgetGrid.vue               # Grid layout
    widgets/
      EmbedDataWidget.vue
      EmbedViewWidget.vue
      AddRecordWidget.vue
      ChartPieWidget.vue
      ChartLineWidget.vue
      ChartNumberWidget.vue
      ImageWidget.vue
      TextWidget.vue
  form/
    FormBuilder.vue              # Form schema editor
    FormRenderer.vue             # Dynamic form renderer
    FormSection.vue
  fields/
    TextField.vue
    LongTextField.vue
    NumberField.vue
    DateField.vue
    SingleSelectField.vue
    MultipleSelectField.vue
    SwitchField.vue
    UrlField.vue
    EmailField.vue
    UserField.vue                # User picker
    RelationField.vue            # Related record picker
    FormulaField.vue             # Display computed value
    AggregationField.vue         # Display aggregated value
  folder/
    FolderCard.vue
    FolderManager.vue

composables/
  useAppContext.ts               # Provides/injects app context
  useTableContext.ts             # Provides/injects table context
  useViewContext.ts              # Provides/injects view context
  useDashboardContext.ts         # Provides/injects dashboard context
```

#### Context Provider Pattern

**App Context** (`useAppContext.ts`)
```typescript
// Provides:
- app: Ref<App>
- tables: Ref<DataTable[]>
- views: Ref<View[]>
- dashboards: Ref<Dashboard[]>
- folders: Ref<Folder[]>
- refreshApp()
- createTable()
- createView()
- createDashboard()
- createFolder()
```

**Table Context** (`useTableContext.ts`)
```typescript
// Provides:
- table: Ref<DataTable>
- schema: Ref<TableSchema>
- records: Ref<Record[]>
- pagination: Ref<PaginationState>
- filters: Ref<FilterGroup>
- sorts: Ref<Sort[]>
- fetchRecords()
- createRecord()
- updateRecord()
- deleteRecord()
- refreshTable()
```

**View Context** (`useViewContext.ts`)
```typescript
// Provides:
- view: Ref<View>
- data: Ref<any[]>
- schema: Ref<ViewSchema>
- queryConfig: Ref<QueryConfig>
- fetchData()
- updateView()
- refreshData()
```

**Dashboard Context** (`useDashboardContext.ts`)
```typescript
// Provides:
- dashboard: Ref<Dashboard>
- widgets: Ref<Widget[]>
- layout: Ref<LayoutConfig>
- isEditing: Ref<boolean>
- addWidget()
- updateWidget()
- removeWidget()
- updateLayout()
- saveDashboard()
```

**Usage Pattern:**
```vue
<!-- pages/apps/[appId]/index.vue -->
<script setup>
const { provideAppContext } = useAppContext()
const appId = useRoute().params.appId

// Fetch app data and provide context
await provideAppContext(appId)
</script>

<!-- pages/apps/[appId]/tables/[tableId]/index.vue -->
<script setup>
const { app, tables } = useAppContext() // Inject from parent
const { provideTableContext } = useTableContext()
const tableId = useRoute().params.tableId

// Provide table context for child components
await provideTableContext(tableId)
</script>

<!-- components/table/RecordCard.vue -->
<script setup>
const { table, updateRecord, deleteRecord } = useTableContext() // Inject
// Use table data and methods
</script>
```

### 1.6 Key Technical Challenges & Solutions

**Challenge 1: Type Safety with Dynamic Tables**
- **Solution**: Use TypeScript generics with `Record<string, any>` for dynamic data
- Keep strong types for metadata tables
- Use Zod for runtime validation

**Challenge 2: Query Building for Views**
- **Solution**: Build a query builder that:
  - Parses view schema
  - Generates SQL with joins
  - Handles aggregations
  - Returns properly typed results

**Challenge 3: Schema Migrations on Running System**
- **Solution**: 
  - Lock table during schema changes
  - Use transactions
  - Support adding columns (easy)
  - Support removing columns (archive, don't drop immediately)
  - Support type changes (validate + migrate existing data)

**Challenge 4: Performance with Many Dynamic Tables**
- **Solution**: 
  - Index common query patterns
  - Use connection pooling
  - Cache metadata queries
  - Implement pagination early

### 1.7 Phase 1 Deliverables & Success Criteria

**Must Have:**
- ✅ Create app with name, icon, description
- ✅ Create dynamic table with 5+ column types
- ✅ Add/edit/delete records in dynamic tables
- ✅ View data in table format with sorting
- ✅ Auto-generated forms work correctly
- ✅ Can add/remove columns from existing tables
- ✅ Create view with filters and sorting
- ✅ Query view data successfully

**Success Metrics:**
- Create table with 10 columns in < 2 seconds
- Query 1000 records with filtering in < 500ms
- Schema changes don't break existing data
- Forms render correctly for all field types

**Out of Scope (Phase 1):**
- Authentication (use dummy user ID)
- Permissions
- Company management
- Workflows
- Real-time features
- File uploads (use URLs for now)

---

## Phase 2: Authentication & Company Management

**Goal**: Add real users, companies, and multi-tenancy.

### 2.1 Database Schema

```sql
-- Users (already exists, enhance)
users
  - id: uuid
  - email: string
  - name: string
  - avatar: string
  - email_verified_at: timestamp
  - last_login_at: timestamp
  - created_at: timestamp
  - updated_at: timestamp

-- Companies (already exists, enhance)
companies
  - id: uuid
  - name: string
  - slug: string (unique)
  - logo: string
  - description: text
  - created_by: uuid
  - created_at: timestamp
  - updated_at: timestamp

-- Company Members (many-to-many)
company_members
  - id: uuid
  - company_id: uuid
  - user_id: uuid
  - role: enum (owner, admin, member)
  - invited_by: uuid
  - joined_at: timestamp
  - created_at: timestamp
  - UNIQUE(company_id, user_id)

-- Invitations
company_invitations
  - id: uuid
  - company_id: uuid
  - email: string
  - role: enum
  - invited_by: uuid
  - invite_code: string (unique)
  - magic_token: string (unique)
  - expires_at: timestamp
  - accepted_at: timestamp
  - created_at: timestamp

-- Sessions (for session-based auth)
sessions
  - id: uuid
  - user_id: uuid
  - token: string (hashed)
  - expires_at: timestamp
  - created_at: timestamp
  - last_activity_at: timestamp
```

### 2.2 Authentication System

**Features:**
- Email/password registration & login
- Session-based auth (HTTP-only cookies)
- Magic link login
- Email verification
- Password reset

**Implementation:**
- Use `nuxt-auth-utils` or custom session management
- Store sessions in PostgreSQL
- Hash passwords with bcrypt/argon2
- Use secure, HTTP-only cookies

### 2.3 Company Management

**Features:**
- Create company (user becomes owner)
- Switch between companies
- Invite users by email (generates magic link + invite code)
- Accept invitation
- Manage members (owner/admin only)
- Remove members
- Transfer ownership

**UI:**
- Company switcher in header
- Company settings page
- Member management page
- Invitation management

### 2.4 Multi-Tenancy

**Implementation:**
- All apps/tables/views scoped to company
- Add `company_id` to all relevant tables
- Middleware to check company access
- API routes validate user has access to company
- Dynamic tables include `company_id` in metadata

### 2.5 Audit Logging System

**Goal**: Track all system operations for compliance and debugging.

#### Database Schema

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID REFERENCES users(id),
  
  -- Action details
  action VARCHAR(100) NOT NULL, -- 'record.create', 'table.update', 'workflow.triggered'
  resource_type VARCHAR(50) NOT NULL, -- 'record', 'table', 'view', 'workflow'
  resource_id UUID,
  resource_name TEXT, -- Denormalized for easier querying
  
  -- Context
  metadata JSONB, -- Action-specific data
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_audit_logs_company_created ON audit_logs(company_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
```

#### What to Log

**Record Operations:**
- `record.create` - New record created
- `record.update` - Record modified (store changed fields)
- `record.delete` - Record deleted

**Table Operations:**
- `table.create` - Dynamic table created
- `table.schema.update` - Schema modified (columns added/removed)
- `table.delete` - Table deleted

**View/Dashboard Operations:**
- `view.create`, `view.update`, `view.delete`
- `dashboard.create`, `dashboard.update`, `dashboard.delete`

**Workflow Operations** (Phase 3):
- `workflow.triggered` - Workflow started
- `workflow.completed` - Workflow finished
- `workflow.failed` - Workflow error

#### Implementation

```typescript
// server/utils/audit.ts
export async function logAudit({
  companyId,
  userId,
  action,
  resourceType,
  resourceId,
  resourceName,
  metadata,
  request
}: AuditLogInput) {
  await db.insert(auditLogs).values({
    companyId,
    userId,
    action,
    resourceType,
    resourceId,
    resourceName,
    metadata,
    ipAddress: getClientIp(request),
    userAgent: request.headers.get('user-agent'),
  })
}

// Usage in API endpoint
export default defineEventHandler(async (event) => {
  // ... create record logic ...
  
  await logAudit({
    companyId: event.context.company.id,
    userId: event.context.user.id,
    action: 'record.create',
    resourceType: 'record',
    resourceId: record.id,
    resourceName: `${table.name} record`,
    metadata: { tableId: table.id, data: record },
    request: event.node.req
  })
})
```

#### Audit Log API

```typescript
// GET /api/audit/logs
// Query parameters: resourceType, resourceId, userId, startDate, endDate
export default defineEventHandler(async (event) => {
  const { resourceType, resourceId, limit = 50 } = getQuery(event)
  
  const logs = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.companyId, event.context.company.id),
        resourceType ? eq(auditLogs.resourceType, resourceType) : undefined,
        resourceId ? eq(auditLogs.resourceId, resourceId) : undefined
      )
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
  
  return logs
})
```

#### Simple UI

```vue
<!-- components/audit/AuditTimeline.vue -->
<template>
  <div class="audit-timeline">
    <div v-for="log in logs" :key="log.id" class="audit-event">
      <div class="event-icon">🔵</div>
      <div class="event-content">
        <strong>{{ log.user?.name || 'System' }}</strong>
        <span>{{ formatAction(log.action) }}</span>
        <div class="event-time">{{ formatTime(log.createdAt) }}</div>
      </div>
    </div>
  </div>
</template>
```

**Note**: This is a **read-only** audit log. Interactive features (comments, approvals) come in Phase 4.

### 2.6 Phase 2 Deliverables

- ✅ User registration & login
- ✅ Session management
- ✅ Create & manage companies
- ✅ Invite users (magic link + code)
- ✅ Accept invitations
- ✅ Switch between companies
- ✅ Company-scoped data access
- ✅ Basic role-based access (owner, admin, member)
- ✅ **Audit logging system** (track all operations)
- ✅ **Basic audit timeline UI** (read-only)

---

## Phase 3: Basic Workflow System

**Goal**: Create workflow engine with triggers and basic actions.

### 3.1 Database Schema

```sql
-- Workflows
workflows
  - id: uuid
  - name: string
  - description: text
  - app_id: uuid
  - company_id: uuid
  - enabled: boolean
  - config: jsonb (workflow steps)
  - created_by: uuid
  - created_at: timestamp
  - updated_at: timestamp

-- Workflow Triggers
workflow_triggers
  - id: uuid
  - workflow_id: uuid
  - trigger_type: enum (record_created, record_updated, record_deleted)
  - data_table_id: uuid
  - conditions: jsonb (when to trigger)
  - enabled: boolean
  - created_at: timestamp

-- Workflow Actions (steps in workflow)
workflow_actions
  - id: uuid
  - workflow_id: uuid
  - order: integer
  - action_type: enum (update_record, create_record, send_email, user_form, delay, condition)
  - config: jsonb (action-specific config)
  - created_at: timestamp

-- Workflow Executions (history)
workflow_executions
  - id: uuid
  - workflow_id: uuid
  - trigger_id: uuid
  - status: enum (pending, running, completed, failed)
  - context: jsonb (trigger data)
  - started_at: timestamp
  - completed_at: timestamp
  - error: text

-- Workflow Action Executions
workflow_action_executions
  - id: uuid
  - execution_id: uuid
  - action_id: uuid
  - status: enum (pending, running, completed, failed, skipped)
  - input: jsonb
  - output: jsonb
  - error: text
  - started_at: timestamp
  - completed_at: timestamp

-- User Form Submissions (for workflow user forms)
workflow_form_submissions
  - id: uuid
  - workflow_execution_id: uuid
  - action_id: uuid
  - user_id: uuid
  - form_data: jsonb
  - submitted_at: timestamp
  - created_at: timestamp
```

### 3.2 Workflow Engine (Basic)

**Trigger Types:**
- Record Created
- Record Updated (with field change detection)
- Record Deleted

**Basic Actions:**
1. **Update Record** - Update fields in the trigger table or related table
2. **Create Record** - Create new record in any table
3. **User Form** - Pause workflow and request user input
4. **Condition** - Branch based on conditions
5. **Send Email** - Send notification email

**Condition Builder:**
- Support AND/OR nested conditions
- Compare field values
- Check if field changed
- Compare with static values or other fields

**Execution:**
- Process synchronously for Phase 3
- Store execution history
- Handle errors gracefully
- Support pausing for user forms

### 3.3 Workflow UI

**Workflow Builder:**
- Visual workflow designer (linear for Phase 3)
- Add triggers with conditions
- Add actions with configuration
- Test workflow
- Enable/disable workflows

**Execution Monitoring:**
- List workflow executions
- View execution details
- See action results
- Retry failed executions

### 3.4 Workflow Audit Integration

**Extend audit_logs for workflow events:**

```typescript
// New action types
action: 
  | 'workflow.triggered'
  | 'workflow.started'
  | 'workflow.action.executed'
  | 'workflow.action.failed'
  | 'workflow.paused' // For user form/approval
  | 'workflow.resumed'
  | 'workflow.completed'
  | 'workflow.failed'

// Example metadata
{
  workflowId: 'uuid',
  workflowName: 'Invoice Approval',
  triggerId: 'uuid',
  triggerType: 'record.updated',
  actionId: 'uuid',
  actionType: 'user_form',
  actionResult: { success: true }
}
```

**Implementation:**

```typescript
// When workflow triggers
await logAudit({
  action: 'workflow.triggered',
  resourceType: 'record',
  resourceId: recordId,
  metadata: {
    workflowId,
    workflowName,
    triggerReason: 'status changed to pending'
  }
})

// When workflow completes
await logAudit({
  action: 'workflow.completed',
  resourceType: 'workflow',
  resourceId: executionId,
  metadata: {
    duration: endTime - startTime,
    actionsExecuted: 5
  }
})
```

**UI Enhancement:**
- Show workflow events in audit timeline
- Display workflow status changes
- Link to workflow execution details

### 3.5 Phase 3 Deliverables

- ✅ Create workflow with triggers
- ✅ Add conditions to triggers
- ✅ Add actions: update record, create record
- ✅ Execute workflows on record changes
- ✅ User form action (pause & wait for input)
- ✅ Workflow execution history
- ✅ Simple workflow builder UI
- ✅ Test workflows work end-to-end
- ✅ **Workflow audit integration** (log all workflow events)
- ✅ **Workflow events in audit timeline**

---

## Phase 4: Real-Time Features

**Goal**: Add collaboration features and live updates.

### 4.1 Real-Time Architecture

**Technology:**
- WebSockets using `h3` built-in WebSocket support
- Or Server-Sent Events (SSE) for simpler approach
- Consider `@nuxthub/core` WebSocket support when available

**Use Cases:**
1. **Presence**: Show who's viewing a table/record
2. **Live Updates**: Broadcast record changes
3. **Collaborative Editing**: Show who's editing what field
4. **Notifications**: Real-time alerts

### 4.2 Database Schema

```sql
-- User Presence
user_presence
  - id: uuid
  - user_id: uuid
  - company_id: uuid
  - resource_type: enum (app, table, record, view)
  - resource_id: uuid
  - last_seen_at: timestamp
  - metadata: jsonb (cursor position, editing field, etc.)

-- Real-Time Events (optional, for audit)
realtime_events
  - id: uuid
  - event_type: string
  - resource_type: string
  - resource_id: uuid
  - user_id: uuid
  - company_id: uuid
  - data: jsonb
  - created_at: timestamp
```

### 4.3 Real-Time Features

**Presence System:**
- Track users viewing tables/records
- Show avatars of active users
- Display "User X is editing"
- Timeout after 30s of inactivity

**Live Data Updates:**
- Broadcast record created/updated/deleted
- Automatically refresh views
- Show update notifications
- Optimistic UI updates

**Collaborative Editing:**
- Show field-level locks
- Display who's editing what
- Prevent conflicts
- Show live changes (optional: CRDT for complex editing)

### 4.4 Implementation

**Server:**
```typescript
// server/websocket/handler.ts
- handleConnection()
- handleJoinResource(resourceType, resourceId)
- handleLeaveResource()
- broadcastToResource(resourceType, resourceId, event)
- updatePresence(userId, resource, metadata)

// server/utils/realtime.ts
- publishRecordChange(tableId, recordId, changeType, data)
- publishPresenceUpdate(resource, users)
```

**Client:**
```typescript
// composables/useRealtimePresence.ts
// composables/useRealtimeData.ts
// composables/useCollaborativeEdit.ts
```

### 4.5 Activity Feed with Comments & Approvals

**Goal**: Unified activity feed combining audit logs, comments, and interactive workflow approvals.

#### Database Schema

```sql
-- Comments system
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- What is being commented on
  resource_type VARCHAR(50) NOT NULL, -- 'record', 'table', 'workflow'
  resource_id UUID NOT NULL,
  
  -- Comment content
  content TEXT NOT NULL,
  content_html TEXT, -- Rendered with @mentions
  
  -- Social features
  mentions UUID[], -- @mentioned user IDs
  parent_id UUID REFERENCES comments(id), -- For threading
  
  -- Workflow integration
  workflow_execution_id UUID,
  approval_action VARCHAR(20), -- 'approve', 'reject', null
  
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL, -- 'mention', 'approval_required', 'workflow_completed'
  
  resource_type VARCHAR(50),
  resource_id UUID,
  
  title TEXT NOT NULL,
  content TEXT,
  metadata JSONB,
  
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workflow approvals
CREATE TABLE workflow_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_execution_id UUID NOT NULL,
  action_id UUID NOT NULL,
  
  -- Who can approve
  approver_user_ids UUID[] NOT NULL,
  required_approvals INTEGER DEFAULT 1,
  
  -- Approval status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by UUID[],
  rejected_by UUID,
  
  -- Context
  title TEXT,
  description TEXT,
  metadata JSONB, -- Display data (amount, vendor, etc.)
  
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_comments_resource ON comments(resource_type, resource_id, created_at DESC);
CREATE INDEX idx_comments_mentions ON comments USING GIN(mentions);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_approvals_pending ON workflow_approvals(status) WHERE status = 'pending';
```

#### Unified Activity Feed API

```typescript
// GET /api/records/:recordId/activity
export default defineEventHandler(async (event) => {
  const recordId = getRouterParam(event, 'recordId')
  
  // Fetch all activity types
  const [audits, comments, approvals] = await Promise.all([
    fetchAuditLogs(recordId),
    fetchComments(recordId),
    fetchPendingApprovals(recordId)
  ])
  
  // Merge and sort chronologically
  const activities = [
    ...audits.map(a => ({ type: 'audit', ...a })),
    ...comments.map(c => ({ type: 'comment', ...c })),
    ...approvals.map(a => ({ type: 'approval', ...a }))
  ].sort((a, b) => b.createdAt - a.createdAt)
  
  return activities
})
```

#### Interactive Workflow Approvals

```vue
<!-- Activity feed item for approval -->
<div class="approval-widget" v-if="activity.type === 'approval'">
  <div class="approval-header">
    <span class="icon">📋</span>
    <strong>Approval Required</strong>
  </div>
  
  <div class="approval-details">
    <p><strong>{{ activity.title }}</strong></p>
    <p>{{ activity.description }}</p>
    <!-- Display metadata (amount, vendor, etc.) -->
    <div v-for="(value, key) in activity.metadata" :key="key">
      <strong>{{ key }}:</strong> {{ value }}
    </div>
  </div>
  
  <div v-if="activity.status === 'pending' && canApprove" class="approval-actions">
    <el-button type="success" @click="approve(activity)">
      ✅ Approve
    </el-button>
    <el-button type="danger" @click="reject(activity)">
      ❌ Reject
    </el-button>
    <el-button @click="requestChanges(activity)">
      💬 Request Changes
    </el-button>
  </div>
  
  <div v-else-if="activity.status === 'approved'" class="approval-resolved">
    ✅ Approved by {{ activity.approvedBy.name }}
    <span v-if="activity.comment">: "{{ activity.comment }}"</span>
  </div>
</div>
```

#### Real-time Updates

```typescript
// server/websocket/activityFeed.ts
export function setupActivityFeedSocket(io: Server) {
  io.on('connection', (socket) => {
    // Join record room
    socket.on('join:record', (recordId) => {
      socket.join(`record:${recordId}`)
    })
    
    // New comment
    socket.on('comment:add', async (data) => {
      const comment = await createComment(data)
      
      // Broadcast to record viewers
      io.to(`record:${data.recordId}`).emit('activity:new', {
        type: 'comment',
        ...comment
      })
      
      // Notify @mentioned users
      for (const userId of comment.mentions) {
        io.to(`user:${userId}`).emit('notification', {
          type: 'mention',
          comment
        })
      }
    })
    
    // Approval action
    socket.on('approval:respond', async (data) => {
      const approval = await updateApproval(data)
      
      // Broadcast approval resolution
      io.to(`record:${data.recordId}`).emit('activity:updated', {
        type: 'approval',
        ...approval
      })
      
      // Resume workflow
      await resumeWorkflow(approval.workflowExecutionId, data)
    })
  })
}
```

#### @Mention System

```typescript
// Parse @mentions from comment
function parseMentions(content: string): {
  html: string
  mentions: string[]
} {
  const mentions: string[] = []
  
  const html = content.replace(
    /@\[([^\]]+)\]\(([^)]+)\)/g,
    (_, name, userId) => {
      mentions.push(userId)
      return `<span class="mention" data-user-id="${userId}">@${name}</span>`
    }
  )
  
  return { html, mentions }
}

// Create comment with mentions
const { html, mentions } = parseMentions(commentContent)

await db.insert(comments).values({
  content: commentContent,
  contentHtml: html,
  mentions,
  resourceType: 'record',
  resourceId: recordId,
  userId: currentUserId
})

// Send notifications
for (const userId of mentions) {
  await createNotification({
    userId,
    type: 'mention',
    title: 'You were mentioned',
    content: `${currentUser.name} mentioned you in a comment`
  })
}
```

#### Approval with Comment

```typescript
// Approve workflow with comment
export default defineEventHandler(async (event) => {
  const approvalId = getRouterParam(event, 'approvalId')
  const { comment: commentText } = await readBody(event)
  
  // Update approval
  const approval = await db.update(workflowApprovals)
    .set({
      status: 'approved',
      approvedBy: [event.context.user.id],
      resolvedAt: new Date()
    })
    .where(eq(workflowApprovals.id, approvalId))
    .returning()
  
  // Add comment with approval
  if (commentText) {
    await db.insert(comments).values({
      content: commentText,
      resourceType: 'workflow',
      resourceId: approval.workflowExecutionId,
      userId: event.context.user.id,
      workflowExecutionId: approval.workflowExecutionId,
      approvalAction: 'approve'
    })
  }
  
  // Log audit event
  await logAudit({
    action: 'workflow.approved',
    resourceType: 'workflow',
    resourceId: approval.workflowExecutionId,
    metadata: {
      approvalId,
      comment: commentText
    }
  })
  
  // Resume workflow
  await resumeWorkflow(approval.workflowExecutionId, {
    approved: true,
    comment: commentText
  })
  
  return approval
})
```

### 4.6 Phase 4 Deliverables

- ✅ WebSocket/SSE connection management
- ✅ User presence in tables/records
- ✅ Live record updates
- ✅ Show who's viewing/editing
- ✅ Collaborative editing indicators
- ✅ Optimistic UI updates
- ✅ Connection state handling
- ✅ **Comments system** (threaded, @mentions)
- ✅ **Unified activity feed** (audits + comments + approvals)
- ✅ **Interactive workflow approvals** (approve/reject in activity feed)
- ✅ **Real-time notifications** (@mentions, approvals)
- ✅ **Live activity updates** (no page refresh)

---

## Phase 5: Advanced Workflows & Features

**Goal**: Production-ready workflow system with Temporal.

### 5.1 Temporal Integration

**Why Temporal:**
- Reliable async execution
- Durable workflows
- Retry logic
- Long-running workflows
- Scheduled workflows
- Timeout handling

**Setup:**
- Temporal server (Docker)
- Temporal client integration
- Workflow workers

### 5.2 Advanced Workflow Actions

**Additional Actions:**
1. **Call Webhook** - HTTP requests to external services
2. **Document Generation** - Generate PDFs from templates
3. **Digital Signature** - E-signature integration
4. **Scheduled Tasks** - Run workflows on schedule
5. **Parallel Execution** - Run multiple actions in parallel
6. **Sub-workflows** - Call other workflows
7. **Wait for Event** - Pause until external event
8. **Approval Flow** - Multi-step approval process
9. **Transform Data** - Map/reduce operations
10. **AI Actions** - LLM integration for data processing

### 5.3 Advanced Triggers

- **Scheduled** - Cron-based triggers
- **Webhook** - External system triggers
- **Manual** - User-initiated
- **Conditional** - Multiple condition sets

### 5.4 Document Generation

**Templates:**
- Create document templates
- Use Handlebars/Mustache syntax
- Support record data injection
- Generate PDF/DOCX/HTML

**Integration:**
- Store templates in MinIO
- Generate using puppeteer or similar
- Store generated docs in MinIO
- Link to records

### 5.5 Digital Signature

**Options:**
- Integrate with DocuSign API
- Or build simple signature capture
- Track signature status
- Store signed documents

### 5.6 Permission System (Advanced)

**Table-Level:**
- View - Can see records
- Create - Can add records
- Edit - Can modify records
- Delete - Can remove records
- Manage - Can change permissions

**Row-Level:**
- Condition-based permissions
- Owner-based (created_by)
- Role-based
- Field-based (e.g., status = 'draft')
- Nested AND/OR conditions

**View-Level:**
- View - Can see view
- Manage - Can edit view config

**Dashboard-Level:**
- View - Can see dashboard
- Manage - Can edit dashboard

**Implementation:**
```sql
-- Permissions
permissions
  - id: uuid
  - company_id: uuid
  - resource_type: enum (table, view, dashboard, app)
  - resource_id: uuid
  - role: string (or user_id for specific users)
  - permission_type: enum (view, create, edit, delete, manage)
  - conditions: jsonb (for row-level)
  - created_at: timestamp

-- Permission evaluation on every query
-- Check: user role → permissions → row conditions → return filtered data
```

### 5.7 Dashboard System

**Database:**
```sql
-- Dashboards
dashboards
  - id: uuid
  - name: string
  - description: text
  - app_id: uuid
  - company_id: uuid
  - content: jsonb (widget layout)
  - created_by: uuid
  - created_at: timestamp
  - updated_at: timestamp

-- Dashboard Widgets
dashboard_widgets
  - id: uuid
  - dashboard_id: uuid
  - type: enum (embed_data, embed_view, add_record, chart_pie, chart_line, chart_number, image, text)
  - config: jsonb (widget-specific config)
  - position: jsonb (x, y, w, h)
  - created_at: timestamp
```

**Widget Types:**
- Embed Data Table
- Embed View
- Add Record Form
- Pie Chart
- Line Chart
- Bar Chart
- Number/Metric
- Image
- Text Block
- Markdown

### 5.8 Folder System

**Database:**
```sql
-- Folders
folders
  - id: uuid
  - name: string
  - description: text
  - app_id: uuid
  - parent_id: uuid (for nested folders)
  - order: integer
  - created_at: timestamp

-- Folder Items (polymorphic)
folder_items
  - id: uuid
  - folder_id: uuid
  - item_type: enum (table, view, dashboard, folder)
  - item_id: uuid
  - order: integer
```

**Features:**
- Drag-and-drop reordering
- Nested folders
- Move items between folders
- Folder permissions (inherit from app)

### 5.9 Phase 5 Deliverables

- ✅ Temporal integration
- ✅ Advanced workflow actions (webhooks, documents, signatures)
- ✅ Scheduled workflows
- ✅ Document generation system
- ✅ Digital signature integration
- ✅ Advanced permission system (row-level)
- ✅ Dashboard builder with widgets
- ✅ Folder system with drag-drop
- ✅ Production-ready error handling
- ✅ Performance optimization
- ✅ Full test coverage

---

## Post-Phase 5: Polish & Launch

### Additional Features
- Audit logs
- Export/import data (CSV, JSON)
- API keys for external access
- Webhooks for events
- Email templates
- Notification system
- Activity feed
- Search across all data
- Keyboard shortcuts
- Mobile responsive design
- Dark mode
- Internationalization (i18n)
- Pre-built templates (as mentioned)

### DevOps
- CI/CD pipeline
- Staging environment
- Production deployment
- Database backups
- Monitoring & logging
- Error tracking (Sentry)
- Performance monitoring
- Load testing

### Documentation
- API documentation
- User guides
- Admin documentation
- Developer documentation
- Video tutorials

---

## Timeline Estimates (Rough)

- **Phase 1**: 4-6 weeks (most complex - dynamic tables POC)
- **Phase 2**: 3-4 weeks (auth + companies + audit logging)
- **Phase 3**: 3-4 weeks (workflows + workflow audit)
- **Phase 4**: 3-4 weeks (real-time + activity feed + approvals)
- **Phase 5**: 6-8 weeks (advanced features + production polish)
- **Polish**: 2-4 weeks (documentation, templates, optimization)

**Total**: 6-8 months for solo developer, 4-5 months with small team

---

## Critical Success Factors

1. **Start Simple**: Phase 1 is critical - get dynamic tables working well
2. **Performance**: Index everything, test with large datasets early
3. **Type Safety**: Use TypeScript strictly, validate everything
4. **Error Handling**: Workflows and dynamic tables are complex - handle errors gracefully
5. **Testing**: Write tests for dynamic table creation/migration
6. **User Feedback**: Get users testing early, especially Phase 1 POC
7. **Documentation**: Document architecture decisions, especially dynamic table system

---

## Risk Mitigation

**Risk 1: Dynamic Schema Complexity**
- Mitigation: Phase 1 POC validates this early
- Limit supported column types initially
- Build migration rollback system

**Risk 2: Performance with Many Tables**
- Mitigation: Load test early, optimize queries
- Consider sharding strategy if needed
- Use caching aggressively

**Risk 3: Permission System Complexity**
- Mitigation: Start simple (Phase 2), add row-level in Phase 5
- Use battle-tested patterns
- Cache permission checks

**Risk 4: Workflow Reliability**
- Mitigation: Use Temporal (Phase 5)
- Simple sync execution in Phase 3
- Comprehensive error handling

**Risk 5: Real-time Scalability**
- Mitigation: Start with SSE (simpler)
- Use Redis for presence if needed
- Consider horizontal scaling

---

## NuxtHub Database Integration

This project uses **NuxtHub's built-in Drizzle ORM integration**, which provides:

- **Automatic Schema Detection**: Scans `server/db/schema/*.ts` files automatically
- **Auto-Migration**: Generates migrations with `npx nuxt db generate`
- **Dev Server Auto-Apply**: Migrations automatically apply during `nuxt dev`
- **Type-Safe Access**: Import schema via `hub:db:schema` or `hub:db`
- **No Manual Config**: No `drizzle.config.ts` needed - NuxtHub handles it

**Workflow:**
```bash
# 1. Create/modify schema in server/db/schema/
# 2. Generate migration
pnpm db:generate

# 3. Start dev (auto-applies migrations)
pnpm dev

# Or manually apply
pnpm db:migrate
```

**Access Database:**
```typescript
import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'

// Query with type safety
const users = await db.select().from(schema.users)
const user = await db.select().from(schema.users).where(eq(schema.users.id, userId))
```

Reference: [NuxtHub Database Documentation](https://hub.nuxt.com/docs/features/database)

---

## Next Steps

1. ✅ **Review this plan** - Confirmed with user
2. ✅ **Field types defined** - Including advanced types (user, relation, formula, aggregation)
3. **Set up development environment**:
   - Run `pnpm install`
   - Run `pnpm docker:up` to start PostgreSQL & MinIO
   - Create `.env` file (copy from `.env.example`)
   - Verify connection
4. **Create initial database schema**:
   - Create schema files in `server/db/schema/`
   - Run `pnpm db:generate` to generate migrations
   - Run `pnpm dev` to apply migrations
5. **Build dynamic table POC**:
   - Start with basic field types (text, number, date)
   - Implement dynamic table creation
   - Test CRUD operations
6. **Iterate**:
   - Add field types incrementally
   - Test each type thoroughly
   - Optimize performance as needed

Let's focus on Phase 1 and build a solid foundation! 🚀

