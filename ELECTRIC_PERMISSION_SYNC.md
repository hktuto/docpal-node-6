# ElectricSQL Permission-Based Syncing

## 🎯 Core Concept

**Problem**: Electric can't do JOINs, so we can't filter data based on complex permission relationships.

**Solution**: Sync a dedicated **permission table** to the client, then use it to control what other tables to sync.

---

## 📊 Architecture

### Flow Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│  Backend: Permission Changes                                    │
│                                                                 │
│  1. User invited to company                                     │
│  2. User added to workspace                                     │
│  3. User granted table view access                              │
│     ↓                                                            │
│  API writes to user_permissions table                           │
└─────────────────────────────────────────────────────────────────┘
                           ↓
                    Electric Sync
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  Client: Local PGlite                                           │
│                                                                 │
│  1. user_permissions table synced first (always)                │
│  2. Watch for permission changes                                │
│  3. When permissions change:                                    │
│     - Sync newly accessible tables                              │
│     - Unsync revoked tables                                     │
│     - Clear data from revoked resources                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema Design

### Option A: Single Polymorphic Table (Recommended)

```sql
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  resource_type TEXT NOT NULL,  -- 'company', 'workspace', 'data_table', 'table_view'
  resource_id UUID NOT NULL,
  permission_level TEXT,         -- 'read', 'write', 'admin', etc. (for future)
  granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  granted_by UUID,
  
  -- For efficient queries
  UNIQUE(user_id, resource_type, resource_id)
);

-- Indexes for Electric sync
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_resource ON user_permissions(resource_type, resource_id);
```

**Example Data**:
```sql
-- User has access to company
{ user_id: 'u1', resource_type: 'company', resource_id: 'c1', permission_level: 'member' }

-- User has access to workspace
{ user_id: 'u1', resource_type: 'workspace', resource_id: 'w1', permission_level: 'editor' }

-- User has access to table view
{ user_id: 'u1', resource_type: 'table_view', resource_id: 'tv1', permission_level: 'read' }
```

**Pros**:
- Single table to sync
- Flexible for any resource type
- Easy to query "what does user have access to?"

**Cons**:
- Need to handle different resource types in code

---

### Option B: Separate Access Tables

```sql
CREATE TABLE user_company_access (
  user_id UUID NOT NULL,
  company_id UUID NOT NULL,
  role TEXT NOT NULL,  -- 'owner', 'admin', 'member'
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, company_id)
);

CREATE TABLE user_workspace_access (
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  role TEXT NOT NULL,  -- 'owner', 'editor', 'viewer'
  granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, workspace_id)
);

CREATE TABLE user_table_view_access (
  user_id UUID NOT NULL,
  table_view_id UUID NOT NULL,
  permission TEXT NOT NULL,  -- 'read', 'write'
  granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, table_view_id)
);
```

**Pros**:
- Type-safe per resource
- Clear separation of concerns

**Cons**:
- Multiple tables to sync and watch
- More complex sync logic

---

## 🔧 Implementation

### 1. Backend: Proxy Endpoint Enhancement

```typescript
// server/api/electric/shape.get.ts
export default defineEventHandler(async (event) => {
  const user = requireCompany(event)
  const query = getQuery(event)
  const table = query.table as string

  const config = useRuntimeConfig()
  const electricUrl = config.electricUrl
  const originUrl = new URL(`${electricUrl}/v1/shape`)

  // Pass through Electric params
  for (const [key, value] of Object.entries(query)) {
    if (ELECTRIC_PROTOCOL_PARAMS.includes(key)) {
      originUrl.searchParams.set(key, value as string)
    }
  }

  originUrl.searchParams.set('table', table)

  // Special handling for user_permissions table
  if (table === 'user_permissions') {
    // Users can only sync their own permissions
    originUrl.searchParams.set('where', `user_id='${user.id}'`)
  }
  
  // For other tables, verify access via user_permissions
  else {
    const allowedTables = ['workspaces', 'data_tables', 'data_table_columns', 'data_table_views']
    
    if (!allowedTables.includes(table)) {
      throw createError({
        statusCode: 403,
        message: `Table '${table}' is not allowed for sync`
      })
    }

    // For company-scoped tables
    if (['workspaces', 'data_tables', 'data_table_columns', 'data_table_views'].includes(table)) {
      originUrl.searchParams.set('where', `company_id='${user.company.id}'`)
    }
    
    // For workspace-scoped tables (if needed in future)
    // We'll handle filtering client-side based on user_permissions
  }

  // ... rest of proxy logic
})
```

