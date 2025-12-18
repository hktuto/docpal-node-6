# DocPal Architecture Documentation

## System Overview

DocPal is a low-code platform that allows users to dynamically create database tables, views, dashboards, and workflows without writing code. The architecture is designed to handle runtime schema changes while maintaining performance and data integrity.

---

## Architecture Principles

1. **Dynamic Schema Management**: Physical PostgreSQL tables created at runtime
2. **Multi-Tenancy**: Company-scoped data with proper isolation
3. **Type Safety Where Possible**: Strong typing for metadata, flexible typing for user data
4. **Performance First**: Caching, indexing, and query optimization as core concerns
5. **Progressive Enhancement**: Start simple, add complexity in phases

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Nuxt)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Pages  │  │Components│  │ Context  │  │  Stores  │   │
│  │          │  │          │  │ Providers│  │          │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │             │             │           │
│       └─────────────┴─────────────┴─────────────┘           │
│                           │                                  │
│                     API Layer ($fetch)                       │
└───────────────────────────┼──────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────┐
│                    Backend (NuxtHub)                         │
│  ┌─────────────────────────┴────────────────────────┐       │
│  │              API Routes (H3)                      │       │
│  │  /api/apps  /api/tables  /api/views  /api/flows  │       │
│  └─────────────────────┬────────────────────────────┘       │
│                        │                                     │
│  ┌─────────────────────┴────────────────────────────┐       │
│  │           Business Logic Layer                    │       │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │       │
│  │  │ Dynamic  │  │ Query    │  │ Formula  │       │       │
│  │  │ Table    │  │ Builder  │  │ Engine   │       │       │
│  │  │ Manager  │  │          │  │          │       │       │
│  │  └──────────┘  └──────────┘  └──────────┘       │       │
│  └─────────────────────┬────────────────────────────┘       │
│                        │                                     │
│  ┌─────────────────────┴────────────────────────────┐       │
│  │            Data Access Layer                      │       │
│  │              Drizzle ORM + Raw SQL                │       │
│  └─────────────────────┬────────────────────────────┘       │
└────────────────────────┼──────────────────────────────────────┘
                         │
