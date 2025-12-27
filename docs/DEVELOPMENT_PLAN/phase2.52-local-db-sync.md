# Phase 2.52: Local Database Sync with PGlite

**Status**: 🚧 **In Progress (POC)**  
**Priority**: High  
**Estimated Duration**: 2-3 weeks

---

## 🎯 Goals

Transform our client-side PGlite from a simple cache layer into a **fully-synced local database** that:
- Syncs real PostgreSQL tables to the client (with user permissions respected)
- Enables instant data access without API calls
- Supports client-side sorting, filtering, and pagination for large datasets
- Provides foundation for offline-first capabilities
- Enables real-time sync across tabs via SharedWorker

---

## 📊 Current Status

### ✅ Completed (POC)

1. **SharedWorker Setup**
   - PGlite running in SharedWorker
   - Shared across browser tabs
   - Uses IndexedDB for persistent storage
   - Basic cache layer implemented

2. **Smart getData() API**
   - `useDocpalDB().getData(url)` composable
   - Automatic caching with TTL
   - Background refresh for stale data
   - Cookie-based authentication

3. **Cache Infrastructure**
   - `_cache_meta` table for key-value caching
   - `_session` table for user session
   - `_sync_status` table (prepared for table sync)

### 🎯 Current Flow

```typescript
// Frontend
const { data } = await getData('/api/workspaces')

// Worker
1. Check DB_SYNC_MAP['/api/workspaces'] -> cache key: 'workspaces'
2. Check _cache_meta for 'workspaces' key
3. If fresh cache -> return immediately
4. If stale cache -> return stale + background refresh API
5. If no cache -> fetch API -> cache -> return
```

### ⚠️ Current Limitations

- DB_SYNC_MAP only maps to cache keys (key-value storage)
- No actual table syncing
- No query-based data access (SELECT with WHERE, ORDER BY, etc.)
- Data is stored as JSONB blobs, not normalized tables

---

## 🚀 Next Steps

### Milestone 1: PGlite-Sync Integration (Week 1)

**Goal**: Test `@electric-sql/pglite-sync` to sync server tables to local PGlite

#### Backend Changes

1. **Install PGlite-Sync Plugin**
   ```bash
   pnpm add @electric-sql/pglite-sync
   ```

2. **Create Sync API Endpoint**
   - `POST /api/sync/subscribe` - Subscribe to table changes
   - `POST /api/sync/unsubscribe` - Unsubscribe from table
   - `GET /api/sync/initial/:table` - Get initial table data
   - Uses logical replication or polling strategy

3. **Implement Permission-Aware Sync**
   ```typescript
   // Only sync data user has access to
   // Example: workspaces filtered by company_id
   GET /api/sync/initial/workspaces
   -> Returns only workspaces where user has permission
   ```

4. **Create Sync Protocol**
   - Change events format (insert/update/delete)
   - Batch updates for efficiency
   - Handle large initial sync (pagination)

#### Worker Changes

1. **Add PGlite-Sync to Worker**
   ```typescript
   import { PGlite } from '@electric-sql/pglite'
   import { sync } from '@electric-sql/pglite-sync'
   
   const db = new PGlite('idb://docpal-db', {
     extensions: { sync }
   })
   ```

2. **Create Sync Manager**
   ```typescript
   class SyncManager {
     async subscribeTable(tableName: string, filters?: any)
     async unsubscribeTable(tableName: string)
     async getTableStatus(tableName: string)
     async forceSyncTable(tableName: string)
   }
   ```

3. **Initial Table Sync**
   ```typescript
   // Fetch initial data and create local table
   async function syncTable(tableName: string) {
     // 1. Create local table schema
     await db.exec(createTableSQL)
     
     // 2. Fetch initial data (paginated)
     const data = await fetchAPI(`/api/sync/initial/${tableName}`)
     
     // 3. Insert into local table
     await db.exec(insertBatchSQL)
     
     // 4. Subscribe to changes
     await setupChangeSubscription(tableName)
     
     // 5. Update sync status
     await updateSyncStatus(tableName, 'synced')
   }
   ```

4. **Change Subscription Handler**
   ```typescript
   // Listen for server-side changes
   async function handleChangeEvent(event: SyncEvent) {
     switch (event.type) {
       case 'insert':
         await db.exec(`INSERT INTO ${event.table} ...`)
         break
       case 'update':
         await db.exec(`UPDATE ${event.table} ...`)
         break
       case 'delete':
         await db.exec(`DELETE FROM ${event.table} ...`)
         break
     }
     
     // Broadcast to all tabs
     broadcast({ type: 'DATA_CHANGED', table: event.table })
   }
   ```

