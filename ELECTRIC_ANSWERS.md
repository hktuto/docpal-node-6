# Answers to Your ElectricSQL Questions

## Question 1: Environment Variable for Electric URL ✅

### What I Did

**Created environment variable support:**
- Added `ELECTRIC_URL` to runtime config (server-side only)
- Updated proxy endpoint to use the config value
- Created `ENV_SETUP.md` with instructions

**IMPORTANT**: With proxy authentication, Electric URL is **server-side only** and NOT exposed to client!

### How to Use

1. **Create `.env` file** in project root:
```bash
ELECTRIC_URL=http://localhost:30000
```

2. **Or use the quick command**:
```bash
cat > .env << 'EOF'
ELECTRIC_URL=http://localhost:30000
EOF
```

3. **Restart dev server** to pick up changes:
```bash
pnpm dev
```

### Configuration Updated

**nuxt.config.ts**:
```typescript
runtimeConfig: {
  // Server-side only (not exposed to client)
  electricUrl: process.env.ELECTRIC_URL || 'http://localhost:30000',
  public: {
    // No Electric URL needed on client!
  }
}
```

**Usage in server endpoints**:
```typescript
// Only available server-side
const config = useRuntimeConfig()
const electricUrl = config.electricUrl
```

**Client doesn't need it**:
```typescript
// Client uses proxy endpoint
await electric.syncShape('workspaces', 'workspaces', '/api/electric/shape?table=workspaces')
// No Electric URL needed!
```

### For Production

Set environment variable on your hosting platform:
- **Vercel**: Add to Environment Variables
- **Docker**: Add to docker-compose.yml or .env
- **AWS/GCP**: Add to container environment

---

## Question 2: Security - All Workspaces Syncing! ⚠️

### You're Absolutely Right!

**Current behavior**: ALL workspaces from ALL companies sync to every user's browser.

**This is a CRITICAL security issue for production!**

### The Problem

```typescript
// Current POC (INSECURE)
await electric.syncShape(
  'workspaces',
  'workspaces',
  `${electricUrl}/v1/shape?table=workspaces&offset=-1`
)
// ⚠️ Syncs ALL workspaces regardless of company or permissions
```

### Solutions

#### Quick Fix: Add WHERE Clause

```typescript
// Filter by company_id (recommended minimum)
const user = await $fetch('/api/auth/me')
const companyId = user.company.id

await electric.syncShape(
  'my-workspaces',
  'workspaces',
  `${electricUrl}/v1/shape?table=workspaces&where=company_id.eq.${companyId}&offset=-1`
)
// ✅ Only syncs current user's company workspaces
```

#### Better: Add Permission Checks

```typescript
// Create secure composable
export const useSecureElectricSync = () => {
  const syncUserData = async () => {
    // 1. Verify authentication
    const user = await $fetch('/api/auth/me')
    if (!user) throw new Error('Not authenticated')
    
    // 2. Get user's company
    const companyId = user.company.id
    
    // 3. Sync only their company's data
    await electric.syncShape(
      'my-workspaces',
      'workspaces',
      `${electricUrl}/v1/shape?table=workspaces&where=company_id.eq.${companyId}`
    )
    
    return { companyId }
  }
  
  return { syncUserData }
}
```

#### Best: Row-Level Security (PostgreSQL)

```sql
-- Enable RLS on workspaces table
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY workspace_company_isolation ON workspaces
  FOR SELECT
  USING (company_id = current_setting('app.current_company_id', true)::uuid);
```

### Security Checklist

Before production:

- [ ] Add `where=company_id.eq.${companyId}` to all shape syncs
- [ ] Verify user authentication before syncing
- [ ] Test: User A cannot see User B's company data
- [ ] Enable PostgreSQL Row-Level Security (RLS)
- [ ] Remove `ELECTRIC_INSECURE=true` (add real secret)
- [ ] Add JWT authentication to Electric endpoint
- [ ] Implement audit logging
- [ ] Add rate limiting

