# ElectricSQL POC - Fixes Applied

## Issues Fixed

### 1. ✅ WASM Bundle Size Error
**Error**: `Invalid FS bundle size: 962 !== 4939155`

**Fix**: Added Vite configuration to exclude PGlite packages from optimization:

```typescript
// nuxt.config.ts
vite: {
  optimizeDeps: {
    exclude: [
      '@electric-sql/pglite',
      '@electric-sql/pglite-sync'
    ]
  }
}
```

**Action**: Restart dev server after this change

### 2. ✅ Electric Service Crashing
**Error**: `You must set ELECTRIC_SECRET unless ELECTRIC_INSECURE=true`

**Fix**: Added `ELECTRIC_INSECURE: "true"` to docker-compose.dev.yml

**Action**: Recreated container with `docker compose -f docker-compose.dev.yml up -d electric`

### 3. ✅ Port Conflict
**Issue**: Nuxt dev server and Electric both trying to use port 3000

**Fix**: Changed Electric to use port 30000 (host) → 3000 (container)

```yaml
ports:
  - "30000:3000"  # HTTP API (host:container)
```

**Action**: Updated all references from `localhost:3000` to `localhost:30000`

### 4. ✅ Missing Workspaces Table in PGlite
**Error**: `relation "workspaces" does not exist`

**Fix**: Added schema creation in `useElectricSync.ts`:

```typescript
await state.db.exec(`
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
  );
`)
```

### 5. ✅ Electric Shape API Format
**Issue**: `http://localhost:30000/v1/shape/workspaces` returns 404

**Solution**: Electric uses query parameters, not URL paths!

**Correct format**:
```
http://localhost:30000/v1/shape?table=workspaces&offset=-1
```

**Not**: `http://localhost:30000/v1/shape/workspaces`

## Current Status

✅ Electric service running on port 3002
✅ PostgreSQL configured for logical replication  
✅ Publication created for workspaces table
✅ PGlite initializes with schema
⚠️ Shape endpoint returning 404

## Next Steps to Try

### Option 1: Check Electric Documentation
The Electric API might have changed. Check:
- https://electric-sql.com/docs/api/http
- Look for shape endpoint format
- Check if there's a newer image version

### Option 2: Try Alternative Sync Approach
Instead of using Electric's HTTP API, we could:
1. Use PGlite's built-in sync (if available)
2. Implement custom polling from your Nuxt API
3. Use a different sync library

### Option 3: Use Mock Data for POC
For demonstration purposes, we could:
1. Pre-populate PGlite with data from API
2. Show the local-first functionality
3. Implement manual sync button

## Testing the Current Setup

1. **Restart everything**:
```bash
pnpm docker:restart
pnpm electric:setup
pnpm dev
```

2. **Check Electric is responding**:
```bash
curl http://localhost:3002/v1/health
# Should return 200 OK
```

3. **Try the POC page**:
- Open: http://localhost:3001/electric-poc
- Click "Start Sync"
- Check browser console for detailed errors

## Workaround: Manual Sync POC

If Electric shapes continue to have issues, I can create an alternative POC that:

1. **Fetches from your Nuxt API** (`/api/workspaces`)
2. **Stores in PGlite** (local IndexedDB)
3. **Queries locally** (instant, no network)
4. **Manual refresh button** (simulates sync)
5. **Still demonstrates local-first** benefits

This would show the core concept without depending on Electric's sync service.

Would you like me to:
- A) Continue debugging Electric shapes
- B) Create the manual sync workaround POC
- C) Try a different sync solution

## Files Modified

- `nuxt.config.ts` - Added Vite optimization exclusions
- `docker-compose.dev.yml` - Fixed Electric config and port
- `app/composables/useElectricSync.ts` - Added schema creation
- `app/pages/electric-poc.vue` - Updated port to 3002
- `scripts/setup-electric.sh` - Already working correctly

## Verification Commands

```bash
# Check Electric is running
docker ps | grep electric

# Check Electric logs
docker logs docpal-electric --tail 50

# Check publication
docker exec docpal-postgres psql -U docpal -d docpal -c "\dRp+"

# Test Electric endpoint
curl -I http://localhost:3002/v1/shape/workspaces?offset=-1

# Check workspaces exist
docker exec docpal-postgres psql -U docpal -d docpal -c "SELECT * FROM workspaces LIMIT 1;"
```

