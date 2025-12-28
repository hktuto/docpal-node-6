# ⚡ ElectricSQL POC - Quick Start

Get up and running with real-time database sync in 5 minutes!

## 🚀 Quick Setup

### 1. Start Services

```bash
# Start PostgreSQL + Electric sync service
pnpm docker:up
```

This starts:
- PostgreSQL (port 5432)
- Electric Sync Service (port 3000)
- MinIO (ports 9000, 9001)

### 2. Configure Electric

```bash
# Run the setup script
pnpm electric:setup
```

This script will:
- ✅ Enable logical replication in PostgreSQL
- ✅ Create Electric publication for workspaces table
- ✅ Grant replication permissions
- ✅ Restart PostgreSQL
- ✅ Verify everything is working

### 3. Start Dev Server

```bash
pnpm dev
```

### 4. Open POC Page

Navigate to: **http://localhost:3001/electric-poc**

> **Note**: Electric service runs on port 30000 (not 3000, which is used by Nuxt dev server)

### 5. Test It!

1. Click **"Start Sync"** button
2. You should see your workspaces appear
3. Open the same page in **another browser tab**
4. Create/update a workspace in your app
5. Watch it **automatically sync** to both tabs! 🎉

## 🧪 What to Test

### ✅ Basic Sync
- Click "Start Sync"
- Workspaces should load from your database
- Status should show "Connected" and "Ready"

### ✅ Multi-Tab Real-time Updates
1. Open POC in 2 tabs
2. Both tabs click "Start Sync"
3. Changes in one tab appear in the other instantly

### ✅ Offline Mode
1. Start sync
2. Open DevTools → Network → Go offline
3. Data still accessible from local DB!
4. Go online → sync resumes

### ✅ Live Updates
1. Keep POC page open with sync running
2. Use your regular app to create/edit workspaces
3. Watch them update live in POC page

## 📊 Expected Results

**On Success:**
```
Status Bar:
  Connection: ✓ Connected
  Syncing: ✓ Ready
  
Active Shapes: workspaces
Last Update: [current time]

Workspaces: [Your workspaces displayed in grid]
```

## 🐛 Troubleshooting

### Electric Service Not Running

```bash
# Check if running
docker ps | grep electric

# Check logs
docker logs docpal-electric

# Restart if needed
pnpm docker:restart
```

### No Data Syncing

```bash
# Verify workspaces exist
docker exec -it docpal-postgres psql -U docpal -d docpal -c "SELECT COUNT(*) FROM workspaces;"

# Check publication exists
docker exec -it docpal-postgres psql -U docpal -d docpal -c "\dRp+"

# Re-run setup
pnpm electric:setup
```

### Connection Errors

Check browser console (F12) for detailed error messages:
- `[Electric]` prefix shows sync operations
- Look for CORS or network errors
- Verify Electric is on port 3000

### PostgreSQL Not Ready

```bash
# Check PostgreSQL status
docker ps

# Should show "healthy" status
# If not, check logs:
docker logs docpal-postgres
```

## 📁 Files Created

```
app/
  composables/
    useElectricSync.ts          # Core sync logic
  pages/
    electric-poc.vue            # POC demo page

docker-compose.dev.yml          # Added Electric service

scripts/
  setup-electric.sh             # Setup automation

docs/
  ELECTRIC_SQL_POC.md          # Full documentation
```

## 🎯 Key Features Demonstrated

1. **Local-First**: Data stored in browser (IndexedDB)
2. **Real-time Sync**: Changes propagate instantly
3. **Offline Support**: Works without network
4. **Multi-Tab**: Shared state across tabs
5. **Zero Latency**: Queries are instant (no API calls)

## 📚 Next Steps

After testing the POC:

1. **Review the code**: Check `useElectricSync.ts` to understand the implementation
2. **Read full docs**: See `docs/ELECTRIC_SQL_POC.md` for detailed explanation
3. **Plan integration**: Decide which tables to sync in production
4. **Consider SharedWorker**: For better performance across tabs
5. **Add authentication**: Sync only user's data with WHERE clauses

## 💡 Pro Tips

- **Watch the Console**: Lots of helpful debug logs
- **Use DevTools**: 
  - Network tab → See WebSocket connection
  - Application tab → See IndexedDB data
- **Test Offline First**: Best way to verify local-first
- **Multi-tab is Magic**: Most impressive demo

## ⚠️ Important Notes

- This is a **POC** - not production ready
- Currently syncs **all workspaces** (no filtering)
- Uses **polling** (1 second) instead of reactive queries
- No **authentication** on Electric endpoint yet
- No **conflict resolution** strategy defined

## 🎉 Success!

If you can see workspaces syncing in real-time across tabs, **congratulations!** 

You've successfully set up ElectricSQL local-first sync. This is the foundation for:
- Instant UI updates
- Offline-first functionality  
- Reduced server load
- Better user experience

---

**Questions?** Check `docs/ELECTRIC_SQL_POC.md` for detailed documentation.

**Issues?** Check Docker logs and browser console for error messages.