### Testing

```typescript
// Test 1: Isolation between companies
const userA = await loginAs('company-a-user')
await syncUserData()
const workspacesA = await electric.query('SELECT * FROM workspaces')
assert(workspacesA.every(w => w.company_id === 'company-a'))

// Test 2: Cannot access other company's data
const maliciousQuery = await electric.query(
  "SELECT * FROM workspaces WHERE company_id = 'company-b'"
)
assert(maliciousQuery.length === 0)
```

### Documentation

Created `ELECTRIC_SECURITY.md` with:
- Detailed security analysis
- Multiple solution approaches
- Implementation examples
- Testing strategies
- Production checklist

**Read it before deploying to production!**

---

## Question 3: Automating Electric Setup ✅

### What the Script Does

`electric:setup` script performs 3 critical tasks:

1. **Enable logical replication** in PostgreSQL
   ```sql
   ALTER SYSTEM SET wal_level = logical;
   ALTER SYSTEM SET max_replication_slots = 10;
   ALTER SYSTEM SET max_wal_senders = 10;
   ```

2. **Create Electric publication**
   ```sql
   CREATE PUBLICATION electric_publication FOR TABLE workspaces;
   ```

3. **Grant replication permissions**
   ```sql
   ALTER USER docpal WITH REPLICATION;
   ```

### Automated Solution

I've automated this in **two ways**:

#### Method 1: Docker Initialization (Recommended)

**Updated `docker-compose.dev.yml`**:
```yaml
postgres:
  command: 
    # Enable logical replication from the start
    - "postgres"
    - "-c"
    - "wal_level=logical"
    - "-c"
    - "max_replication_slots=10"
    - "-c"
    - "max_wal_senders=10"
  volumes:
    # Auto-initialize Electric on first startup
    - ./docker/init-electric.sh:/docker-entrypoint-initdb.d/99-init-electric.sh:ro
```

**Created `docker/init-electric.sh`**:
- Runs automatically on first PostgreSQL startup
- Grants replication permissions
- Creates helper function for publications

#### Method 2: Seed Script Integration

**Updated `server/api/seed.post.ts`**:
- Automatically creates Electric publication when seeding
- Idempotent (safe to run multiple times)
- No manual setup needed

**Created `server/api/electric/setup.post.ts`**:
- Standalone endpoint to create publication
- Can be called via API or script

### How to Use

#### For New Setup (Fresh Database)

```bash
# 1. Start Docker (automatic setup)
pnpm docker:up

# 2. Run migrations (includes Electric setup)
pnpm db:migrate

# 3. Done! No manual setup needed
```

#### For Existing Setup

If you already have a database running:

**Option A: Quick (use existing script)**
```bash
pnpm electric:setup
```

**Option B: Use API endpoint**
```bash
# Start dev server first
pnpm dev

# Then call setup endpoint
pnpm electric:api-setup

# Or use curl directly
curl -X POST http://localhost:3001/api/electric/setup
```

**Option C: Restart with fresh setup**
```bash
# Stop and remove volumes
pnpm docker:down
docker volume rm docpal-node-6_postgres_data

# Start fresh (auto-setup runs)
pnpm docker:up
pnpm db:migrate
```

### What's Automated

✅ **Automated**:
- Logical replication settings (via docker command)
- Replication permissions (via init script)
- Publication creation (via migration)

❌ **Still Manual** (by design):
- Adding new tables to publication (use migration)
- Changing publication configuration
- Testing sync is working

### Adding More Tables to Sync

When you want to sync additional tables:

**Create a new migration**:
```sql
-- server/db/migrations/postgresql/XXXX_add_tables_to_electric.sql
ALTER PUBLICATION electric_publication 
ADD TABLE data_tables, data_table_columns, data_table_views;
```