#### Testing

- [ ] Sync workspaces table to local PGlite
- [ ] Verify data matches server
- [ ] Test insert/update/delete propagation
- [ ] Test reconnection after offline
- [ ] Test with multiple tabs open

---

### Milestone 2: Update DB_SYNC_MAP (Week 2)

**Goal**: Transform DB_SYNC_MAP from cache keys to actual table queries

#### Worker Changes

1. **Enhanced DB_SYNC_MAP Schema**
   ```typescript
   interface DBMapping {
     type: 'table' | 'cache'  // NEW: distinguish between table and cache
     
     // For type: 'table'
     table?: string           // Local table name
     columns?: string[]       // Columns to select
     where?: string          // WHERE clause template
     orderBy?: string        // Default ORDER BY
     
     // For type: 'cache'
     cacheKey?: string       // Cache key (existing)
     
     // Shared
     cacheTTL?: number       // Cache duration
   }
   
   const DB_SYNC_MAP: Record<string, DBMapping> = {
     // Table-backed endpoints (use local DB)
     '/api/workspaces': {
       type: 'table',
       table: 'workspaces',
       columns: ['id', 'name', 'company_id', 'created_at'],
       orderBy: 'name ASC'
     },
     
     '/api/tables/:tableId/rows': {
       type: 'table',
       table: 'table_rows',
       columns: ['*'],
       where: 'table_id = $tableId',  // URL param substitution
       orderBy: 'created_at DESC'
     },
     
     // Cache-backed endpoints (use key-value cache)
     '/api/auth/me': {
       type: 'cache',
       cacheKey: 'user',
       cacheTTL: 5 * 60 * 1000
     }
   }
   ```

2. **Update getData() Logic**
   ```typescript
   async function getData(url: string, options = {}): Promise<GetDataResult> {
     const mapping = DB_SYNC_MAP[url]
     
     if (!mapping) {
       // Unknown URL - default to cache
       return getCachedOrFetch(url, options)
     }
     
     if (mapping.type === 'table') {
       // Query local table
       return await getFromLocalTable(mapping, url, options)
     } else {
       // Use cache
       return await getCachedOrFetch(url, options)
     }
   }
   
   async function getFromLocalTable(mapping, url, options) {
     const db = await initDB()
     
     // Check if table is synced
     const syncStatus = await getSyncStatus(mapping.table)
     
     if (!syncStatus || !syncStatus.is_synced) {
       // Table not synced - fall back to API
       console.warn(`[Worker] Table ${mapping.table} not synced, using API`)
       return await getCachedOrFetch(url, options)
     }
     
     // Build SQL query
     const sql = buildQuery(mapping, url, options)
     
     // Query local database
     const rows = await db.query(sql)
     
     return {
       data: rows,
       source: 'db',
       fresh: true,
       synced: true
     }
   }
   
   function buildQuery(mapping, url, options) {
     // Extract URL params (e.g., :tableId -> actual ID)
     const params = extractURLParams(url, mapping.where)
     
     // Build SELECT
     const columns = mapping.columns?.join(', ') || '*'
     let sql = `SELECT ${columns} FROM ${mapping.table}`
     
     // Add WHERE clause
     if (mapping.where) {
       sql += ` WHERE ${substituteParams(mapping.where, params)}`
     }
     
     // Add ORDER BY
     if (mapping.orderBy) {
       sql += ` ORDER BY ${mapping.orderBy}`
     }
     
     // Add LIMIT/OFFSET (from options)
     if (options.limit) {
       sql += ` LIMIT ${options.limit}`
     }
     if (options.offset) {
       sql += ` OFFSET ${options.offset}`
     }
     
     return sql
   }
   ```

3. **Add Sync Management Methods**
   ```typescript
   // New message handlers
   case 'SYNC_TABLE':
     result = await syncTable(payload.tableName, payload.filters)
     break
     
   case 'UNSYNC_TABLE':
     result = await unsyncTable(payload.tableName)
     break
     
   case 'GET_SYNC_STATUS':
     result = await getAllSyncStatus()
     break
     
   case 'FORCE_RESYNC':
     result = await forceSyncTable(payload.tableName)
     break
   ```

