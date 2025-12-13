# DocPal POC - Cursor AI Rules

## Project Overview
This is a POC for a multi-tenant Airtable-like application where users can create databases, tables with dynamic columns, and records with flexible schemas. Built with Nuxt 4, PostgreSQL with JSONB, and postgres.js client.

## Tech Stack
- **Frontend & Backend**: Nuxt 4 (Vue 3, TypeScript)
- **Database**: PostgreSQL with JSONB for dynamic data
- **Database Client**: postgres.js (NOT Prisma or any ORM)
- **File Storage**: MinIO (Docker)
- **Package Manager**: pnpm
- **Runtime**: Node.js 20+

## POC Simplifications (IMPORTANT)
- **No authentication system** - Using fixed admin user
- **Fixed admin user ID**: `00000000-0000-0000-0000-000000000001`
- **Fixed company ID**: `00000000-0000-0000-0000-000000000002`
- **No multi-tenancy logic** - All queries use fixed company_id
- **No roles/groups** - All operations as admin
- **No permissions** - All data visible and editable
- **No workflows** - Deferred to later phase

## Core Concepts

### Dynamic Schema
- Tables have dynamic columns (metadata)
- Records store data in JSONB `data` field
- Column definitions stored in `columns` table
- Data format: `{ "column_id": value }`

### Column Types
- `text` - String values
- `number` - Numeric values (int/float)
- `boolean` - True/false
- `date` - Date/datetime (ISO string)
- `file` - Reference to files table (UUID)
- `link` - Reference to records in another table (UUID or array of UUIDs)

### Soft Delete
- All main entities use `deleted_at` timestamp
- Filter with `WHERE deleted_at IS NULL`
- Never hard delete databases, tables, or records

## File Structure

```
packages/admin/
├── server/
│   ├── database/
│   │   ├── connection.ts         # TypeScript DB connection
│   │   ├── connection.mjs        # JS DB connection (for migrations)
│   │   ├── migrate.mjs           # Migration runner
│   │   ├── migrations/           # SQL migration files
│   │   └── seeds/                # Seed data
│   ├── types/
│   │   └── database.ts           # TypeScript types for all entities
│   ├── api/
│   │   ├── databases/            # Database endpoints
│   │   ├── tables/               # Table endpoints
│   │   ├── columns/              # Column endpoints
│   │   ├── records/              # Record endpoints
│   │   └── files/                # File endpoints
│   └── utils/
│       ├── validation.ts         # Input validation helpers
│       └── query-builder.ts      # JSONB query helpers
├── components/                   # Vue components
├── composables/                  # Vue composables
└── app.vue                       # Root component
```

## Database Patterns

### Import Database Connection
```typescript
import sql from '~/server/database/connection';
```

### Query Patterns
```typescript
// List with soft delete filter
const databases = await sql`
  SELECT * FROM databases 
  WHERE company_id = ${FIXED_COMPANY_ID}
    AND deleted_at IS NULL
  ORDER BY created_at DESC
`;

// Get single record
const [database] = await sql`
  SELECT * FROM databases 
  WHERE id = ${id} AND deleted_at IS NULL
`;

// Insert
const [database] = await sql`
  INSERT INTO databases (company_id, name, created_by)
  VALUES (${companyId}, ${name}, ${userId})
  RETURNING *
`;

// Update
const [database] = await sql`
  UPDATE databases 
  SET name = ${name}
  WHERE id = ${id}
  RETURNING *
`;

// Soft delete
await sql`
  UPDATE databases 
  SET deleted_at = NOW()
  WHERE id = ${id}
`;
```

### JSONB Query Patterns
```typescript
// Filter by text field
await sql`
  SELECT * FROM records 
  WHERE table_id = ${tableId}
    AND data->>'${columnId}' = ${value}
`;

// Filter by number (type cast required)
await sql`
  SELECT * FROM records 
  WHERE (data->>'${columnId}')::int > ${value}
`;

// Filter by date
await sql`
  SELECT * FROM records 
  WHERE (data->>'${columnId}')::date > ${date}