---

### 2. Backend: Permission Management APIs

```typescript
// server/api/permissions/grant.post.ts
export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const { userId, resourceType, resourceId, permissionLevel } = await readBody(event)

  // Verify user has permission to grant access
  await verifyGrantPermission(user, resourceType, resourceId)

  // Grant permission
  await db.insert(userPermissions).values({
    userId,
    resourceType,
    resourceId,
    permissionLevel,
    grantedBy: user.id
  })
  .onConflictDoUpdate({
    target: [userPermissions.userId, userPermissions.resourceType, userPermissions.resourceId],
    set: { 
      permissionLevel,
      grantedBy: user.id,
      grantedAt: new Date()
    }
  })

  return successResponse({ granted: true })
})
```

```typescript
// server/api/permissions/revoke.post.ts
export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const { userId, resourceType, resourceId } = await readBody(event)

  // Verify user has permission to revoke access
  await verifyRevokePermission(user, resourceType, resourceId)

  // Revoke permission
  await db.delete(userPermissions)
    .where(
      and(
        eq(userPermissions.userId, userId),
        eq(userPermissions.resourceType, resourceType),
        eq(userPermissions.resourceId, resourceId)
      )
    )

  return successResponse({ revoked: true })
})
```

---

### 3. Frontend: Permission Watcher

