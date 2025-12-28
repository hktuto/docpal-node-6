# ElectricSQL POC - Real-time Database Sync

This document describes the ElectricSQL proof-of-concept implementation for DocPal.

## 🎯 Goal

Demonstrate real-time, local-first database synchronization using ElectricSQL to:
- Sync PostgreSQL data to local browser database (IndexedDB)
- Enable offline-first functionality
- Provide instant queries with no server round-trips
- Auto-sync across multiple browser tabs

## 🏗️ Architecture

```
PostgreSQL (Server)
       ↓
Electric Sync Service (Docker)
       ↓
WebSocket Connection
       ↓
PGlite (Browser - IndexedDB)
       ↓
Your Vue Components
```

## 📦 What's Included

### 1. Docker Compose Setup
- **PostgreSQL**: Your existing database
- **Electric Sync Service**: Real-time sync layer (port 3000)
- **MinIO**: Existing file storage

### 2. Frontend Components
- **`app/composables/useElectricSync.ts`**: Core sync logic
  - Initialize PGlite with Electric extension
  - Sync shapes (data subsets) from server
  - Live queries with automatic updates
  - Connection status management

### 3. POC Page
- **`app/pages/electric-poc.vue`**: Interactive demonstration
  - Real-time workspace sync
  - Multi-tab testing
  - Connection status display
  - Debug information

## 🚀 Setup Instructions

### Step 1: Start Services

```bash
# Start PostgreSQL + Electric sync service
pnpm docker:up

# The Electric service will be available at http://localhost:3000
```

### Step 2: Configure Electric (PostgreSQL)

Electric needs logical replication enabled in PostgreSQL. Add this to your PostgreSQL container or run manually:

```sql
-- Enable logical replication (required for Electric)
ALTER SYSTEM SET wal_level = logical;
ALTER SYSTEM SET max_replication_slots = 10;
ALTER SYSTEM SET max_wal_senders = 10;

-- Restart PostgreSQL for changes to take effect
```

Then restart PostgreSQL:

```bash
docker restart docpal-postgres
```

### Step 3: Configure Tables for Sync

Electric needs to know which tables to sync. Create a publication:

```sql
-- Create publication for Electric
CREATE PUBLICATION electric_publication FOR TABLE workspaces;

-- Grant replication permissions
ALTER USER docpal WITH REPLICATION;
```

### Step 4: Run Migrations

Ensure your workspaces table exists:

```bash
pnpm db:migrate
```

### Step 5: Access POC

1. Start your Nuxt dev server:
   ```bash
   pnpm dev
   ```

2. Open the POC page:
   ```
   http://localhost:3001/electric-poc
   ```

3. Click "Start Sync" to begin syncing

4. Open the same page in another tab to see real-time updates!

## 🧪 Testing

### Test 1: Basic Sync
1. Open `/electric-poc`
2. Click "Start Sync"
3. Verify workspaces appear from your database
4. Status should show "Connected" and "Ready"

### Test 2: Multi-Tab Sync
1. Open `/electric-poc` in **two browser tabs**
2. Click "Start Sync" in both tabs
3. Create a new workspace via API or in your app
4. Watch it appear **automatically in both tabs** within 1 second

### Test 3: Offline Mode
1. Start sync in a tab
2. Open DevTools → Network → Go offline
3. Data still accessible! Queries work from local DB
4. Go back online → sync resumes automatically

### Test 4: Real-time Updates
1. With POC page open and synced
2. Update a workspace name via your regular app
3. Watch it update **live** in the POC page

## 📊 What You Should See

### On Success
- ✅ Status: "Connected"
- ✅ Syncing: "Ready"
- ✅ Workspaces displayed in grid
- ✅ Active Shapes: "workspaces"
- ✅ Last Update timestamp refreshing

### Common Issues

#### Electric Service Not Running
**Symptom**: "Failed to fetch" or connection errors

**Solution**:
```bash
docker ps | grep electric  # Check if running
docker logs docpal-electric  # Check logs
```

#### No Data Syncing
**Symptom**: Connected but workspaces list empty

**Possible causes**:
1. Publication not created (see Step 3)
2. No workspaces in your database yet
3. Electric endpoint incorrect

**Check**:
```bash
# Verify workspaces exist
docker exec -it docpal-postgres psql -U docpal -d docpal -c "SELECT COUNT(*) FROM workspaces;"

# Check Electric logs
docker logs docpal-electric
```

#### CORS Errors
**Symptom**: CORS policy blocking requests to localhost:3000

**Solution**: Electric should handle CORS automatically, but if issues persist:
```bash
# Add CORS env var to docker-compose.dev.yml
CORS_ALLOWED_ORIGINS: "*"
```

## 🎨 How It Works

### Initialization Flow