┌────────────────────────┼──────────────────────────────────────┐
│                   PostgreSQL Database                         │
│  ┌────────────────────────────────────────────────┐          │
│  │  Metadata Tables (Drizzle-managed)             │          │
│  │  - apps, companies, users, sessions            │          │
│  │  - data_tables, views, dashboards              │          │
│  │  - workflows, permissions                      │          │
│  └────────────────────────────────────────────────┘          │
│  ┌────────────────────────────────────────────────┐          │
│  │  Dynamic Tables (Runtime-created)              │          │
│  │  - dt_[uuid]: User-created tables              │          │
│  │  - Physical columns matching user schema       │          │
│  └────────────────────────────────────────────────┘          │
└───────────────────────────────────────────────────────────────┘
```

---

## Database Architecture

### Two-Tier Table Structure

#### Tier 1: Metadata Tables (Static Schema)
Managed by Drizzle ORM with migrations:
- `users`, `companies`, `sessions`
- `apps`, `folders`, `folder_items`
- `data_tables`, `data_table_columns`
- `views`, `dashboards`
- `workflows`, `workflow_triggers`, `workflow_actions`
- `permissions`

#### Tier 2: Dynamic Tables (Runtime Schema)
Created at runtime with raw SQL:
- Named: `dt_[uuid]` (e.g., `dt_8f3a4b2c_1d9e_4f5a_b6c7_2e3f4a5b6c7d`)
- System columns: `id`, `created_at`, `updated_at`, `created_by`
- User-defined columns based on schema JSON

### Schema Storage Pattern

**Dual Storage Approach:**
1. **JSON in `data_tables.schema`**: Source of truth for schema definition
2. **Separate `data_table_columns`**: Denormalized for easy querying

**Why Both?**
- JSON: Atomic updates, version control, complex configurations
- Separate table: Fast column lookups, filtering, searching

### Dynamic Table Naming Convention

```
dt_[company_id]_[table_uuid]
```

**Example:**
- Company ID: `abc123def456`
- Table ID: `8f3a4b2c-1d9e-4f5a-b6c7-2e3f4a5b6c7d`
- Physical table: `dt_abc123def456_8f3a4b2c1d9e4f5a`

**Benefits:**
- **Data Isolation**: Company ID prefix enables easy identification and isolation
- **Same Names Allowed**: Multiple companies can create tables/apps with identical names
- **Unique Names**: UUID suffix ensures no collisions within company
- **Future Sharding**: Easy to partition database by company ID
- **Backup/Restore**: Simplifies per-company backup and migration
- **Debugging**: Immediately see which company owns the table
- **Security Audit**: Easy to verify all queries include company filter
- **Traceable**: Can trace back to metadata via table ID

**Implementation:**
```typescript
// Short company ID from UUID (first 12 chars)
const companyPrefix = companyId.replace(/-/g, '').substring(0, 12)
// Short table ID (first 16 chars)
const tableId = tableUuid.replace(/-/g, '').substring(0, 16)
// Result: dt_abc123def456_8f3a4b2c1d9e4f5a
const tableName = `dt_${companyPrefix}_${tableId}`
```

**PostgreSQL Limits:**
- Max identifier length: 63 characters
- Our format: `dt_` (3) + company (12) + `_` (1) + table (16) = 32 characters ✓

---

## Dynamic Schema Management

### Schema Change Flow

```
User Request
     │
     ├─→ Validate New Schema
     │   - Check column names
     │   - Validate types
     │   - Check constraints
     │
     ├─→ Calculate Schema Diff
     │   - Added columns
     │   - Removed columns
     │   - Modified columns
     │
     ├─→ Generate Migration SQL
     │   - ALTER TABLE statements
     │   - Index creation
     │   - Data migration if needed
     │
     ├─→ Execute in Transaction
     │   - Update metadata
     │   - Update physical table
     │   - Rollback on error
     │
     └─→ Update Cache
         - Clear metadata cache
         - Invalidate query cache
```

### Schema Version Control

Each schema includes a version number:
```typescript
{
  columns: [...],
  version: 3 // Incremented on each change
}
```

**Benefits:**
- Track schema evolution
- Detect concurrent modifications
- Enable rollback capabilities
- Audit trail

### Column Removal Strategy

**Don't DROP, Archive Instead:**
```sql
-- Instead of: DROP COLUMN old_field
ALTER TABLE dt_xxx 
  RENAME COLUMN old_field 
  TO _archived_old_field_1638360000;
```

**Why?**
- Data safety (prevent accidental data loss)
- Rollback capability
- Audit compliance
- Can be cleaned up later with admin tool

---

## Type System

### Field Type Mapping

| Field Type        | PostgreSQL Type       | Storage Notes                    |
|-------------------|-----------------------|----------------------------------|
| text              | TEXT                  | Single line string               |
| long_text         | TEXT                  | Multi-line string                |
| number            | NUMERIC               | Arbitrary precision              |
| date              | DATE / TIMESTAMPTZ    | Based on format config           |
| single_select     | TEXT                  | Stores option ID                 |
| multiple_select   | TEXT[]                | Array of option IDs              |
| switch            | BOOLEAN               | True/false toggle                |
| url               | TEXT                  | URL string                       |
| email             | TEXT                  | Email string                     |
| user              | UUID / UUID[]         | References users table           |
| relation          | UUID / UUID[]         | References other dynamic table   |
| formula           | TEXT                  | Computed on-read (Phase 1)       |
| aggregation       | NUMERIC               | Computed on-read with cache      |

### Computed Fields Strategy

**Formula Fields:**
- Not stored in Phase 1 (computed on-read)
- Expression parsed and evaluated at query time
- Can reference other fields in same record
- Future: Store computed values, recompute on dependency change

**Aggregation Fields:**
- Always computed on-read (to stay current)
- Uses subquery in SELECT
- Cached with 60s TTL
- Invalidated when related records change

---

## Query Building System

### View Query Generation

Views combine:
- Base table columns
- Joined table columns
- Aggregations
- Computed fields
- Filters & sorting

**Example View:**
```typescript
{
  baseTableId: 'orders',
  schema: {
    columns: [
      { sourceColumnId: 'order_number', visible: true },
      { sourceColumnId: 'total', visible: true }
    ],
    joins: [{
      targetTableId: 'customers',
      sourceColumn: 'customer_id',
      targetColumn: 'id',
      type: 'left',
      columns: ['name', 'email']
    }]
  },
  queryConfig: {
    filters: {
      operator: 'and',
      conditions: [
        { column: 'status', operator: 'eq', value: 'active' }
      ]
    },
    sorts: [
      { column: 'created_at', direction: 'desc' }
    ]
  }
}
```

**Generated SQL:**
```sql
SELECT 
  o.order_number,
  o.total,
  c.name as customer_name,
  c.email as customer_email
