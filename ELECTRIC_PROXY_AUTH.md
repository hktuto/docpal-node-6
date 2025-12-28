# ElectricSQL Proxy Authentication Architecture

## 🔒 Secure Architecture Overview

Instead of clients accessing Electric directly, we use a **proxy authentication pattern**:

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser)                          │
│  - Authenticated session (cookie)                            │
│  - No direct Electric access                                 │
│  - Can't manipulate WHERE clauses                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Request: /api/electric/shape?table=workspaces
                     │ (with auth cookies)
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              Nuxt API Proxy Endpoint                         │
│                                                              │
│  1. ✅ Verify authentication (requireCompany)               │
│  2. ✅ Get user's company_id                                │
│  3. ✅ Validate table is allowed                            │
│  4. ✅ Add WHERE company_id.eq.{companyId}                  │
│  5. ✅ Forward to Electric with filters                     │
│                                                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Request: /v1/shape?table=workspaces&where=company_id.eq.abc123
                     │ (server-to-server)
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                Electric Sync Service                         │
│              (Not accessible to client)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL                                 │
│         (Filtered by company_id)                             │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Why This Architecture?

### ❌ Previous Approach (Insecure)

```typescript
// Client code (INSECURE)
const companyId = user.company.id  // ⚠️ Can be manipulated!
await electric.syncShape(
  'workspaces',
  'workspaces',
  `http://localhost:30000/v1/shape?table=workspaces&where=company_id.eq.${companyId}`
)

// Problems:
// 1. Electric URL exposed to client
// 2. Client can change company_id in URL
// 3. Client can remove WHERE clause
// 4. Client can sync any table
```

### ✅ New Approach (Secure)

```typescript
// Client code (SECURE)
await electric.syncShape(
  'workspaces',
  'workspaces',
  '/api/electric/shape?table=workspaces&offset=-1'
)

// Benefits:
// ✅ Electric URL hidden from client
// ✅ Server adds company_id (can't be changed)
// ✅ Server validates allowed tables
// ✅ Server verifies authentication
```

## 📝 Implementation

### Server: Proxy Endpoint

**File**: `server/api/electric/shape.get.ts`

```typescript
export default defineEventHandler(async (event) => {
  // 1. Verify authentication
  const user = requireCompany(event)
  const companyId = user.company.id

  // 2. Get requested table
  const { table, offset } = getQuery(event)

  // 3. Validate table is allowed
  const allowedTables = ['workspaces', 'data_tables', ...]
  if (!allowedTables.includes(table)) {
    throw createError({ statusCode: 403 })
  }

  // 4. Add company filter (client can't bypass this!)
  const whereClause = `company_id.eq.${companyId}`

  // 5. Proxy to Electric
  const electricUrl = `${config.electricUrl}/v1/shape?table=${table}&where=${whereClause}`
  const response = await fetch(electricUrl)

  // 6. Forward response to client
  return response.json()
})
```

### Client: Secure Composable

**File**: `app/composables/useSecureElectricSync.ts`

```typescript
export const useSecureElectricSync = () => {
  const syncTable = async (shapeName: string, tableName: string) => {
    // Simple API call - security handled server-side
    await electric.syncShape(
      shapeName,
      tableName,
      `/api/electric/shape?table=${tableName}&offset=-1`
    )
  }

  const syncUserWorkspace = async () => {
    await syncTable('workspaces', 'workspaces')
    await syncTable('data_tables', 'data_tables')
    // etc...
  }

  return { syncTable, syncUserWorkspace }
}
```

### Usage in Components

```vue
<script setup>
const secureSync = useSecureElectricSync()

const startSync = async () => {
  // Sync all user's data (filtered by company automatically)
  await secureSync.syncUserWorkspace()
  
  // Or sync specific tables
  await secureSync.syncTable('workspaces', 'workspaces')
}
</script>
```

## 🔐 Security Features

### 1. Authentication Required

```typescript
// Proxy endpoint requires authentication
const user = requireCompany(event)
// If not logged in, throws 401 Unauthorized
```

### 2. Company Isolation

```typescript
// Server automatically filters by user's company
const companyId = user.company.id
const whereClause = `company_id.eq.${companyId}`
// Client cannot override this
```

### 3. Table Whitelist

```typescript
const allowedTables = ['workspaces', 'data_tables', 'data_table_columns']
if (!allowedTables.includes(table)) {
  throw createError({ statusCode: 403, message: 'Table not allowed' })
}
```

### 4. No Direct Electric Access

```yaml
# docker-compose.dev.yml
electric:
  ports:
    - "30000:3000"  # Only accessible from host/server
                    # NOT exposed to internet
```

## 📊 Security Comparison

| Aspect | Direct Access | Proxy Auth |
|--------|---------------|------------|
| Client can see Electric URL | ❌ Yes | ✅ No |
| Client can change WHERE | ❌ Yes | ✅ No |
| Client can sync any table | ❌ Yes | ✅ No |
| Authentication verified | ⚠️ Client-side | ✅ Server-side |
| Company isolation | ⚠️ Client enforced | ✅ Server enforced |
| Audit trail | ❌ No | ✅ Yes (server logs) |

## 🧪 Testing Security

### Test 1: Cannot Access Other Company's Data

```typescript
// Login as User A (Company 1)
await login('userA@company1.com')
await secureSync.syncUserWorkspace()