`;

// Sort by field
await sql`
  SELECT * FROM records 
  ORDER BY (data->>'${columnId}')::${type} ${order}
`;

// Check if link contains value
await sql`
  SELECT * FROM records 
  WHERE data->'${columnId}' @> ${JSON.stringify(recordId)}::jsonb
`;
```

## API Endpoint Patterns

### Nuxt Server Routes
Use Nuxt's file-based routing in `server/api/`:
- `server/api/databases/index.get.ts` → GET /api/databases
- `server/api/databases/index.post.ts` → POST /api/databases
- `server/api/databases/[id].get.ts` → GET /api/databases/:id
- `server/api/databases/[id].patch.ts` → PATCH /api/databases/:id
- `server/api/databases/[id].delete.ts` → DELETE /api/databases/:id

### Event Handler Pattern
```typescript
import sql from '~/server/database/connection';

export default defineEventHandler(async (event) => {
  // Get route params
  const id = getRouterParam(event, 'id');
  
  // Get query params
  const query = getQuery(event);
  
  // Get body
  const body = await readBody(event);
  
  // Validate
  if (!body.name) {
    throw createError({
      statusCode: 400,
      message: 'Name is required'
    });
  }
  
  // Query database
  const [result] = await sql`
    SELECT * FROM databases WHERE id = ${id}
  `;
  
  if (!result) {
    throw createError({
      statusCode: 404,
      message: 'Database not found'
    });
  }
  
  // Return response (Nuxt auto-converts to JSON)
  return { database: result };
});
```

### Error Handling
```typescript
// Use createError from h3
throw createError({
  statusCode: 400,
  message: 'Validation failed',
  data: { field: 'name', error: 'Required' }
});

// 404
throw createError({
  statusCode: 404,
  message: 'Resource not found'
});

// 500 (or let errors bubble up)
throw createError({
  statusCode: 500,
  message: 'Internal server error'
});
```

## Code Style

### TypeScript
- Use strict mode
- Define types for all database entities
- Use `Type` for unions, `Interface` for objects
- Import types from `~/server/types/database`

### Naming Conventions
- **Files**: kebab-case (e.g., `query-builder.ts`)
- **Variables**: camelCase (e.g., `databaseId`)
- **Types**: PascalCase (e.g., `Database`, `ColumnType`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `FIXED_COMPANY_ID`)
- **SQL tables**: snake_case (e.g., `deleted_at`)

### Constants
```typescript
export const FIXED_ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001';
export const FIXED_COMPANY_ID = '00000000-0000-0000-0000-000000000002';
```

### Validation
- Validate all inputs before database queries
- Check required fields
- Validate types (especially for column data)
- Return clear error messages

### Pagination
```typescript
const limit = Math.min(parseInt(query.limit) || 50, 100);
const offset = parseInt(query.offset) || 0;

const records = await sql`
  SELECT * FROM records
  LIMIT ${limit} OFFSET ${offset}
`;

return {
  records,
  pagination: {
    limit,
    offset,
    has_more: records.length === limit
  }
};
```

## JSONB Data Validation

### Validate Record Data Against Columns
```typescript
async function validateRecordData(tableId: string, data: Record<string, any>) {
  // Get column definitions
  const columns = await sql`
    SELECT * FROM columns WHERE table_id = ${tableId}
  `;
  
  for (const column of columns) {
    const value = data[column.id];
    
    // Check required constraint
    if (column.constraints?.required && !value) {
      throw new Error(`Field ${column.name} is required`);
    }
    
    // Type validation
    if (value !== undefined) {
      switch (column.type) {
        case 'text':
          if (typeof value !== 'string') {
            throw new Error(`Field ${column.name} must be a string`);
          }
          break;
        case 'number':
          if (typeof value !== 'number') {
            throw new Error(`Field ${column.name} must be a number`);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            throw new Error(`Field ${column.name} must be a boolean`);
          }
          break;
        // ... other types
      }
    }
  }
}
```

## Important Notes