FROM dt_orders o
LEFT JOIN dt_customers c ON o.customer_id = c.id
WHERE o.status = 'active'
ORDER BY o.created_at DESC;
```

### Filter System

**Nested Conditions:**
```typescript
{
  operator: 'and',
  conditions: [
    { column: 'status', operator: 'eq', value: 'active' },
    {
      operator: 'or',
      conditions: [
        { column: 'priority', operator: 'eq', value: 'high' },
        { column: 'due_date', operator: 'lt', value: 'today' }
      ]
    }
  ]
}
```

**Generates:**
```sql
WHERE status = 'active' 
  AND (priority = 'high' OR due_date < CURRENT_DATE)
```

---

## Context Provider Pattern

### Hierarchical Context Flow

```
App Context (Provided by /apps/[appId])
    │
    ├─→ app: Ref<App>
    ├─→ tables: Ref<DataTable[]>
    ├─→ views: Ref<View[]>
    ├─→ dashboards: Ref<Dashboard[]>
    ├─→ methods: { createTable, createView, ... }
    │
    └─→ Injected by child routes/components
            │
            ├─→ Table Context (tables/[tableId])
            │       ├─→ table: Ref<DataTable>
            │       ├─→ records: Ref<Record[]>
            │       └─→ methods: { createRecord, ... }
            │
            ├─→ View Context (views/[viewId])
            │       ├─→ view: Ref<View>
            │       └─→ data: Ref<any[]>
            │
            └─→ Dashboard Context (dashboards/[dashboardId])
                    ├─→ dashboard: Ref<Dashboard>
                    └─→ widgets: Ref<Widget[]>
```

### Benefits
- **No Prop Drilling**: Deep components access context directly
- **Type Safety**: Strongly typed context interfaces
- **Single Source of Truth**: Data managed at appropriate level
- **Easy Testing**: Mock context providers
- **Performance**: Reactive updates propagate automatically

### Implementation

```typescript
// composables/useAppContext.ts
export function useAppContext() {
  const AppContextKey = Symbol('AppContext')
  
  // Provider (used in page)
  function provideAppContext(appId: string) {
    const app = ref<App>()
    const tables = ref<DataTable[]>([])
    
    const refreshApp = async () => {
      app.value = await $fetch(`/api/apps/${appId}`)
      tables.value = await $fetch(`/api/apps/${appId}/tables`)
    }
    
    const context = {
      app,
      tables,
      refreshApp,
      createTable: async (data) => { /* ... */ },
      // ... more methods
    }
    
    provide(AppContextKey, context)
    
    return context
  }
  
  // Consumer (used in components)
  function injectAppContext() {
    const context = inject<AppContext>(AppContextKey)
    if (!context) {
      throw new Error('App context not provided')
    }
    return context
  }
  
  return { provideAppContext, injectAppContext }
}
```

---

## Permission System (Phase 5)

### Multi-Level Permissions

```
Company Level
    │
    ├─→ App Level
    │       │
    │       ├─→ Table Level
    │       │       ├─→ View permission
    │       │       ├─→ Create permission
    │       │       ├─→ Edit permission
    │       │       ├─→ Delete permission
    │       │       └─→ Manage permission
    │       │
    │       ├─→ Row Level (Conditional)
    │       │       └─→ Filter based on conditions
    │       │
    │       ├─→ View Level
    │       │       ├─→ View permission
    │       │       └─→ Manage permission
    │       │
    │       └─→ Dashboard Level
    │               ├─→ View permission
    │               └─→ Manage permission