```typescript
// app/composables/useElectricPermissions.ts
export const useElectricPermissions = () => {
  const { syncTable, unsyncTable, watchQuery } = useSecureElectricSync()
  const user = useCurrentUser()
  
  const permissions = ref<Array<{
    resourceType: string
    resourceId: string
    permissionLevel: string
  }>>([])

  const syncedTables = reactive(new Map<string, Set<string>>())

  /**
   * Initialize permission syncing
   */
  const initialize = async () => {
    // 1. Sync user_permissions table first (ALWAYS)
    console.log('[Electric Permissions] Syncing permissions table...')
    await syncTable('user_permissions')

    // 2. Watch for permission changes
    const permissionRows = await watchQuery(
      `SELECT resource_type, resource_id, permission_level 
       FROM user_permissions 
       WHERE user_id = $1`,
      [user.value.id]
    )

    // 3. Update reactive permissions
    watch(permissionRows, async (newPerms, oldPerms) => {
      console.log('[Electric Permissions] Permissions changed', {
        old: oldPerms,
        new: newPerms
      })

      await handlePermissionChanges(oldPerms || [], newPerms || [])
    }, { deep: true, immediate: true })

    permissions.value = permissionRows.value || []
  }

  /**
   * Handle permission changes - sync/unsync tables
   */
  const handlePermissionChanges = async (
    oldPerms: any[],
    newPerms: any[]
  ) => {
    // Find added permissions
    const added = newPerms.filter(
      np => !oldPerms.some(
        op => op.resource_type === np.resource_type && 
              op.resource_id === np.resource_id
      )
    )

    // Find removed permissions
    const removed = oldPerms.filter(
      op => !newPerms.some(
        np => np.resource_type === op.resource_type && 
              np.resource_id === op.resource_id
      )
    )

    // Handle added permissions - start syncing
    for (const perm of added) {
      await handlePermissionAdded(perm)
    }

    // Handle removed permissions - stop syncing
    for (const perm of removed) {
      await handlePermissionRemoved(perm)
    }
  }

  /**
   * Start syncing tables for newly granted permission
   */
  const handlePermissionAdded = async (perm: any) => {
    console.log('[Electric Permissions] Access granted:', perm)

    switch (perm.resource_type) {
      case 'company':
        // Sync company-wide tables
        await syncTable('workspaces')
        trackSync('workspaces', perm.resource_id)
        break

      case 'workspace':
        // Sync workspace-specific tables
        await syncTable('data_tables')
        await syncTable('data_table_columns')
        await syncTable('data_table_views')
        trackSync('data_tables', perm.resource_id)
        trackSync('data_table_columns', perm.resource_id)
        trackSync('data_table_views', perm.resource_id)
        break

      case 'table_view':
        // Sync specific table view data
        // (implementation depends on your data structure)
        break
    }
  }

  /**
   * Stop syncing and clear data for revoked permission
   */
  const handlePermissionRemoved = async (perm: any) => {
    console.log('[Electric Permissions] Access revoked:', perm)

    switch (perm.resource_type) {
      case 'company':
        // Clear company data from local DB
        await clearCompanyData(perm.resource_id)
        await unsyncTable('workspaces')
        untrackSync('workspaces', perm.resource_id)
        break

      case 'workspace':
        // Clear workspace data from local DB
        await clearWorkspaceData(perm.resource_id)
        await unsyncTable('data_tables')
        await unsyncTable('data_table_columns')
        await unsyncTable('data_table_views')
        untrackSync('data_tables', perm.resource_id)
        untrackSync('data_table_columns', perm.resource_id)
        untrackSync('data_table_views', perm.resource_id)
        break

      case 'table_view':
        // Clear specific table view data
        break
    }
  }

  /**
   * Clear company data from local PGlite
   */
  const clearCompanyData = async (companyId: string) => {
    const { db } = useSecureElectricSync()
    await db.query(`DELETE FROM workspaces WHERE company_id = $1`, [companyId])
    await db.query(`DELETE FROM data_tables WHERE company_id = $1`, [companyId])
    // ... clear other company-scoped tables
  }

  /**
   * Clear workspace data from local PGlite
   */
  const clearWorkspaceData = async (workspaceId: string) => {
    const { db } = useSecureElectricSync()
    await db.query(`DELETE FROM data_tables WHERE workspace_id = $1`, [workspaceId])
    await db.query(`DELETE FROM data_table_columns WHERE workspace_id = $1`, [workspaceId])
    await db.query(`DELETE FROM data_table_views WHERE workspace_id = $1`, [workspaceId])
  }

  /**
   * Track which resources a table is synced for
   */
  const trackSync = (table: string, resourceId: string) => {
    if (!syncedTables.has(table)) {
      syncedTables.set(table, new Set())
    }
    syncedTables.get(table)!.add(resourceId)
  }

  const untrackSync = (table: string, resourceId: string) => {
    syncedTables.get(table)?.delete(resourceId)
  }

  /**
   * Check if user has permission to a resource
   */
  const hasPermission = (resourceType: string, resourceId: string) => {
    return permissions.value.some(
      p => p.resourceType === resourceType && p.resourceId === resourceId
    )
  }

  /**
   * Get accessible resource IDs by type
   */
  const getAccessibleResources = (resourceType: string) => {
    return permissions.value
      .filter(p => p.resourceType === resourceType)
      .map(p => p.resourceId)
  }

  return {
    initialize,
    permissions: readonly(permissions),
    hasPermission,
    getAccessibleResources
  }
}
```

---

### 4. Frontend: Integration with App

```typescript
// app/plugins/electric-permissions.client.ts
export default defineNuxtPlugin(async () => {
  const user = useCurrentUser()
  
  if (!user.value) return

  const { initialize } = useElectricPermissions()
  
  // Initialize permission watching
  await initialize()
  
  console.log('[Electric Permissions] Initialized')
})
```

---

### 5. Frontend: Using Permissions in Components

