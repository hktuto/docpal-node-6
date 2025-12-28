# ElectricSQL Architecture Discussion

## 📋 Scope Definition

### ✅ What Electric Does
- **READ operations** - Fast local queries from PGlite
- **LIVE UPDATES** - Real-time sync from PostgreSQL changes
- **OFFLINE VIEWING** - Access synced data without network

### ❌ What Electric Doesn't Do (In Our App)
- **WRITE operations** - No local writes to sync back
- **Conflict resolution** - Not needed (no writes)
- **Optimistic updates** - Updates go through API first

### 📝 Write Flow
```
User Action → API Request → PostgreSQL → Electric Sync → Local Update
              (Traditional)              (Automatic)
```

---

## 🔄 Challenge 1: Permission Changes & Resync

### Problem Statement
When user permissions change, their local DB may contain stale/unauthorized data:

1. **User switches company** - Old company's data should be cleared
2. **Access revoked** - User loses access to certain workspaces/tables
3. **Role downgrade** - User can no longer see admin-only data
4. **User logged out** - All local data should be cleared

### 🎯 Solution Options

#### Option A: Token-Based Versioning (Recommended)
**Concept**: Include a "data version" token that invalidates on permission change

```typescript
// Backend: Generate version token based on user permissions
function generateDataVersion(userId: string, companyId: string, roles: string[]) {
  return hash(`${userId}-${companyId}-${roles.sort().join(',')}`)
}

// Store in session/JWT
session.dataVersion = generateDataVersion(user.id, company.id, user.roles)
```

```typescript
// Frontend: Check on app load/tab focus
async function checkDataVersion() {
  const storedVersion = localStorage.getItem('electricDataVersion')
  const currentVersion = await $fetch('/api/auth/data-version')
  
  if (storedVersion !== currentVersion) {
    console.log('[Electric] Permission changed - clearing local data')
    await clearLocalDatabase()
    localStorage.setItem('electricDataVersion', currentVersion)
    await reinitializeSync()
  }
}
```

**Pros**:
- Simple to implement
- Automatic detection
- Works across tabs (localStorage)

**Cons**:
- Requires clearing entire DB (nuclear option)
- No granular control

---

#### Option B: Server-Sent Invalidation Events
**Concept**: Server pushes invalidation messages when permissions change

```typescript
// Backend: When permission changes
await publishEvent({
  type: 'permission_changed',
  userId: user.id,
  timestamp: Date.now()
})

// Frontend: Listen via WebSocket/SSE
electricEvents.on('permission_changed', async (event) => {
  console.log('[Electric] Permission changed by server')
  await clearLocalDatabase()
  await reinitializeSync()
})
```

**Pros**:
- Real-time invalidation
- Server controls timing

**Cons**:
- Requires WebSocket/SSE infrastructure
- More complex

---

#### Option C: Periodic Validation
**Concept**: Periodically check if user still has access

```typescript
// Check every 5 minutes or on tab focus
setInterval(async () => {
  try {
    await $fetch('/api/electric/validate')
    // If 401/403 → clear local data
  } catch (error) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      await clearLocalDatabase()
      await handleLogout()
    }
  }
}, 5 * 60 * 1000)
```

**Pros**:
- Simple polling
- No infrastructure needed

**Cons**:
- Delayed detection (up to interval duration)
- Extra API calls

---

#### Option D: Hybrid Approach (Best Practice)
**Combine multiple strategies:**

1. **Immediate**: Check on logout/company switch
2. **Token-based**: Check on app load/tab focus
3. **Periodic**: Validate every 10 minutes
4. **Error-driven**: Handle 401/403 from proxy API

```typescript
// app/composables/useElectricDataVersion.ts
export const useElectricDataVersion = () => {
  const clearIfNeeded = async () => {
    // 1. Check token version
    const storedVersion = localStorage.getItem('electricDataVersion')
    const { version: currentVersion } = await $fetch('/api/auth/data-version')
    
    if (storedVersion && storedVersion !== currentVersion) {
      console.log('[Electric] Data version mismatch - clearing')
      await clearLocalDatabase()
      localStorage.setItem('electricDataVersion', currentVersion)
      return true // Cleared
    }
    
    if (!storedVersion) {
      localStorage.setItem('electricDataVersion', currentVersion)
    }
    
    return false // Not cleared
  }
  
  // Check on app load
  onMounted(() => clearIfNeeded())
  
  // Check on tab focus
  useEventListener('focus', () => clearIfNeeded())
  
  // Periodic check (10 min)
  useIntervalFn(() => clearIfNeeded(), 10 * 60 * 1000)
  
  return { clearIfNeeded }
}
```