```

### Permission Evaluation

**Check Order:**
1. User authenticated?
2. User in company?
3. User role (owner > admin > member)?
4. Table-level permission granted?
5. Row-level conditions met?

**Permission Query Modifier:**
```typescript
// Original query
SELECT * FROM dt_orders WHERE status = 'active'

// With row-level permissions applied
SELECT * FROM dt_orders 
WHERE status = 'active'
  AND (
    created_by = $userId 
    OR assigned_to = $userId
    OR department = $userDepartment
  )
```

---

## Workflow Engine Architecture (Phase 3 & 5)

### Phase 3: Simple Synchronous Workflows

```
Trigger Event (Record Created/Updated/Deleted)
    │
    ├─→ Match Workflow Triggers
    │   - Check trigger type
    │   - Evaluate conditions
    │
    ├─→ Execute Actions Sequentially
    │   - Update Record
    │   - Create Record
    │   - Send Email
    │   - User Form (pause & wait)
    │
    └─→ Store Execution History
```

### Phase 5: Temporal-based Workflows

```
Trigger Event
    │
    ├─→ Start Temporal Workflow
    │   - Durable execution
    │   - Automatic retries
    │   - State persistence
    │
    ├─→ Execute Activities
    │   - Call webhooks
    │   - Generate documents
    │   - Send for signature
    │   - Update records
    │
    ├─→ Wait for External Events
    │   - User approval
    │   - Signature completion
    │   - Timer expiration
    │
    └─→ Complete Workflow
        - Update records
        - Send notifications
        - Trigger child workflows
```

---

## Real-Time Architecture (Phase 4)

### WebSocket Connection Management

```
Client                          Server
  │                              │
  ├─→ Connect WebSocket          │
  │                              ├─→ Authenticate
  │                              ├─→ Store connection
  │                              │
  ├─→ Join Resource              │
  │   (table:abc-123)            ├─→ Add to room
  │                              │
  │   ┌──────────────────────────┤
  │   │ Broadcast to Room        │
  │   │ (record updated)         │
  │←──┘                          │
  │                              │
  ├─→ Leave Resource             │
  │                              ├─→ Remove from room
  │                              │
  ├─→ Disconnect                 │
  │                              ├─→ Clean up
