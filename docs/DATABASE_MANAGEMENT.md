# Database Management Guide

## 🔄 Reset Database (Clean & Seed)

### Quick Reset (Recommended)

The easiest way to reset your database:

```bash
pnpm db:reset
```

This will:
1. ⚠️ Drop all tables (you'll be asked to confirm)
2. ✅ Recreate tables from migrations
3. 🌱 Seed with superadmin account

**Credentials after reset:**
- Email: `admin@docpal.dev`
- Password: `admin123`
- Company: Acme Corporation

---

## 📝 Manual Reset Steps

If you prefer to run steps manually:

### 1. Drop All Tables

**Option A: Using Nuxt CLI**
```bash
pnpm db:drop --confirm
```

**Option B: Using API Endpoint** (dev server must be running)
```bash
curl -X POST http://localhost:3000/api/db-reset
```

### 2. Run Migrations

```bash
pnpm db:migrate
```

This will recreate all tables from the migration files in `server/db/migrations/postgresql/`.

### 3. Seed Database

**Option A: Via terminal**
```bash
curl -X POST http://localhost:3000/api/seed
```

**Option B: Via browser**

Visit: `http://localhost:3000/api/seed`

---

## 🗃️ Database Commands

### View Current Schema

```bash
pnpm db:sql "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
```

### Generate New Migration

After changing schema files in `server/db/schema/`:

```bash
pnpm db:generate
```

This creates a new migration file in `server/db/migrations/postgresql/`.

### Apply Migrations

```bash
pnpm db:migrate
```

### Drop Database

```bash
pnpm db:drop --confirm
```

---

## 📊 Checking Database State

### View All Tables

```sql
pnpm db:sql "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
```

### Check Users

```sql
pnpm db:sql "SELECT id, email, name, created_at FROM users"
```

### Check Companies

```sql
pnpm db:sql "SELECT id, name, slug, created_at FROM companies"
```

### Check Company Members

```sql
pnpm db:sql "SELECT cm.role, u.email, c.name as company_name FROM company_members cm JOIN users u ON cm.user_id = u.id JOIN companies c ON cm.company_id = c.id"
```

### Check Active Sessions

```sql
pnpm db:sql "SELECT s.token, u.email, s.expires_at FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.expires_at > NOW()"
```

---

## 🛠️ Troubleshooting

### "Migration failed" Error

1. Check if tables already exist:
   ```bash
   pnpm db:sql "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
   ```

2. If tables exist, drop them first:
   ```bash
   pnpm db:drop --confirm
   ```

3. Then run migrations again:
   ```bash
   pnpm db:migrate
   ```

### "Seed failed" Error

Make sure:
1. Dev server is running (`pnpm dev`)
2. Migrations have been applied
3. Tables exist in the database

Check the server console for detailed error messages.

### Foreign Key Constraint Errors

If you get foreign key errors when dropping tables:

```bash
curl -X POST http://localhost:3000/api/db-reset
```

This endpoint drops tables in the correct order (reverse of dependencies).

### "hub:db" Module Not Found

This is normal during development. The module is virtual and provided by NuxtHub at runtime. Restart your dev server if you see this error persistently.

---

## 🔐 Seed Data Reference

After running `pnpm db:reset` or calling `/api/seed`:

### Default User

| Field | Value |
|-------|-------|
| Email | admin@docpal.dev |
| Password | admin123 |
| Name | Super Admin |
| Role | Owner |
| Email Verified | ✅ Yes |

### Default Company

| Field | Value |
|-------|-------|
| Name | Acme Corporation |
| Slug | acme-corp |
| Description | Test company for development |
| Created By | Super Admin |

### Database Tables Created

1. **users** - User accounts
2. **companies** - Organizations/tenants
3. **company_members** - User-company relationships
4. **company_invites** - Pending invitations
5. **sessions** - Active user sessions
6. **magic_links** - Passwordless login tokens
7. **apps** - Applications within companies
8. **data_tables** - Dynamic tables
9. **data_table_columns** - Table column definitions
10. **audit_logs** - Activity tracking

---

## 🚀 Quick Start After Reset

```bash
# 1. Reset database
pnpm db:reset

# 2. Start dev server (if not running)
pnpm dev

# 3. Login at http://localhost:3000/auth/login
# Email: admin@docpal.dev
# Password: admin123
```

---

## ⚠️ Production Notes

### DO NOT USE IN PRODUCTION

The following commands/endpoints are **development only**:

- ❌ `pnpm db:reset`
- ❌ `POST /api/db-reset`
- ❌ `pnpm db:drop`

The `/api/db-reset` endpoint is automatically disabled in production.

### Production Database Management

For production:

1. **Backups**: Always backup before schema changes
2. **Migrations**: Use versioned migrations only
3. **Seeds**: Never use development seed data
4. **Access**: Restrict database access to CI/CD only

### Recommended Production Workflow

```bash
# 1. Backup database
pg_dump $DATABASE_URL > backup.sql

# 2. Apply migrations
pnpm db:migrate

# 3. Verify deployment
# Check application health and run smoke tests

# 4. Rollback if needed
psql $DATABASE_URL < backup.sql
```

---

## 📚 Additional Resources

- **Auth Setup**: See `docs/AUTH_SETUP.md`
- **Quick Start**: See `docs/AUTH_QUICK_START.md`
- **Development Plan**: See `docs/DEVELOPMENT_PLAN/`
- **Drizzle ORM**: https://orm.drizzle.team/
- **NuxtHub DB**: https://hub.nuxt.com/docs/features/database

