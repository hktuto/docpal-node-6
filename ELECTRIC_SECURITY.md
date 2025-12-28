# ⚠️ ElectricSQL Security Considerations

## Current Security Issue (POC)

**CRITICAL**: The current POC syncs **ALL workspaces** regardless of:
- User's company
- User's permissions
- Data access rights

This is **acceptable for POC/testing** but **NOT for production**.

## Security Solutions

### Solution 1: Filter by Company (Server-Side)

Use Electric's `where` parameter to filter data:

```typescript
// In your composable or page
const user = await $fetch('/api/auth/me')
const companyId = user.company.id

// Only sync current user's company workspaces
await electric.syncShape(
  'my-workspaces',
  'workspaces',
  `${electricUrl}/v1/shape?table=workspaces&where=company_id.eq.${companyId}&offset=-1`
)
```

### Solution 2: Row-Level Security (PostgreSQL)

Enable RLS on the workspaces table:

```sql
-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Create policy: users can only see their company's workspaces
CREATE POLICY workspace_company_isolation ON workspaces
  FOR SELECT
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

-- Set company_id in connection
-- (This would be set by your auth middleware)
SET app.current_company_id = 'user-company-id-here';
```

### Solution 3: Separate Publications per Company

Create company-specific publications:

```sql
-- Create publication for specific company
CREATE PUBLICATION electric_company_abc123 
  FOR TABLE workspaces
  WHERE (company_id = 'abc123-company-id');
```

Then sync to different shapes per company.

### Solution 4: API Endpoint with Auth

Create authenticated API endpoint that returns filtered data:

```typescript
// server/api/electric/workspaces.get.ts
export default defineEventHandler(async (event) => {
  const user = requireCompany(event)
  
  // Return only current company's workspaces
  const workspaces = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.companyId, user.company.id))
  
  return successResponse(workspaces)
})

// Then in frontend: fetch from API, store in PGlite
const data = await $fetch('/api/electric/workspaces')
await electric.exec(`INSERT INTO workspaces ...`)
```

## Recommended Approach for Production

**Hybrid: Filter at Multiple Levels**

1. **Server-side filtering** (Electric where clause)
2. **Row-level security** (PostgreSQL RLS)
3. **API authentication** (verify user before sync)
4. **Client-side validation** (double-check in app)

### Implementation Example

```typescript
// app/composables/useSecureElectricSync.ts
export const useSecureElectricSync = () => {
  const { $fetch } = useNuxtApp()
  const electric = useElectricSync()
  const config = useRuntimeConfig()
  
  const syncUserData = async () => {
    // 1. Get current user (authenticated)
    const user = await $fetch('/api/auth/me')
    if (!user) throw new Error('Not authenticated')
    
    // 2. Sync only user's company workspaces
    await electric.syncShape(
      'my-workspaces',
      'workspaces',
      `${config.public.electricUrl}/v1/shape?table=workspaces&where=company_id.eq.${user.company.id}&offset=-1`
    )
    
    // 3. Verify in client (defense in depth)
    const localWorkspaces = await electric.query(
      'SELECT * FROM workspaces WHERE company_id = $1',
      [user.company.id]
    )
    
    return localWorkspaces
  }
  
  return { syncUserData }
}
```

## Security Checklist

Before going to production:

- [ ] Add `where` clause to filter by company_id
- [ ] Implement user authentication check before sync
- [ ] Enable PostgreSQL Row-Level Security
- [ ] Set `ELECTRIC_SECRET` (remove INSECURE mode)
- [ ] Add JWT authentication to Electric endpoint
- [ ] Test: User A cannot see User B's data
- [ ] Test: Changing companies updates synced data
- [ ] Add audit logging for data access
- [ ] Implement rate limiting on Electric endpoint
- [ ] Set up monitoring for unauthorized access attempts

## Testing Security

```typescript
// Test 1: User can only see their company data
const user1 = await loginAsUser1() // Company A
await syncUserData()
const workspaces = await electric.query('SELECT * FROM workspaces')
assert(workspaces.every(w => w.company_id === user1.company.id))

// Test 2: Switching companies updates sync
await switchToCompany(companyB)
await syncUserData()
const newWorkspaces = await electric.query('SELECT * FROM workspaces')
assert(newWorkspaces.every(w => w.company_id === companyB))

// Test 3: Cannot manually query other company's data
const maliciousQuery = await electric.query(
  "SELECT * FROM workspaces WHERE company_id = 'other-company'"
)
assert(maliciousQuery.length === 0) // Should be empty
```

## Performance vs Security Trade-offs

| Approach | Security | Performance | Complexity |
|----------|----------|-------------|------------|
| No filtering | ❌ Bad | ✅ Fast | ✅ Simple |
| WHERE clause | ✅ Good | ✅ Fast | ✅ Simple |
| RLS | ✅✅ Better | ⚠️ Slower | ⚠️ Complex |
| Per-company publications | ✅✅ Better | ✅ Fast | ❌ Very Complex |
| API + Local cache | ✅ Good | ✅ Fast | ✅ Moderate |

**Recommendation**: Start with WHERE clause + authentication check.

## Multi-Tenancy Best Practices

1. **Never trust the client**: Always filter server-side
2. **Defense in depth**: Multiple layers of security
3. **Audit everything**: Log who accessed what data
4. **Test isolation**: Ensure Company A can't see Company B's data
5. **Monitor sync patterns**: Detect suspicious sync requests

## Example: Secure Production Setup

```typescript
// 1. Middleware to verify auth
export default defineEventHandler(async (event) => {
  if (event.path.startsWith('/v1/shape')) {
    const user = await getCurrentUser(event)
    if (!user) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }
    event.context.user = user
  }
})

// 2. Secure composable
export const useSecureSync = () => {
  const syncCompanyData = async () => {
    const user = await $fetch('/api/auth/me')
    const companyId = user.company.id
    
    // Sync with company filter
    await electric.syncShape(
      'workspaces',
      'workspaces',
      `${electricUrl}/v1/shape?table=workspaces&where=company_id.eq.${companyId}`
    )
    
    await electric.syncShape(
      'data_tables',
      'data_tables',
      `${electricUrl}/v1/shape?table=data_tables&where=company_id.eq.${companyId}`
    )
    
    // ... sync other tables with same filter
  }
  
  return { syncCompanyData }
}
```

## When to Sync What

| Data Type | Sync Strategy | Why |
|-----------|---------------|-----|
| User profile | Eager (on login) | Small, frequently used |
| Current company | Eager (on login) | Small, frequently used |
| Company workspaces | Eager (on login) | Medium, frequently used |
| All data tables | Lazy (on demand) | Large, sometimes used |
| Archived data | Manual (on request) | Large, rarely used |
| Other companies | Never | Security isolation |

## Summary

The current POC is **insecure by design** for simplicity. For production:

1. **Add WHERE clause immediately** (easiest fix)
2. **Verify user authentication** before sync
3. **Consider RLS** for additional security layer
4. **Test thoroughly** to ensure isolation

**Bottom line**: Never deploy the current POC to production without adding company filtering!