```

### Presence Tracking

```typescript
// Track active users
{
  resourceType: 'table',
  resourceId: 'abc-123',
  users: [
    {
      userId: 'user-1',
      lastSeen: Date,
      metadata: {
        editingField: 'name'
      }
    }
  ]
}
```

### Event Broadcasting

```typescript
// Record change event
{
  type: 'record:updated',
  tableId: 'abc-123',
  recordId: 'record-456',
  changes: {
    status: { old: 'draft', new: 'active' }
  },
  userId: 'user-1'
}
```

---

## Caching Strategy

### Metadata Caching
- **App/Table/View metadata**: Cache for 5 minutes
- **Invalidate on**: Schema changes, updates
- **Storage**: In-memory (Node) or Redis (production)

### Computed Fields Caching
- **Formula results**: No cache in Phase 1 (always compute)
- **Aggregation results**: 60s TTL cache
- **Invalidate on**: Related record changes

### Query Result Caching
- **View data**: No cache in Phase 1 (real-time priority)
- **Dashboard widgets**: 30s TTL cache
- **Invalidate on**: Underlying data changes

---

## Security Considerations

### SQL Injection Prevention
- **Use parameterized queries**: Always
- **Validate column names**: Against schema
- **Escape identifiers**: Use PostgreSQL quoting
- **Sanitize user input**: Before formula evaluation

### Multi-Tenancy Isolation

**Table-Level Isolation:**
- **Company-prefixed tables**: `dt_[companyId]_[tableId]` ensures physical separation
- **Metadata scoping**: All queries filtered by `company_id`
- **Benefits**:
  - Physical data isolation
  - Easier to identify data ownership
  - Enables per-company database sharding
  - Simplifies backup/restore per company
  - Better performance (smaller indexes per company)

**Query-Level Isolation:**
- **Company ID in all queries**: Mandatory filter in API layer
- **Row-level security**: PostgreSQL RLS (future enhancement)
- **API middleware**: Verify user has access to company
- **Session validation**: Check company membership on every request

**Example Query:**
```typescript
// Always include company filter for metadata
const tables = await db
  .select()
  .from(dataTables)
  .where(eq(dataTables.companyId, currentCompanyId))

// Dynamic table queries automatically scoped by table name
// (table name includes company ID, so can only access own company's tables)
const records = await db.execute(
  sql.raw(`SELECT * FROM dt_${companyPrefix}_${tableId}`)
)
```

**Future: Database Sharding**
With company-prefixed tables, we can easily implement:
- **Schema per Company**: Move each company to separate PostgreSQL schema
- **Database per Company**: Dedicated database for large customers
- **Horizontal Sharding**: Distribute companies across multiple databases
- **Backup Strategy**: Per-company backups and point-in-time recovery

### Formula Sandboxing
- **No eval()**: Use safe math evaluator (mathjs)
- **Limit functions**: Whitelist only safe functions
- **Timeout execution**: Prevent infinite loops
- **No file system access**: Compute in isolated context

---

## Performance Optimization

### Database Optimization
- **Index strategy**:
  - Primary keys (id)
  - Foreign keys (relation fields)
  - Common filter fields
  - Created_at for sorting
  - GIN index for array fields

- **Connection pooling**: Max 20 connections
- **Query timeout**: 30s default
- **Pagination**: Max 100 records per request

### Frontend Optimization
- **Lazy loading**: Components and pages
- **Virtual scrolling**: Large record lists
- **Debounced search**: 300ms delay
- **Optimistic updates**: Update UI before server response
- **Query deduplication**: Cache identical requests

### Caching Layers
```
Browser Cache (5min)
    ↓
Nuxt Server Cache (3min)
    ↓
Redis Cache (1min) [Future]
    ↓
PostgreSQL
```

---

## Error Handling

### Error Hierarchy

```typescript
DocPalError
  ├─→ ValidationError
  │     ├─→ SchemaValidationError
  │     ├─→ DataValidationError
  │     └─→ PermissionError
  │
  ├─→ DatabaseError
  │     ├─→ SchemaChangeError
  │     ├─→ ConstraintViolationError
  │     └─→ ConnectionError
  │
  └─→ WorkflowError
        ├─→ TriggerEvaluationError
        ├─→ ActionExecutionError
        └─→ TimeoutError
```

### Error Recovery Strategies

**Schema Changes:**
- Transaction-based: Rollback on error
- Validation before execution
- Archive instead of delete

**Data Operations:**
- Optimistic locking for updates
- Retry transient failures (3x)
- Graceful degradation

**Workflows:**
- Store execution state
- Retry failed steps
- Manual intervention for unrecoverable errors

---

## Monitoring & Observability

### Metrics to Track
- API response times (p50, p95, p99)
- Database query performance
- Dynamic table creation time
- Schema migration duration
- Formula evaluation time
- Aggregation computation time
- WebSocket connection count
- Workflow execution success rate

### Logging Strategy
- **Info**: User actions, workflow execution
- **Warn**: Slow queries, cache misses
- **Error**: Failed operations, validation errors
- **Debug**: Formula evaluation, query generation

### Alerting
- Schema migration failures
- Database connection issues
- Workflow execution timeouts
- High error rates (>5%)
- Slow queries (>1s)

---

## Deployment Architecture

### Development
```
Local Machine
  ├─→ Docker Compose
  │     ├─→ PostgreSQL
  │     └─→ MinIO
  └─→ Nuxt Dev Server (localhost:3000)