**Implementation in auth plugin:**
```typescript
// app/plugins/electric-auth.client.ts
export default defineNuxtPlugin(async () => {
  const { clearIfNeeded } = useElectricDataVersion()
  
  // Check on plugin init
  await clearIfNeeded()
  
  // Hook into logout
  const auth = useAuth()
  watch(() => auth.isLoggedIn.value, async (isLoggedIn) => {
    if (!isLoggedIn) {
      console.log('[Electric] User logged out - clearing local data')
      await clearLocalDatabase()
      localStorage.removeItem('electricDataVersion')
    }
  })
})
```

---

## 🔧 Challenge 2: Dynamic Table Syncing

### Problem Statement
How to sync different tables dynamically based on:
- User navigation (e.g., viewing a specific workspace)
- User role (e.g., admins see more tables)
- App state (e.g., only sync needed data)

### 🎯 Solution Options

#### Option A: Predefined Shape Sets
**Concept**: Define shape combinations for different contexts

```typescript
// app/config/electric-shapes.ts
export const shapeConfigs = {
  // Base shapes - always synced
  base: [
    { table: 'workspaces', where: 'company_id = $1' }
  ],
  
  // Admin shapes - only for admins
  admin: [
    { table: 'workspaces', where: 'company_id = $1' },
    { table: 'users', where: 'company_id = $1' },
    { table: 'audit_logs', where: 'company_id = $1' }
  ],
  
  // Workspace context - when viewing a workspace
  workspace: (workspaceId: string) => [
    { table: 'workspaces', where: 'company_id = $1' },
    { table: 'data_tables', where: `workspace_id = '${workspaceId}'` },
    { table: 'data_table_columns', where: `workspace_id = '${workspaceId}'` },
    { table: 'data_table_views', where: `workspace_id = '${workspaceId}'` }
  ]
}
```

```typescript
// Usage
const { syncShapes } = useSecureElectricSync()

// Sync base shapes on login
await syncShapes(shapeConfigs.base)

// Sync workspace shapes when navigating
watch(currentWorkspaceId, async (workspaceId) => {
  if (workspaceId) {
    await syncShapes(shapeConfigs.workspace(workspaceId))
  }
})
```

**Pros**:
- Type-safe configurations
- Easy to reason about
- Centralized shape definitions

**Cons**:
- Needs manual definition for each context

---

#### Option B: Route-Based Syncing
**Concept**: Sync tables based on current route

```typescript
// nuxt.config.ts - Define shapes per route
export default defineNuxtConfig({
  electric: {
    routes: {
      '/workspaces/:id': {
        shapes: ['workspaces', 'data_tables', 'data_table_columns']
      },
      '/users': {
        shapes: ['users'],
        roles: ['admin'] // Only admins
      }
    }
  }
})
```

```typescript
// app/plugins/electric-route-sync.client.ts
export default defineNuxtPlugin(() => {
  const router = useRouter()
  const { syncTable, unsyncTable } = useSecureElectricSync()
  
  router.afterEach(async (to) => {
    const routeConfig = getRouteElectricConfig(to.path)
    
    if (routeConfig) {
      for (const table of routeConfig.shapes) {
        await syncTable(table)
      }
    }
  })
})
```

**Pros**:
- Automatic based on navigation
- Declarative configuration

**Cons**:
- Tight coupling to routes
- May sync unnecessary data

---

#### Option C: On-Demand Syncing (Recommended)
**Concept**: Sync tables only when explicitly needed by components

```typescript
// app/composables/useWorkspace.ts
export const useWorkspace = (workspaceId: string) => {
  const { syncTable, query } = useSecureElectricSync()
  
  // Ensure workspace table is synced
  const { data: workspace } = useAsyncData(
    `workspace-${workspaceId}`,
    async () => {
      // Sync if not already synced
      await syncTable('workspaces')
      
      // Query from local DB
      return query(`
        SELECT * FROM workspaces WHERE id = $1
      `, [workspaceId])
    }
  )
  
  return { workspace }
}
```