```typescript
// 1. Initialize PGlite with Electric extension
const db = await PGlite.create({
  dataDir: 'idb://docpal-electric',  // IndexedDB storage
  extensions: { electric: electricSync() }
})

// 2. Subscribe to a "shape" (data subset)
await db.electric.syncShapeToTable({
  shape: { 
    url: 'http://localhost:3000/v1/shape/workspaces'
  },
  table: 'workspaces',
  primaryKey: ['id']
})

// 3. Query local data (instant, no network!)
const workspaces = await db.query('SELECT * FROM workspaces')

// Data automatically stays in sync via WebSocket! 🎉
```

### Shape Subscriptions

A "shape" is a subset of data you want to sync:

```typescript
// Sync all workspaces
url: '/v1/shape/workspaces'

// Sync only specific company's workspaces
url: '/v1/shape/workspaces?where=company_id="abc-123"'

// Multiple shapes can run simultaneously
await syncShape('my-workspaces', 'workspaces', '/v1/shape/workspaces?where=...')
await syncShape('my-tables', 'data_tables', '/v1/shape/data_tables?where=...')
```

### Live Queries

The POC uses polling (every 1 second), but this could be improved with proper reactive queries:

```typescript
// Current: Polling
const { data } = useLiveQuery('SELECT * FROM workspaces', [], 1000)

// Future: Reactive (Electric will notify on changes)
db.live.query('SELECT * FROM workspaces', [], (rows) => {
  workspaces.value = rows
})
```

## 🔄 Migration to SharedWorker

To scale to SharedWorker (single DB instance across all tabs):

```typescript
// worker file: app/workers/electric-sync.worker.ts
import { worker } from '@electric-sql/pglite/worker'
import { PGlite } from '@electric-sql/pglite'
import { electricSync } from '@electric-sql/pglite-sync'

worker({
  async init() {
    return await PGlite.create({
      dataDir: 'idb://docpal-electric',
      extensions: { electric: electricSync() }
    })
  }
})

// In your app
const worker = new SharedWorker('/workers/electric-sync.worker.ts')
// Now all tabs share the same DB instance!
```

## 🎯 Next Steps

### Phase 1: Proof of Concept (Current)
- [x] Install dependencies
- [x] Add Electric to docker-compose
- [x] Create useElectricSync composable
- [x] Build POC page
- [ ] Test multi-tab sync
- [ ] Test offline mode
- [ ] Document learnings

### Phase 2: Production Integration
- [ ] Configure Electric for all tables (workspaces, data_tables, etc.)
- [ ] Add authentication to Electric (sync only user's data)
- [ ] Implement SharedWorker for better performance
- [ ] Replace API calls with local queries
- [ ] Add conflict resolution strategy
- [ ] Performance testing with large datasets

### Phase 3: Advanced Features
- [ ] Selective sync (sync only what user needs)
- [ ] Optimistic UI updates
- [ ] Background sync when app is idle
- [ ] Sync progress indicators
- [ ] Data compression for large tables

## 📚 Resources

- [ElectricSQL Docs](https://electric-sql.com/docs)
- [PGlite Docs](https://pglite.dev/)
- [Electric Sync Protocol](https://electric-sql.com/docs/api/http)
- [Multi-tab Workers](https://pglite.dev/docs/multi-tab-worker)

## 🐛 Troubleshooting

### Electric Service Won't Start

Check PostgreSQL is healthy first:
```bash
docker ps
# Look for "healthy" status on docpal-postgres
```

Check Electric logs:
```bash
docker logs docpal-electric --follow
```

### Database Schema Mismatch

Electric might fail if your PGlite schema doesn't match PostgreSQL. Solution:

```typescript
// In useElectricSync.ts, add schema creation
await db.exec(`
  CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    menu JSONB,
    company_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
  )
`)
```

### Performance Issues

If syncing large tables:
1. Use `where` clauses to limit data
2. Implement pagination in shapes
3. Consider IndexedDB size limits (browser dependent)
4. Monitor network traffic in DevTools

## 💡 Tips

1. **Start Small**: Test with one table (workspaces) before syncing everything
2. **Watch the Console**: Lots of helpful logs from `[Electric]` prefix
3. **Use DevTools**: Network tab shows WebSocket connection, Application tab shows IndexedDB
4. **Test Offline**: Best way to verify local-first is working
5. **Multi-tab is Magic**: Most impressive demo of real-time sync

## 🎉 Success Criteria

Your POC is successful if:
- ✅ Workspaces sync from PostgreSQL to browser
- ✅ Updates in one tab appear in another tab within ~1 second
- ✅ Queries work instantly (no loading spinner)
- ✅ Offline mode still allows reading synced data
- ✅ Reconnecting automatically resumes sync

---

**Questions or Issues?** Check the Electric logs, browser console, and network tab. Most issues are related to PostgreSQL configuration or CORS.