**Or update existing migration** (before first deployment):
```sql
CREATE PUBLICATION electric_publication 
FOR TABLE 
  workspaces,
  data_tables,
  data_table_columns,
  data_table_views;
```

### Verification

After setup, verify it worked:

```bash
# Check logical replication is enabled
docker exec docpal-postgres psql -U docpal -d docpal -c "SHOW wal_level;"
# Should show: logical

# Check publication exists
docker exec docpal-postgres psql -U docpal -d docpal -c "\dRp+"
# Should show: electric_publication

# Check tables in publication
docker exec docpal-postgres psql -U docpal -d docpal -c "SELECT * FROM pg_publication_tables WHERE pubname = 'electric_publication';"
# Should show: workspaces
```

---

## Summary

### Question 1: Environment Variables ✅
- **Added**: `NUXT_PUBLIC_ELECTRIC_URL` runtime config
- **File**: Create `.env` with Electric URL
- **Docs**: See `ENV_SETUP.md`

### Question 2: Security ⚠️
- **Problem**: ALL workspaces syncing (insecure)
- **Solution**: Add `where=company_id.eq.${companyId}`
- **Docs**: See `ELECTRIC_SECURITY.md`
- **Action Required**: Must fix before production!

### Question 3: Automation ✅
- **Docker**: Auto-setup via command + init script
- **Migration**: `0001_electric_setup.sql` creates publication
- **Result**: No manual `electric:setup` needed for new setups
- **Existing**: Can still use `pnpm electric:setup`

---

## Updated Workflow

### For New Project Setup

```bash
# 1. Clone repo
git clone ...
cd docpal-node-6

# 2. Create .env file
cat > .env << 'EOF'
NUXT_PUBLIC_ELECTRIC_URL=http://localhost:30000
EOF

# 3. Start Docker (auto-configures Electric)
pnpm docker:up

# 4. Run migrations (includes Electric publication)
pnpm db:migrate

# 5. Seed data (optional)
pnpm db:seed-company

# 6. Start dev server
pnpm dev

# 7. Test Electric POC
# Open: http://localhost:3001/electric-poc
# Click "Start Sync"
```

### For Existing Setup

```bash
# Option 1: Use existing script
pnpm electric:setup

# Option 2: Run migration
pnpm db:migrate

# Then add .env file and restart
pnpm dev
```

---

## Files Created/Modified

### New Files
- `ENV_SETUP.md` - Environment setup instructions
- `ELECTRIC_SECURITY.md` - Security guide and solutions
- `ELECTRIC_ANSWERS.md` - This file (answers to your questions)
- `docker/init-electric.sh` - Auto-setup script
- `server/db/migrations/postgresql/0001_electric_setup.sql` - Migration

### Modified Files
- `nuxt.config.ts` - Added runtime config for Electric URL
- `app/pages/electric-poc.vue` - Uses config instead of hardcoded URL
- `docker-compose.dev.yml` - Added auto-setup for PostgreSQL

---

## Action Items

### Immediate (Required)

1. **Create `.env` file** (see ENV_SETUP.md)
2. **Test the changes**: Restart dev server and verify POC works
3. **Read security docs**: Review ELECTRIC_SECURITY.md

### Before Production (Critical)

1. **Add security filtering**: 
   ```typescript
   where=company_id.eq.${companyId}
   ```
2. **Test data isolation**: Verify users can't see other companies' data
3. **Remove INSECURE mode**: Set proper `ELECTRIC_SECRET`
4. **Enable Row-Level Security**: Add PostgreSQL RLS policies

### Optional (Improvements)

1. **Add more tables** to Electric publication
2. **Implement SharedWorker** for better performance
3. **Add sync progress UI** for user feedback
4. **Monitor sync metrics** in production

---

## Questions Answered? ✅

1. ✅ Electric URL in environment variable
2. ⚠️ Security issue identified and solutions provided
3. ✅ Setup automated via Docker and migrations

Need clarification on anything? Let me know!