const workspaces = await electric.query('SELECT * FROM workspaces')
assert(workspaces.every(w => w.company_id === 'company-1-id'))

// Try to sync with different company (should fail)
// Client has no way to change company_id in request
```

### Test 2: Cannot Sync Disallowed Tables

```typescript
// Try to sync a table not in allowedTables
const response = await $fetch('/api/electric/shape?table=users')
// Should return 403 Forbidden
```

### Test 3: Cannot Access Without Authentication

```typescript
// Logout
await logout()

// Try to sync
const response = await $fetch('/api/electric/shape?table=workspaces')
// Should return 401 Unauthorized
```

### Test 4: Cannot Access Electric Directly

```typescript
// Try to bypass proxy
const response = await fetch('http://localhost:30000/v1/shape?table=workspaces')
// Should fail (CORS or network error if properly firewalled)
```

## 🚀 Production Deployment

### 1. Firewall Electric Service

```yaml
# docker-compose.prod.yml
electric:
  # DO NOT expose Electric to internet
  # Only accessible from app server
  networks:
    - internal  # Private network only
```

### 2. Use Environment Variables

```bash
# .env.production
NUXT_PUBLIC_ELECTRIC_URL=http://electric:3000  # Internal URL
```

### 3. Enable Rate Limiting

```typescript
// server/api/electric/shape.get.ts
import { rateLimit } from '~/server/utils/rateLimit'

export default defineEventHandler(async (event) => {
  // Limit: 100 requests per minute per user
  await rateLimit(event, { max: 100, window: 60000 })
  
  // ... rest of proxy logic
})
```

### 4. Add Audit Logging

```typescript
export default defineEventHandler(async (event) => {
  const user = requireCompany(event)
  const { table } = getQuery(event)
  
  // Log sync request
  await auditLog(event, {
    action: 'electric_sync',
    table,
    userId: user.id,
    companyId: user.company.id
  })
  
  // ... proxy logic
})
```

## 📝 Adding New Tables

### 1. Add to Allowed List

```typescript
// server/api/electric/shape.get.ts
const allowedTables = [
  'workspaces',
  'data_tables',
  'data_table_columns',
  'data_table_views',
  'companies',  // ← Add new table
]
```

### 2. Add to Publication

```sql
-- Migration
ALTER PUBLICATION electric_publication 
ADD TABLE companies;
```

### 3. Add Filtering Logic

```typescript
// server/api/electric/shape.get.ts
if (table === 'companies') {
  // Only sync user's own company
  whereClause = `id.eq.${companyId}`
}
```

### 4. Add to Composable

```typescript
// app/composables/useSecureElectricSync.ts
const syncUserWorkspace = async () => {
  await syncTable('workspaces', 'workspaces')
  await syncTable('companies', 'companies')  // ← Add here
}
```

## 🎯 Best Practices

### 1. Minimal Data Exposure

Only sync tables that are **actually needed** by the client:

```typescript
// Good: Only sync what's needed
await syncTable('workspaces', 'workspaces')

// Bad: Syncing everything
await syncTable('audit_logs', 'audit_logs')  // Sensitive data!
```

### 2. Fine-Grained Filtering

Use additional WHERE conditions for sensitive tables:

```typescript
if (table === 'companies') {
  // Only user's own company
  whereClause = `id.eq.${companyId}`
} else if (table === 'data_tables') {
  // Only tables in user's workspaces
  whereClause = `company_id.eq.${companyId} AND archived.eq.false`
}
```

### 3. Permission Checks

Check user permissions before allowing sync:

```typescript
// Check if user has permission to access this table
const hasPermission = await checkUserPermission(user, table)
if (!hasPermission) {
  throw createError({ statusCode: 403 })
}
```

### 4. Monitoring

Monitor sync patterns for suspicious activity:

```typescript
// Alert if user syncs too many tables
if (syncCount > 50) {
  await alertSecurityTeam(`User ${user.id} synced ${syncCount} tables`)
}
```

## 📈 Performance Benefits

### 1. Caching at Proxy Level

```typescript
// Add caching to proxy
const cacheKey = `shape:${table}:${companyId}:${offset}`
const cached = await redis.get(cacheKey)
if (cached) return JSON.parse(cached)
```

### 2. Request Batching

```typescript
// Batch multiple shape requests
const shapes = ['workspaces', 'data_tables', 'data_table_columns']
await Promise.all(shapes.map(table => syncTable(table, table)))
```

## 🔄 Migration from Direct Access

### Before (Insecure)

```typescript
await electric.syncShape(
  'workspaces',
  'workspaces',
  `${electricUrl}/v1/shape?table=workspaces&where=company_id.eq.${companyId}`
)
```

### After (Secure)

```typescript
const secureSync = useSecureElectricSync()
await secureSync.syncTable('workspaces', 'workspaces')
```

## ✅ Summary

The proxy authentication pattern provides:

1. **Server-side security** - Authentication & filtering enforced by server
2. **Hidden Electric URL** - Client never knows Electric endpoint
3. **Table whitelist** - Only approved tables can be synced
4. **Company isolation** - Automatic filtering by company_id
5. **Audit trail** - Server logs all sync requests
6. **Rate limiting** - Prevent abuse
7. **Production ready** - Enterprise-grade security

This is the **recommended approach** for production ElectricSQL deployments!

