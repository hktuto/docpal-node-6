# PostgreSQL Version Guide

## Current Setup

We're using **PostgreSQL 16 with PostGIS 3.4** for optimal stability and compatibility.

## Why PostgreSQL 16?

### Pros
✅ **Mature PostGIS support** - PostGIS 3.4 is well-tested on PG 16  
✅ **Production-proven** - Over a year of real-world usage  
✅ **LTS status** - Will receive updates until November 2028  
✅ **Ecosystem support** - All major tools and extensions support PG 16  
✅ **Cloud providers** - Fully supported by AWS RDS, Heroku, Render, etc.  

### Cons
❌ Doesn't have the latest PG 17 features (see below)

## PostgreSQL 17 Features (Latest Stable)

Released September 2024, PG 17 includes:

### Performance Improvements
- **Faster VACUUM** - 20% faster maintenance operations
- **Improved B-tree indexing** - Better performance for large indexes
- **Enhanced WAL compression** - Reduced disk I/O
- **Better parallel query execution** - Faster complex queries

### Developer Features
- **JSON improvements** - `JSON_TABLE` for better JSON querying
- **New SQL/JSON functions** - More powerful JSON manipulation
- **Enhanced text search** - Better full-text search capabilities
- **Incremental backups** - pg_basebackup improvements

### Operations
- **Simplified replication** - Easier to set up streaming replication
- **Better monitoring** - More detailed statistics
- **Improved authentication** - Better SCRAM support

## Version Comparison

| Version | Release Date | Support Until | PostGIS | Production Ready | Notes |
|---------|--------------|---------------|---------|------------------|-------|
| **18** | Not yet | TBD | No | ❌ Beta | Wait for stable release |
| **17** | Sep 2024 | Nov 2029 | 3.4+ | ✅ Yes | Latest stable, great choice |
| **16** | Sep 2023 | Nov 2028 | 3.4 | ✅ Yes | **Current LTS**, most stable |
| **15** | Oct 2022 | Nov 2027 | 3.4 | ✅ Yes | Still supported |

## Upgrading to PostgreSQL 17

If you want to use PostgreSQL 17, it's simple:

### Option 1: Change Docker Image

```yaml
# docker-compose.dev.yml
postgres:
  image: postgis/postgis:17-3.4-alpine  # Changed from 16 to 17
```

### Option 2: Full Upgrade Steps

```bash
# 1. Backup your data (if needed)
docker exec docpal-postgres pg_dump -U docpal docpal > backup.sql

# 2. Stop and remove old containers
pnpm docker:down
docker volume rm docpal-node-6_postgres_data

# 3. Update docker-compose.dev.yml to use PG 17
# image: postgis/postgis:17-3.4-alpine

# 4. Start new containers
pnpm docker:up

# 5. Restore data (if needed)
cat backup.sql | docker exec -i docpal-postgres psql -U docpal -d docpal

# 6. Run migrations
pnpm db:migrate
```

## When to Upgrade?

### Stick with PostgreSQL 16 if:
- 🏢 **Building for production** - Maximum stability matters
- 🛡️ **Risk-averse** - Want battle-tested technology
- 🔌 **Using managed services** - Some cloud providers lag behind
- 📦 **Complex extensions** - Need time for ecosystem to catch up

### Upgrade to PostgreSQL 17 if:
- 🚀 **Want latest features** - JSON improvements, better performance
- 🧪 **In development phase** - Can handle edge cases
- 💪 **Need performance gains** - Working with large datasets
- 📈 **Future-proofing** - Will be LTS next year

## Recommended Approach

**For DocPal (our project):**

### Phase 1-3 (Current - Next 6 months)
✅ **Stay on PostgreSQL 16**
- Focus on building features, not chasing versions
- Maximum stability during development
- PostGIS is fully mature on PG 16

### Phase 4-5 (6+ months)
🔄 **Consider PostgreSQL 17**
- By then, PG 17 will be battle-tested
- All extensions will have mature support
- Performance improvements will be valuable at scale

### Production Launch
📊 **Evaluate then**
- PG 17 will be 1+ years old (very stable)
- Cloud providers will have full support
- Can make informed decision based on workload

## Notable PostgreSQL 17 Features for DocPal

Features that would specifically benefit our use case:

### 1. Faster JSON Operations
```sql
-- Better performance for our JSONB menu/config columns
SELECT * FROM apps WHERE menu @> '{"type": "folder"}';
```

### 2. Improved Full-Text Search
```sql
-- Better for searching across dynamic tables
SELECT * FROM dt_company_table WHERE to_tsvector('english', content) @@ to_tsquery('search');
```

### 3. Better Bulk Operations
```sql
-- Faster for our dynamic table data imports
COPY dt_company_table FROM 'data.csv';
```

### 4. Enhanced Monitoring
- Better visibility into query performance
- Helps optimize dynamic table queries

## Migration Path

If we decide to upgrade later:

### Development
```bash
# Easy - just change image and recreate
pnpm docker:down
docker volume rm docpal-node-6_postgres_data
# Update docker-compose.dev.yml
pnpm docker:up
```

### Production (Future)
```bash
# Use pg_upgrade for zero-downtime
pg_upgrade --old-datadir=/old --new-datadir=/new
```

## TL;DR

**Current choice: PostgreSQL 16**
- ✅ Optimal stability and PostGIS compatibility
- ✅ Production-ready
- ✅ Mature ecosystem support

**Can upgrade to 17?**
- ✅ Yes, safe to upgrade now if you want latest features
- ✅ Just change Docker image from `16-3.4` to `17-3.4`
- ⚠️ May encounter edge cases (newly released)

**Should upgrade to 18?**
- ❌ No, still in beta
- ⏳ Wait for stable release and PostGIS support

---

**Recommendation**: Stick with PostgreSQL 16 for now. Consider PG 17 in Phase 4-5 when it's had more real-world testing and you need the performance improvements.