#### Frontend Changes

1. **Update useDocpalDB Composable**
   ```typescript
   /**
    * Subscribe to table sync
    */
   async function syncTable(tableName: string, filters?: any): Promise<void> {
     await sendMessage('SYNC_TABLE', { tableName, filters })
   }
   
   /**
    * Unsubscribe from table sync
    */
   async function unsyncTable(tableName: string): Promise<void> {
     await sendMessage('UNSYNC_TABLE', { tableName })
   }
   
   /**
    * Get all synced tables status
    */
   async function getSyncStatus(): Promise<SyncStatus[]> {
     return sendMessage('GET_SYNC_STATUS')
   }
   
   /**
    * Force re-sync table
    */
   async function forceSyncTable(tableName: string): Promise<void> {
     await sendMessage('FORCE_RESYNC', { tableName })
   }
   ```

2. **Create Sync Status Composable**
   ```typescript
   // app/composables/useDBSync.ts
   export function useDBSync() {
     const syncStatus = useState('db:sync', () => new Map())
     
     async function subscribeTable(table: string) {
       const { syncTable } = useDocpalDB()
       await syncTable(table)
     }
     
     async function getStatus() {
       const { getSyncStatus } = useDocpalDB()
       const status = await getSyncStatus()
       syncStatus.value = new Map(status.map(s => [s.table, s]))
     }
     
     return {
       syncStatus,
       subscribeTable,
       getStatus
     }
   }
   ```

#### Testing

- [ ] Query workspaces from local table
- [ ] Query rows with WHERE filters
- [ ] Test ORDER BY and pagination
- [ ] Compare performance: local query vs API call
- [ ] Test fallback to API when table not synced

---

### Milestone 3: Live Updates (Week 3)

**Goal**: Auto-update UI when data changes (foundation for Phase 4)

#### Worker Changes

1. **Enhanced Broadcast System**
   ```typescript
   // After handling change event
   broadcast({
     type: 'DATA_CHANGED',
     table: tableName,
     operation: 'insert' | 'update' | 'delete',
     rowId: row.id,
     data: row  // Optional: include new data
   })
   ```

2. **Subscription System**
   ```typescript
   // Track which tabs are interested in which tables
   const tableSubscriptions = new Map<string, Set<MessagePort>>()
   
   case 'SUBSCRIBE_CHANGES':
     // Tab wants to be notified of changes to a table
     subscribeToTable(port, payload.tableName)
     break
     
   case 'UNSUBSCRIBE_CHANGES':
     unsubscribeFromTable(port, payload.tableName)
     break
   ```

#### Frontend Changes

1. **Create Reactive Data Composable**
   ```typescript
   // app/composables/useReactiveData.ts
   export function useReactiveData<T>(url: string, options = {}) {
     const data = ref<T | null>(null)
     const loading = ref(true)
     const error = ref<Error | null>(null)
     const source = ref<'db' | 'cache' | 'api'>('api')
     
     const { getData } = useDocpalDB()
     const worker = initWorker()
     
     // Initial fetch
     async function fetch() {
       loading.value = true
       try {
         const result = await getData(url, options)
         data.value = result.data
         source.value = result.source
       } catch (e) {
         error.value = e
       } finally {
         loading.value = false
       }
     }
     
     // Listen for changes
     onMounted(() => {
       fetch()
       
       // Subscribe to changes
       const mapping = DB_SYNC_MAP[url]
       if (mapping?.type === 'table') {
         subscribeToChanges(mapping.table, () => {
           // Data changed - refresh
           fetch()
         })
       }
     })
     
     onUnmounted(() => {
       // Unsubscribe
       if (mapping?.type === 'table') {
         unsubscribeFromChanges(mapping.table)
       }
     })
     
     return {
       data,
       loading,
       error,
       source,
       refresh: fetch
     }
   }
   ```

2. **Update Components**
   ```vue
   <script setup>
   // Before: Manual fetch
   const workspaces = ref([])
   const { $api } = useNuxtApp()
   workspaces.value = await $api.workspaces.list()
   
   // After: Reactive with auto-updates
   const { data: workspaces, loading, source } = useReactiveData('/api/workspaces')
   </script>
   
   <template>
     <div>
       <badge v-if="source === 'db'">Local DB</badge>
       <WorkspaceList :workspaces="workspaces" :loading="loading" />
     </div>
   </template>
   ```

