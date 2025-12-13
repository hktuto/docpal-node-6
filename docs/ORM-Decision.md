# ORM Decision - Do We Need Prisma?
Date: 2025-12-12

## Question
Should we use Prisma ORM given that we're using JSONB for dynamic data?

## Decision: ❌ NO, Use Raw SQL Client (postgres.js or pg)

## Reasoning

### Why NOT Prisma for This Project?

#### 1. **Limited JSONB Support**
- Prisma has basic JSONB support but not optimized for dynamic queries
- You'll need raw SQL for complex JSONB operations anyway
- Type safety doesn't help with dynamic JSONB fields
- Can't generate types for dynamic schema

```typescript
// Prisma - still need raw SQL for JSONB queries
const records = await prisma.$queryRaw`
  SELECT * FROM records 
  WHERE (data->>'age')::int > ${age}
`;

// Direct SQL - same thing, less overhead
const records = await sql`
  SELECT * FROM records 
  WHERE (data->>'age')::int > ${age}
`;
```

#### 2. **Migration Overhead**
- Our schema is relatively simple (8-10 tables)
- Most complexity is in JSONB (dynamic)
- Can manage migrations with plain SQL files
- More control over indexes and constraints

#### 3. **Performance**
- Extra abstraction layer
- For JSONB queries, you bypass Prisma anyway
- Direct SQL is faster and more flexible

#### 4. **Learning Curve**
- Prisma schema language
- Prisma client API
- When to use raw SQL vs Prisma
- For POC, simpler is better

### Recommended: postgres.js

**postgres.js** is a modern PostgreSQL client:
- ✅ Zero dependencies
- ✅ Fast (2x faster than pg)
- ✅ Tagged template literals (SQL injection safe)
- ✅ TypeScript support
- ✅ Great for JSONB queries
- ✅ Lightweight (~20KB)

```typescript
import postgres from 'postgres';

const sql = postgres({
  host: 'localhost',
  port: 5432,
  database: 'docpal',
  username: 'docpal',
  password: 'docpal_dev'
});

// Simple queries
const databases = await sql`
  SELECT * FROM databases 
  WHERE deleted_at IS NULL
  ORDER BY created_at DESC
`;

// JSONB queries
const records = await sql`
  SELECT * FROM records 
  WHERE table_id = ${tableId}
    AND (data->>'age')::int > ${age}
    AND data->>'status' = ${status}
  ORDER BY (data->>'created_at')::timestamp DESC
  LIMIT ${limit} OFFSET ${offset}
`;

// Transactions
await sql.begin(async sql => {
  await sql`INSERT INTO tables ...`;
  await sql`INSERT INTO columns ...`;
});
```

### Alternative: node-postgres (pg)

**pg** is the classic PostgreSQL client:
- ✅ Battle-tested (most popular)
- ✅ Connection pooling
- ✅ Transactions
- ⚠️ Manual query building
- ⚠️ More verbose

```typescript
import pg from 'pg';
const pool = new pg.Pool({ ... });

const result = await pool.query(
  'SELECT * FROM records WHERE table_id = $1',
  [tableId]
);
```

## Migration Management

### Without ORM - Use SQL Files

```
packages/admin/database/
├── migrations/
│   ├── 001_create_users_companies.sql
│   ├── 002_create_databases_tables.sql
│   ├── 003_create_columns.sql
│   ├── 004_create_records.sql
│   ├── 005_create_files.sql
│   └── 006_create_indexes.sql
└── seeds/
    └── 001_seed_admin_company.sql
```

**Migration runner script:**
```typescript
// database/migrate.ts
import { sql } from './connection';
import { readdir, readFile } from 'fs/promises';

async function runMigrations() {
  await sql`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE,
      executed_at TIMESTAMP DEFAULT NOW()
    )
  `;
  
  const files = await readdir('./migrations');
  
  for (const file of files.sort()) {
    const [applied] = await sql`
      SELECT 1 FROM migrations WHERE name = ${file}
    `;
    
    if (!applied) {
      console.log(`Running migration: ${file}`);
      const content = await readFile(`./migrations/${file}`, 'utf-8');
      await sql.unsafe(content);
      await sql`INSERT INTO migrations (name) VALUES (${file})`;
    }
  }
}
```