```typescript
// app/composables/useDataTables.ts
export const useDataTables = (workspaceId: string) => {
  const { syncTable, query, watchQuery } = useSecureElectricSync()
  
  // Auto-sync data_tables when needed
  const tables = ref([])
  
  onMounted(async () => {
    await syncTable('data_tables', { workspace_id: workspaceId })
    
    // Watch for live updates
    tables.value = await watchQuery(`
      SELECT * FROM data_tables 
      WHERE workspace_id = $1
      ORDER BY created_at DESC
    `, [workspaceId])
  })
  
  return { tables }
}
```

**Pros**:
- Fine-grained control
- Only sync what's needed
- Composable-driven (best for Nuxt)

**Cons**:
- Need to manage sync state per table
- Risk of duplicate sync calls

---

#### Option D: Lazy Loading with Cache
**Concept**: Sync tables lazily but cache sync state

```typescript
// app/composables/useSecureElectricSync.ts (enhanced)
const syncedTables = new Map<string, Promise<void>>()

export const useSecureElectricSync = () => {
  const syncTable = async (table: string, whereParams?: Record<string, any>) => {
    const cacheKey = `${table}-${JSON.stringify(whereParams || {})}`
    
    // Return existing sync promise if in progress
    if (syncedTables.has(cacheKey)) {
      return syncedTables.get(cacheKey)
    }
    
    // Start new sync
    const syncPromise = (async () => {
      console.log(`[Electric] Syncing table: ${table}`)
      await createTableIfNotExists(table)
      
      const shapeUrl = `/api/electric/shape?table=${table}`
      await syncShape({
        url: shapeUrl,
        table,
        ...whereParams
      })
      
      console.log(`[Electric] Table synced: ${table}`)
    })()
    
    syncedTables.set(cacheKey, syncPromise)
    return syncPromise
  }
  
  const unsyncTable = (table: string) => {
    syncedTables.delete(table)
    // Optionally stop the shape subscription
  }
  
  return { syncTable, unsyncTable }
}
```

**Pros**:
- Automatic deduplication
- Simple API for components
- Efficient caching

**Cons**:
- Need to manage cache invalidation

---

## 🎯 Recommended Architecture

### For Permission Changes: **Hybrid Approach (Option D)**
```typescript
✅ Token-based version check on app load/focus
✅ Immediate clear on logout/company switch
✅ Periodic validation (10 min)
✅ Error-driven handling from proxy 401/403
```

### For Dynamic Tables: **On-Demand with Cache (Option D)**
```typescript
✅ Composables request tables as needed
✅ Automatic deduplication via cache
✅ Fine-grained control
✅ Matches Nuxt's composable pattern
```

---

## 🛠️ Implementation Plan

### Phase 1: Permission Change Detection
1. Create `server/api/auth/data-version.get.ts`
2. Create `app/composables/useElectricDataVersion.ts`
3. Create `app/plugins/electric-auth.client.ts`
4. Add `clearLocalDatabase()` helper

### Phase 2: Dynamic Table Syncing
1. Enhance `useSecureElectricSync` with cache
2. Create table-specific composables:
   - `useWorkspaces()`
   - `useDataTables(workspaceId)`
   - `useDataTableColumns(tableId)`
3. Add `createTableIfNotExists()` helper for each table

### Phase 3: Schema Management
1. Create centralized schema definitions
2. Auto-create tables based on schema
3. Handle schema migrations

---

## 📊 Data Flow Example

```typescript
// 1. User navigates to workspace page
const { workspace } = useWorkspace(workspaceId)  // Triggers sync

// 2. Component requests data tables
const { tables } = useDataTables(workspaceId)    // Triggers sync

// 3. User updates a table name via API
await $fetch('/api/data-tables/123', {
  method: 'PUT',
  body: { name: 'New Name' }
})
// PostgreSQL updated → Electric syncs → Local DB updated → Reactive UI updates

// 4. User switches company
onCompanySwitch(async () => {
  await clearLocalDatabase()              // Clear old data
  await syncTable('workspaces')           // Sync new company data
})
```

---

## 🤔 Questions to Decide

1. **Data Version Strategy**: Should we use JWT claims or separate endpoint?
2. **Clear Granularity**: Clear entire DB or just specific tables?
3. **Sync Timing**: Aggressive (preload many tables) or lazy (on-demand)?
4. **Cache Duration**: How long to keep synced table state?
5. **Error Recovery**: What if sync fails mid-way?

Let's discuss these! 🚀