3. **Create Sync Status UI**
   ```vue
   <!-- components/common/SyncStatus.vue -->
   <template>
     <div class="sync-status">
       <icon :name="statusIcon" />
       <span>{{ statusText }}</span>
       
       <Popover>
         <template #trigger>
           <button>Details</button>
         </template>
         
         <div class="sync-details">
           <div v-for="table in syncedTables">
             {{ table.name }}: {{ table.rowCount }} rows
             <badge>{{ table.lastSync }}</badge>
           </div>
         </div>
       </Popover>
     </div>
   </template>
   ```

#### Testing

- [ ] Open two tabs, edit data in one, see update in other
- [ ] Test with slow network (verify local query is instant)
- [ ] Test offline scenario
- [ ] Test with large dataset (1000+ rows)
- [ ] Verify memory usage is reasonable

---

## 🏗️ Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend Tab                         │
│                                                               │
│  useReactiveData('/api/workspaces')                         │
│         │                                                     │
│         ├─ Initial fetch                                     │
│         │  └─> getData(url)                                 │
│         │                                                     │
│         └─ Subscribe to changes                              │
│            └─> SUBSCRIBE_CHANGES                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      SharedWorker                            │
│                                                               │
│  getData(url)                                                │
│    │                                                          │
│    ├─ Check DB_SYNC_MAP                                     │
│    │                                                          │
│    ├─ If type: 'table'                                       │
│    │  ├─ Check _sync_status                                 │
│    │  │  ├─ If synced: Query local table (SELECT ...)       │
│    │  │  └─ If not synced: Fetch API → cache                │
│    │  │                                                       │
│    │  └─ Return { data, source: 'db', fresh: true }         │
│    │                                                          │
│    └─ If type: 'cache'                                       │
│       ├─ Check _cache_meta                                   │
│       └─ Return cached or fetch API                          │
│                                                               │
│  Background Sync Process:                                    │
│    ├─ Poll /api/sync/changes (or WebSocket)                 │
│    ├─ Apply changes to local tables                          │
│    └─ Broadcast DATA_CHANGED to subscribed tabs             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    PGlite (IndexedDB)                        │
│                                                               │
│  Tables:                                                     │
│  ├─ _cache_meta (key-value cache)                           │
│  ├─ _sync_status (table sync metadata)                      │
│  ├─ _session (user session)                                 │
│  │                                                            │
│  └─ Synced Tables:                                           │
│     ├─ workspaces                                            │
│     ├─ tables                                                │
│     ├─ columns                                               │
│     └─ table_rows (partitioned by table_id)                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API Server                        │
│                                                               │
│  Endpoints:                                                  │
│  ├─ GET /api/workspaces → All workspaces                    │
│  ├─ GET /api/sync/initial/workspaces → Initial sync data    │
│  ├─ GET /api/sync/changes?since=timestamp → Change events   │
│  └─ POST /api/sync/subscribe → Subscribe to table           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     PostgreSQL (Main DB)                     │
│                                                               │
│  Tables:                                                     │
│  ├─ workspaces                                               │
│  ├─ tables                                                   │
│  ├─ columns                                                  │
│  └─ table_rows                                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Success Criteria

### Milestone 1
- [ ] PGlite-Sync successfully syncs workspaces table
- [ ] Changes propagate from server to client within 5 seconds
- [ ] Data persists across page refreshes
- [ ] Works with multiple tabs open

### Milestone 2
- [ ] At least 3 tables using local DB queries (not cache)
- [ ] Local queries are 10x+ faster than API calls
- [ ] Automatic fallback to API if table not synced
- [ ] Correct WHERE clause and ORDER BY handling

### Milestone 3
- [ ] UI auto-updates when data changes in another tab
- [ ] UI auto-updates when data changes on server
- [ ] No flickering or unnecessary re-renders
- [ ] Sync status visible to user (optional badge/indicator)

---

## 📚 Technical Decisions

### Why PGlite-Sync?

1. **Compatibility**: PGlite is Postgres-compatible, matches our server DB
2. **Performance**: WASM-based, runs at near-native speed
3. **Storage**: Uses IndexedDB (persistent) or in-memory
4. **Sync**: Electric SQL provides battle-tested sync protocol
5. **Query Power**: Full SQL capabilities (JOIN, aggregates, etc.)

### Sync Strategy