## Comparison Table

| Feature | Prisma | postgres.js | pg |
|---------|--------|-------------|-----|
| **Type Safety** | ✅ Generated | 🟡 Manual | 🟡 Manual |
| **JSONB Support** | 🟡 Basic | ✅ Excellent | ✅ Excellent |
| **Performance** | 🟡 Good | ✅ Fast | ✅ Fast |
| **Migration Tools** | ✅ Built-in | ❌ Manual | ❌ Manual |
| **Learning Curve** | 🟡 Medium | ✅ Easy | ✅ Easy |
| **Bundle Size** | ❌ Large | ✅ Small | 🟡 Medium |
| **Dynamic Queries** | ❌ Limited | ✅ Excellent | ✅ Excellent |
| **POC Friendly** | 🟡 Okay | ✅ Great | ✅ Great |

## Recommendation

### For This POC: **postgres.js**

**Why:**
1. ✅ Perfect for JSONB-heavy workload
2. ✅ Simple and fast to get started
3. ✅ No extra abstractions
4. ✅ Clean tagged template syntax
5. ✅ Easy to write complex queries
6. ✅ TypeScript-friendly

**Setup:**
```bash
pnpm add postgres
```

**Structure:**
```
packages/admin/
├── server/
│   ├── database/
│   │   ├── connection.ts      # SQL client instance
│   │   ├── migrations/        # SQL migration files
│   │   ├── seeds/            # Seed data
│   │   └── migrate.ts        # Migration runner
│   ├── api/
│   │   ├── databases.ts      # Database endpoints
│   │   ├── tables.ts         # Table endpoints
│   │   ├── columns.ts        # Column endpoints
│   │   └── records.ts        # Record endpoints
│   └── utils/
│       ├── query-builder.ts  # JSONB query helpers
│       └── validation.ts     # Input validation
```

## Type Safety Without ORM

Create TypeScript types manually:

```typescript
// server/types/database.ts
export interface User {
  id: string;
  username: string;
  email: string;
  created_at: Date;
}

export interface Database {
  id: string;
  company_id: string;
  name: string;
  created_by: string;
  created_at: Date;
  deleted_at: Date | null;
}

export interface Record {
  id: string;
  table_id: string;
  data: Record<string, any>; // JSONB
  created_by: string;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}
```

**Helper for type-safe queries:**
```typescript
// server/utils/query-builder.ts
import { sql } from '../database/connection';

export async function findRecords<T = any>(
  tableId: string,
  filters: Record<string, any> = {},
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = options;
  
  // Build WHERE clauses dynamically based on filters
  // Return typed results
  
  return sql<Record[]>`
    SELECT * FROM records
    WHERE table_id = ${tableId}
      AND deleted_at IS NULL
    LIMIT ${limit} OFFSET ${offset}
  `;
}
```

## When to Consider Prisma?

Consider Prisma if:
- ❌ You need automatic type generation (not useful for dynamic JSONB)
- ❌ You have a complex relational schema (we don't - only 8 tables)
- ❌ You need advanced query builder (we need custom JSONB queries)
- ❌ Team is already familiar with Prisma (POC learning curve)

For MVP/Production, you could reconsider, but for POC with JSONB, raw SQL is simpler.

## Final Decision

**Use postgres.js**:
1. Lightweight and fast
2. Perfect for JSONB queries
3. No abstraction overhead
4. Simple migration management
5. Easy to write complex queries
6. Great for POC iteration speed

The complexity of our app is in the **application logic** (permissions, dynamic views), not the database queries. A simple SQL client is all we need.