### Do NOT:
- ❌ Use Prisma or any ORM
- ❌ Use tsx or ts-node (use .mjs for scripts)
- ❌ Implement authentication (POC simplification)
- ❌ Hard delete records (use soft delete)
- ❌ Change column types after creation (data migration complexity)
- ❌ Store sensitive data in plaintext (even in POC)

### Do:
- ✅ Use postgres.js with tagged templates
- ✅ Always filter by `deleted_at IS NULL`
- ✅ Use fixed user/company IDs for POC
- ✅ Validate JSONB data against column definitions
- ✅ Use proper TypeScript types
- ✅ Handle errors gracefully with proper HTTP codes
- ✅ Add indexes for frequently queried JSONB fields
- ✅ Use transactions for multi-step operations

## Migration Management

### Creating Migrations
1. Create SQL file in `server/database/migrations/`
2. Name format: `###_description.sql` (e.g., `006_add_view_table.sql`)
3. Use `CREATE TABLE IF NOT EXISTS`
4. Use `CREATE INDEX IF NOT EXISTS`

### Running Migrations
```bash
pnpm db:migrate
```

### Migration Script Location
- `server/database/migrate.mjs` (Node.js script, not Nuxt)

## Testing Queries

### PostgreSQL Client
```bash
# Connect to database
docker exec -it docpal-postgres psql -U docpal -d docpal

# Useful queries
SELECT * FROM migrations;
SELECT * FROM users;
SELECT * FROM databases WHERE deleted_at IS NULL;
SELECT id, data FROM records WHERE table_id = 'xxx';
```

## Performance Considerations

### JSONB Indexes
- Generic GIN index exists on `records.data`
- For frequently queried fields, add expression indexes:
```sql
CREATE INDEX idx_records_status 
ON records ((data->>'status_col_id'))
WHERE table_id = 'specific_table_id';
```

### Query Optimization
- Always filter by `table_id` first
- Use `deleted_at IS NULL` in WHERE clause
- Limit large result sets
- Use pagination for lists

## Documentation References

- **API Spec**: `docs/API-Reference.md`
- **Database Schema**: `docs/Database-Schema.md`
- **Column Types**: `docs/Column-Types.md`
- **Quick Start**: `docs/Quick-Start-Guide.md`
- **Task Tracking**: `docs/Task-Tracking.md`

## When Adding New Features

1. Check if it conflicts with POC simplifications
2. Update API Reference documentation
3. Add TypeScript types if needed
4. Create migration if database changes
5. Validate inputs thoroughly
6. Handle errors with proper HTTP codes
7. Test with various data types
8. Update Task Tracking checklist

## Common Pitfalls to Avoid

1. **Forgetting soft delete filter**: Always `WHERE deleted_at IS NULL`
2. **Missing type casts for JSONB**: Number/date queries need `::int`, `::date`
3. **Not validating column types**: Always validate before INSERT/UPDATE
4. **Forgetting pagination**: Large datasets will be slow
5. **Cascade deletes**: Remember ON DELETE CASCADE on foreign keys
6. **Column ID vs Name**: Records use column ID as key, not column name
7. **Link validation**: Verify linked records exist before saving

## Environment Variables

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=docpal
DB_USER=docpal
DB_PASSWORD=docpal_dev
```

## Useful Commands

```bash
# Development
pnpm dev                          # Start Nuxt dev server
pnpm db:migrate                   # Run migrations
pnpm db:reset                     # Reset database (Docker)

# Docker
docker-compose -f docker-compose.dev.yml up -d    # Start services
docker-compose -f docker-compose.dev.yml down     # Stop services
docker-compose -f docker-compose.dev.yml logs     # View logs
```

## Code Examples Reference

See `docs/API-Reference.md` for complete endpoint examples and request/response formats.

## Current Phase

**Phase 1.3-1.6**: Building API endpoints
- Next: Implement Database CRUD endpoints
- Then: Tables, Columns, Records endpoints
- Follow `docs/Task-Tracking.md` for progress

---

Remember: This is a POC. Keep it simple. Focus on core functionality. Optimize later.