**Option 1: Polling (Initial Implementation)**
- Poll `/api/sync/changes?since={timestamp}` every 5-30 seconds
- Simple to implement
- Works with any backend
- Slightly delayed updates (acceptable for most use cases)

**Option 2: WebSockets (Phase 4)**
- Real-time push notifications
- More complex backend setup
- Better for collaborative features
- Migrate to this in Phase 4

### Permission Filtering

**Server-Side Filtering** (Chosen Approach)
- Backend API only returns data user has access to
- Example: `GET /api/sync/initial/workspaces` returns filtered list
- Client blindly syncs what server sends
- Security enforced at source
- Simpler client logic

**Client-Side RLS** (Future Option)
- Use PGlite Row-Level Security (RLS)
- Client syncs all data, RLS filters queries
- More complex but enables offline verification
- Consider for Phase 5

---

## 🚧 Migration Plan

### Phase 1: Parallel Testing (Week 1-2)

- Keep existing API calls working
- Add DB sync alongside (feature flag)
- Compare results between API and local DB
- Monitor performance and correctness

### Phase 2: Gradual Rollout (Week 2-3)

- Migrate read-only endpoints first
  - `/api/workspaces` (list)
  - `/api/tables/:tableId/columns` (list)
  - `/api/tables/:tableId/rows` (list with pagination)

- Keep write operations on API
  - POST, PUT, PATCH, DELETE → always API
  - After successful write → invalidate local cache → trigger re-sync

### Phase 3: Optimize (Week 3-4)

- Add indexes to local tables
- Implement smart pagination (virtual scrolling)
- Add background sync scheduling
- Optimize memory usage

---

## 🔗 Related Phases

### Builds On
- ✅ Phase 2.4: Column Management (tables to sync)
- ✅ Phase 2.5: Desktop View (UI for large datasets)

### Enables
- 🔮 Phase 4: Real-time Features (uses same sync mechanism)
- 🔮 Phase 5: Offline Mode (already have local data!)
- 🔮 Advanced Features: Client-side filtering, sorting, aggregation

---

## 📋 Implementation Checklist

### Backend
- [ ] Install `@electric-sql/pglite-sync`
- [ ] Create `/api/sync/*` endpoints
- [ ] Implement permission-aware initial sync
- [ ] Implement change tracking (polling or logical replication)
- [ ] Add pagination for large initial syncs
- [ ] Test with workspace data

### Worker
- [ ] Add PGlite-Sync extension
- [ ] Implement `syncTable()` function
- [ ] Implement change event handler
- [ ] Update `DB_SYNC_MAP` schema
- [ ] Update `getData()` to query local tables
- [ ] Add SQL query builder
- [ ] Implement subscription system
- [ ] Add sync status tracking

### Frontend
- [ ] Add `syncTable()` to `useDocpalDB`
- [ ] Create `useReactiveData()` composable
- [ ] Create `useDBSync()` status composable
- [ ] Add sync status UI component
- [ ] Migrate workspaces list to use `useReactiveData`
- [ ] Migrate table data grid to use `useReactiveData`
- [ ] Add developer tools for sync debugging

### Testing
- [ ] Unit tests for query builder
- [ ] Integration test: full sync cycle
- [ ] Multi-tab test: data consistency
- [ ] Performance test: 10k+ rows
- [ ] Offline test: graceful degradation
- [ ] Memory leak test: long-running session

---

## 🎓 Learning Resources

- [PGlite Documentation](https://pglite.dev/)
- [PGlite-Sync Guide](https://pglite.dev/docs/sync)
- [Electric SQL Documentation](https://electric-sql.com/docs)
- [SharedWorker MDN](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker)
- [IndexedDB Best Practices](https://web.dev/indexeddb-best-practices/)

---

## ✅ Definition of Done

This phase is complete when:

1. ✅ At least 3 tables are synced to local PGlite
2. ✅ `getData()` automatically queries local tables when available
3. ✅ Changes from server propagate to client within 10 seconds
4. ✅ UI auto-updates when local data changes
5. ✅ Local queries are measurably faster than API calls
6. ✅ Works reliably across multiple browser tabs
7. ✅ Documentation updated with usage examples
8. ✅ Developer tools available for debugging sync status

---

**Next Phase**: Phase 3 - Interactive Workflows (can now reference local data!)  
**Future Enhancement**: Phase 5 - Offline Mode (leverages this sync infrastructure)