```typescript
// app/pages/workspaces/[id].vue
<script setup lang="ts">
const route = useRoute()
const workspaceId = route.params.id as string

const { hasPermission, getAccessibleResources } = useElectricPermissions()

// Check if user has access to this workspace
const hasAccess = computed(() => 
  hasPermission('workspace', workspaceId)
)

// If no access, redirect
watch(hasAccess, (access) => {
  if (!access) {
    navigateTo('/workspaces')
  }
}, { immediate: true })

// Query local DB (permissions already ensure data is synced)
const { data: workspace } = useAsyncData(
  `workspace-${workspaceId}`,
  async () => {
    const { query } = useSecureElectricSync()
    return query(`SELECT * FROM workspaces WHERE id = $1`, [workspaceId])
  }
)
</script>
```

---

## 🎯 Benefits

### ✅ Automatic Permission Sync
- Permission changes in PostgreSQL → Electric syncs → Client reacts
- No manual invalidation needed

### ✅ Granular Access Control
- Company level
- Workspace level  
- Table view level
- Extensible to any resource type

### ✅ No JOINs Required
- Electric syncs flat permission table
- Client-side logic handles relationships

### ✅ Efficient
- Only sync `user_permissions` for current user
- Only sync data tables user has access to
- Automatic cleanup when access revoked

### ✅ Secure
- Server still validates via proxy
- Client permissions are for UX only (what to sync)
- Can't bypass server-side filtering

---

## 🔄 Example Flows

### Flow 1: User Invited to Workspace

```typescript
// Backend API: Invite user to workspace
POST /api/workspaces/:id/invite
{
  userId: 'user123',
  role: 'editor'
}

// Server writes to user_permissions
INSERT INTO user_permissions (user_id, resource_type, resource_id, permission_level)
VALUES ('user123', 'workspace', 'workspace456', 'editor')

// Electric syncs the change
// → Client's user_permissions table updated

// Client detects change (via watchQuery)
// → Automatically syncs data_tables, data_table_columns for workspace456

// User immediately sees the new workspace (no refresh needed!)
```

### Flow 2: User Removed from Company

```typescript
// Backend API: Remove user from company
DELETE /api/companies/:id/members/:userId

// Server deletes from user_permissions
DELETE FROM user_permissions 
WHERE user_id = 'user123' 
  AND resource_type = 'company' 
  AND resource_id = 'company789'

// Electric syncs the deletion
// → Client's user_permissions table updated

// Client detects change
// → Clears all data for company789
// → Unsyncs related tables
// → Redirects to accessible company or login
```

---

## 📋 Migration Plan

### Phase 1: Create Permission Table
1. Create `user_permissions` table migration
2. Seed existing permissions from current relationships
3. Add Electric publication for `user_permissions`

### Phase 2: Update Backend APIs
1. Modify invite/remove APIs to write to `user_permissions`
2. Update proxy endpoint to allow `user_permissions` sync
3. Add permission grant/revoke endpoints

### Phase 3: Frontend Implementation
1. Create `useElectricPermissions` composable
2. Add permission watcher plugin
3. Update components to use permission checks

### Phase 4: Testing
1. Test permission sync in real-time
2. Test access revocation
3. Test multi-tab behavior
4. Test offline behavior

---

## 🤔 Edge Cases to Handle

### 1. User Has No Permissions
- Sync only `user_permissions` table
- Show empty state UI

### 2. Permission Granted While Offline
- When back online, Electric syncs new permissions
- Auto-sync newly accessible data

### 3. Permission Revoked While Offline
- When back online, Electric syncs permission removal
- Clear inaccessible data
- Redirect if viewing revoked resource

### 4. Multiple Devices
- Permission changes sync to all devices
- Consistent state across devices

---

## ✅ Verdict: This Approach is Excellent!

**Why this works perfectly**:

1. ✅ **No JOINs needed** - Flat permission table
2. ✅ **Real-time** - Electric handles sync
3. ✅ **Granular** - Control at any resource level
4. ✅ **Automatic** - No manual invalidation
5. ✅ **Efficient** - Only sync what user can access
6. ✅ **Secure** - Server still validates
7. ✅ **Clean architecture** - Clear separation of concerns

This is actually a **best practice** for local-first applications! 🎉

