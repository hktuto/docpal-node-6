# Migration Guide: Local Docker PostgreSQL → Cloud Provider

**Status**: ⏳ **Planned - After Phase 2.6 Complete**  
**Target Date**: February/March 2026  
**Estimated Time**: 2-3 hours  
**Difficulty**: Easy

## Migration Strategy Decision

**Decision Made**: December 27, 2025  
**Approach**: Wait for schema stability after Phase 2.6

### Why Wait?

Phase 2.6 will add significant database schema changes:
- New tables: views permissions, user preferences, table templates
- New relations and constraints
- Additional indexes for performance

**Benefits of waiting:**
- ✅ Single migration with stable, complete schema
- ✅ Fewer iterations and migrations
- ✅ Less disruption during active development
- ✅ Docker works well for current development needs

**Migration Checkpoint:** After Phase 2.6 completes (~Feb/Mar 2026)

## Why Migrate Now?

Moving to a cloud database before Phase 2.6 provides:
- ✅ Production-like environment for development
- ✅ Better team collaboration (shared database)
- ✅ Automatic backups and point-in-time recovery
- ✅ Better performance and reliability
- ✅ No Docker management overhead
- ✅ Easy staging/production separation

## Recommended Provider: Neon

**Why Neon?**
- Native PostGIS support (required for geolocation fields)
- Serverless auto-scaling
- Instant database branching for dev/staging
- Generous free tier for development
- Excellent DX

**Free Tier Limits:**
- 0.5 GB storage
- 191 compute hours/month
- Suitable for development and small projects

## Step-by-Step Migration

### 1. Create Neon Account & Project

```bash
# 1. Visit https://neon.tech
# 2. Sign up with GitHub/Email
# 3. Create new project:
#    - Name: docpal-dev (or your preference)
#    - Region: Choose closest to you
#    - PostgreSQL version: 16 (for best PostGIS support)
```

### 2. Get Connection String

After project creation, Neon provides a connection string:

```
postgresql://[user]:[password]@[endpoint].neon.tech/[dbname]?sslmode=require
```

**Example:**
```
postgresql://docpal_user:AbCdEfG123@ep-cool-sound-12345.us-east-2.aws.neon.tech/docpal?sslmode=require
```

### 3. Enable PostGIS Extension

**Via Neon SQL Editor:**
1. Go to your project → SQL Editor
2. Run:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

**Verify:**
```sql
SELECT PostGIS_version();
-- Should return: 3.4.x
```

### 4. Configure Environment Variables

Create `.env` file in project root:

```bash
# .env
# Add this file to .gitignore!

# Neon Database Connection
NUXT_HUB_DATABASE_URL=postgresql://[user]:[password]@[endpoint].neon.tech/[dbname]?sslmode=require

# Or simply:
DATABASE_URL=postgresql://[user]:[password]@[endpoint].neon.tech/[dbname]?sslmode=require
```

**Update `.gitignore`:**
```bash
# Add if not already present
.env
.env.local
.env.*.local
```

### 5. Update NuxtHub Configuration

Your `nuxt.config.ts` already supports this - no changes needed!

```typescript
// nuxt.config.ts - Already configured ✅
export default defineNuxtConfig({
  modules: ['@nuxthub/core'],
  hub: {
    db: 'postgresql', // ✅ Works with both local and cloud
    dir: '.data'
  }
})
```

NuxtHub automatically uses `NUXT_HUB_DATABASE_URL` or `DATABASE_URL` if present.

### 6. Run Migrations

```bash
# Apply all migrations to Neon database
pnpm db:migrate

# Expected output:
# ✔ Database migration .data/db/migrations/postgresql/0001_*.sql applied
# ✔ Database migrations applied successfully.
```

### 7. Verify Connection

```bash
# Test that connection works
pnpm dev

# Try creating a workspace/table to verify everything works
```

### 8. Migrate Existing Data (If Needed)

**If you have important data in Docker PostgreSQL:**

```bash
# Step 1: Export from Docker
docker exec docpal-postgres pg_dump \
  -U docpal \
  -d docpal \
  --no-owner \
  --no-acl \
  > backup.sql

# Step 2: Import to Neon
# Option A: Using psql
psql "postgresql://[connection-string]" < backup.sql

# Option B: Using Neon's import feature
# Upload backup.sql via Neon dashboard
```

**⚠️ Note:** Make sure PostGIS extension is enabled in Neon before importing!

### 9. Update Docker Compose (Optional)

You can keep Docker for local-only development:

```yaml
# docker-compose.dev.yml
# Keep for local development option
# Just don't run it when using Neon
```

Or remove PostgreSQL service if fully migrated:

```yaml
# Remove postgres service
# Keep minio for future file uploads
services:
  minio:
    # ... keep minio config
```

### 10. Update Scripts

```json
// package.json - Update if needed
{
  "scripts": {
    "dev": "nuxt dev",
    "docker:up": "docker compose -f docker-compose.dev.yml up -d",
    "docker:down": "docker compose -f docker-compose.dev.yml down",
    // Add cloud-specific scripts:
    "db:studio": "drizzle-kit studio", // View/edit cloud DB
    "db:pull": "drizzle-kit pull", // Pull schema from cloud
    "db:push": "drizzle-kit push" // Push schema to cloud (dev only)
  }
}
```

## Environment Setup for Team

### Development
```bash
# .env.development
DATABASE_URL=postgresql://[neon-dev-endpoint]
```

### Staging (Future)
```bash
# .env.staging
DATABASE_URL=postgresql://[neon-staging-endpoint]
```

### Production (Future)
```bash
# .env.production
DATABASE_URL=postgresql://[neon-prod-endpoint]
```

## Neon-Specific Features to Use

### 1. Database Branching

Create instant copies for testing:

```bash
# Via Neon Dashboard:
# 1. Go to Branches
# 2. Click "New Branch"
# 3. Name: "feature-testing"
# 4. Get new connection string
```

Perfect for:
- Testing Phase 2.6 changes
- Experimenting with new features
- Safe schema changes

### 2. Point-in-Time Recovery

Neon automatically backs up your database. You can restore to any point in the last 7 days (free tier) or 30 days (paid).

### 3. Connection Pooling

Neon provides built-in connection pooling:

```bash
# Pooled connection (recommended for serverless)
postgresql://[user]:[password]@[endpoint].neon.tech/[dbname]?sslmode=require

# Direct connection (for migrations)
postgresql://[user]:[password]@[endpoint].neon.tech/[dbname]?sslmode=require&connect_timeout=10
```

## Troubleshooting

### Issue: "Extension postgis does not exist"

**Solution:**
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Issue: "Connection timeout"

**Solution:** Add connection timeout:
```bash
DATABASE_URL=postgresql://...?sslmode=require&connect_timeout=30
```

### Issue: "Too many connections"

**Solution:** Neon has connection limits. Use pooling:
```bash
# Use pooled endpoint (ends with -pooler.neon.tech)
DATABASE_URL=postgresql://[user]:[password]@[endpoint]-pooler.neon.tech/[dbname]
```

### Issue: Migrations fail

**Solution:** Ensure PostGIS is installed first:
```bash
# Run this manually before migrations
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Then run migrations
pnpm db:migrate
```

## Cost Estimates

### Free Tier (Neon)
- **Cost:** $0/month
- **Storage:** 0.5 GB
- **Compute:** 191 hours/month
- **Good for:** Development, small projects

### Pro Tier (Neon)
- **Cost:** $19/month
- **Storage:** 10 GB included
- **Compute:** Unlimited
- **Features:** 7-day history, better support
- **Good for:** Production, team projects

### Comparison

| Provider | Free Tier | Starting Paid | PostGIS |
|----------|-----------|---------------|---------|
| Neon | 0.5GB, 191h | $19/month | ✅ Native |
| Supabase | 500MB | $25/month | ✅ Pre-installed |
| Railway | $5 credit | Pay as you go | ✅ Supported |
| Vercel Postgres | N/A | $20/month | ✅ Via Neon |

## Rollback Plan

If something goes wrong:

```bash
# 1. Stop app
# 2. Remove .env or comment DATABASE_URL
# 3. Start Docker
pnpm docker:up

# 4. App will use local Docker again
pnpm dev
```

## Testing Checklist

After migration, verify:

- [ ] App starts successfully
- [ ] Can view workspaces
- [ ] Can create tables
- [ ] Can add/edit/delete rows
- [ ] Geolocation fields work (PostGIS)
- [ ] Migrations work
- [ ] Audit logs work
- [ ] All API endpoints function

## Next Steps After Migration

1. **Update team docs** with new connection instructions
2. **Set up staging branch** in Neon for Phase 2.6 development
3. **Configure automatic backups** (Neon does this, but document it)
4. **Monitor usage** to stay within free tier or plan upgrade
5. **Set up production database** when ready to deploy

## Support & Resources

- **Neon Docs:** https://neon.tech/docs
- **NuxtHub Database Docs:** https://hub.nuxt.com/docs/features/database
- **Drizzle + Neon:** https://orm.drizzle.team/docs/get-started-postgresql#neon

---

**Estimated Migration Time:** 2-3 hours  
**Risk Level:** Low (easy rollback)  
**Best Time:** Now (before Phase 2.6)