```

### Production (Future)
```
Load Balancer
  │
  ├─→ Nuxt Server (3x instances)
  │     └─→ NuxtHub
  │
  ├─→ PostgreSQL (Primary + Replica)
  │
  ├─→ Redis (Caching + Session)
  │
  ├─→ MinIO / S3 (File Storage)
  │
  └─→ Temporal Cluster (Workflows)
```

---

## Technology Decisions & Rationale

### Why Physical Tables vs JSONB?
**Decision**: Create physical PostgreSQL tables
**Rationale**:
- ✅ Better query performance
- ✅ Proper indexing support
- ✅ Type safety at DB level
- ✅ Standard SQL features (joins, aggregations)
- ❌ More complex schema management
- ❌ Migration challenges

**Alternative**: JSONB column approach (rejected)
- Slower queries, limited indexing
- Complex filtering and sorting
- Poor performance with large datasets

### Why Drizzle ORM?
**Decision**: Use Drizzle for static schema, raw SQL for dynamic tables
**Rationale**:
- ✅ Type-safe queries for metadata
- ✅ Excellent PostgreSQL support
- ✅ Lightweight and fast
- ✅ SQL-like syntax
- ❌ Not suitable for runtime schema (by design)

### Why Element Plus?
**Decision**: Element Plus for UI components
**Rationale**:
- ✅ Comprehensive component library
- ✅ Good documentation
- ✅ Vue 3 support
- ✅ Customizable with SCSS
- ✅ Enterprise-ready
- ❌ Larger bundle size (acceptable trade-off)

### Why Temporal for Workflows?
**Decision**: Temporal for Phase 5 workflows
**Rationale**:
- ✅ Durable execution
- ✅ Automatic retries
- ✅ Long-running workflows
- ✅ Battle-tested at scale
- ✅ Great observability
- ❌ Additional infrastructure
- ❌ Learning curve (mitigated by Phase 3 POC)

### Why Session-based Auth?
**Decision**: Session-based authentication
**Rationale**:
- ✅ Simpler to implement
- ✅ Better security (HTTP-only cookies)
- ✅ Easy to invalidate
- ✅ Works well with SSR
- ❌ Requires server-side storage

**Alternative**: JWT (rejected for primary auth)
- Harder to invalidate
- Token size concerns
- Still using for magic links

---

## Future Considerations

### Scalability
- **Horizontal scaling**: Multiple Nuxt instances behind load balancer
- **Database sharding**: By company_id if needed
- **Read replicas**: For analytics/reporting queries
- **CDN**: For static assets and API responses

### Advanced Features
- **Plugin system**: Allow custom field types
- **Template marketplace**: Pre-built apps
- **API access**: REST/GraphQL API for integrations
- **Mobile apps**: React Native apps
- **AI integration**: Natural language queries, auto-suggestions

### Data Migration
- **Export/Import**: CSV, JSON, Excel
- **Database sync**: Sync with external databases
- **Version control**: Track data changes
- **Backup/Restore**: Point-in-time recovery

---

## Conclusion

This architecture balances:
- **Flexibility**: Dynamic schema creation
- **Performance**: Physical tables with indexing
- **Safety**: Transaction-based changes
- **Scalability**: Horizontal scaling ready
- **Maintainability**: Clear separation of concerns

The phased approach allows validation of core concepts early while leaving room for optimization and advanced features.

