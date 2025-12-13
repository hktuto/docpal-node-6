# Database Schema

## Overview
The database uses PostgreSQL with JSONB for dynamic record storage. The schema consists of 7 core tables with proper indexes and foreign key constraints.

## Entity Relationship Diagram (Text)

```
users
  └─→ companies (owner_id)
       └─→ databases (company_id)
            └─→ tables (database_id)
                 ├─→ columns (table_id)
                 └─→ records (table_id)
                      └─→ data [JSONB] - dynamic fields

files (standalone for file uploads)
```

## Tables

### 1. `users`
Fixed admin user for POC (seeded with ID: `00000000-0000-0000-0000-000000000001`)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

**Fields:**
- `id` - UUID primary key
- `username` - Unique username
- `email` - Unique email
- `password_hash` - Bcrypt hashed password
- `created_at` - Creation timestamp

---

### 2. `companies`
Fixed company for POC (seeded with ID: `00000000-0000-0000-0000-000000000002`)

```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_companies_owner_id ON companies(owner_id);
```

**Fields:**
- `id` - UUID primary key
- `name` - Company name
- `owner_id` - Foreign key to users (company owner)
- `created_at` - Creation timestamp

---

### 3. `databases`
User-created databases (containers for tables)

```sql
CREATE TABLE databases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

-- Indexes
CREATE INDEX idx_databases_company_id ON databases(company_id);
CREATE INDEX idx_databases_deleted_at ON databases(deleted_at);
```

**Fields:**
- `id` - UUID primary key
- `company_id` - Foreign key to companies
- `name` - Database name
- `created_by` - User who created it
- `created_at` - Creation timestamp
- `deleted_at` - Soft delete timestamp (NULL = not deleted)

**Features:**
- ✅ Soft delete support
- ✅ Tenant scoping via company_id

---

### 4. `tables`
Tables within databases (Airtable-like tables)

```sql
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  metadata JSONB,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

-- Indexes
CREATE INDEX idx_tables_database_id ON tables(database_id);
CREATE INDEX idx_tables_deleted_at ON tables(deleted_at);
```

**Fields:**
- `id` - UUID primary key
- `database_id` - Foreign key to databases (CASCADE delete)
- `name` - Table name
- `metadata` - JSONB for table-level metadata (views, settings, etc.)
- `created_by` - User who created it
- `created_at` - Creation timestamp
- `deleted_at` - Soft delete timestamp

**Features:**
- ✅ Soft delete support
- ✅ Cascade deletes when database is deleted
- ✅ Metadata field for future extensibility

---

### 5. `columns`
Column definitions for tables (schema for dynamic records)

```sql
CREATE TABLE columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('text', 'number', 'boolean', 'date', 'file')),
  options JSONB,
  constraints JSONB,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_columns_table_id ON columns(table_id);
CREATE INDEX idx_columns_order ON columns(table_id, order_index);
CREATE UNIQUE INDEX idx_columns_table_name ON columns(table_id, name);
```

**Fields:**
- `id` - UUID primary key
- `table_id` - Foreign key to tables (CASCADE delete)
- `name` - Column name (unique per table)
- `type` - Column type: `text`, `number`, `boolean`, `date`, `file`
- `options` - JSONB for type-specific options (e.g., number precision, date format)
- `constraints` - JSONB for validation rules (e.g., required, unique, min/max)
- `order_index` - Display order (for column reordering)
- `created_at` - Creation timestamp

**Column Types:**
- `text` - String values
- `number` - Numeric values (integer/float)
- `boolean` - True/false
- `date` - Date/datetime values
- `file` - Reference to files table
- `link` - Reference to records in another table (relationships)

**Features:**
- ✅ Type constraints via CHECK
- ✅ Unique column names per table
- ✅ Ordered columns via order_index
- ✅ Extensible via options/constraints JSONB

**Example Options/Constraints:**
```json
// options for 'number' type
{
  "precision": 2,
  "format": "currency"
}

// options for 'link' type (table relationships)
{
  "linked_table_id": "uuid-of-target-table",
  "allow_multiple": true,
  "display_field": "col_uuid"
}

// constraints
{
  "required": true,
  "min": 0,
  "max": 100,
  "unique": true
}
```

---

### 6. `records`
**The core table** - stores dynamic data as JSONB

```sql
CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

-- Indexes
CREATE INDEX idx_records_table_id ON records(table_id);
CREATE INDEX idx_records_deleted_at ON records(deleted_at);
CREATE INDEX idx_records_created_at ON records(created_at);
CREATE INDEX idx_records_updated_at ON records(updated_at);
CREATE INDEX idx_records_data_gin ON records USING GIN(data);
CREATE INDEX idx_records_table_not_deleted ON records(table_id, deleted_at);
```

**Fields:**
- `id` - UUID primary key
- `table_id` - Foreign key to tables (CASCADE delete)
- `data` - **JSONB** - Dynamic record data (key = column_id, value = field value)
- `created_by` - User who created the record
- `updated_by` - User who last updated the record
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp
- `deleted_at` - Soft delete timestamp

**Data Structure:**
```json
{
  "col_uuid_1": "John Doe",
  "col_uuid_2": 25,
  "col_uuid_3": true,
  "col_uuid_4": "2025-12-12T00:00:00Z",
  "col_uuid_5": "file_uuid_xyz",
  "col_uuid_6": "linked_record_uuid",
  "col_uuid_7": ["linked_record_1", "linked_record_2"]
}
```

**Features:**
- ✅ **GIN index** on data for fast JSONB queries
- ✅ Soft delete support
- ✅ Audit fields (created_by, updated_by)
- ✅ Composite index for common queries
- ✅ Flexible schema (each table can have different fields)

**Query Examples:**
```sql
-- Filter by text field
SELECT * FROM records 
WHERE data->>'col_name' = 'John';

-- Filter by number (greater than)
SELECT * FROM records 
WHERE (data->>'col_age')::int > 18;

-- Sort by date
SELECT * FROM records 
ORDER BY (data->>'col_created')::date DESC;

-- Complex query
SELECT * FROM records 
WHERE table_id = 'xxx'
  AND (data->>'status')::text = 'active'
  AND (data->>'priority')::int > 5
  AND deleted_at IS NULL
ORDER BY (data->>'created_date')::date DESC;
```

---

### 7. `files`
File metadata (actual files stored in MinIO)

```sql
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket VARCHAR(255) NOT NULL,
  key VARCHAR(255) NOT NULL,
  size BIGINT NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  checksum VARCHAR(255),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_files_created_by ON files(created_by);
CREATE INDEX idx_files_bucket_key ON files(bucket, key);
```

**Fields:**
- `id` - UUID primary key (referenced in records.data for file columns)
- `bucket` - MinIO bucket name
- `key` - MinIO object key (file path)
- `size` - File size in bytes
- `mime_type` - MIME type (e.g., image/png, application/pdf)
- `checksum` - File checksum (for integrity verification)
- `created_by` - User who uploaded the file
- `created_at` - Upload timestamp

**Features:**
- ✅ Stores metadata only (files in MinIO)
- ✅ Composite index on bucket+key
- ✅ File integrity via checksum

---

## Index Summary

### Performance Indexes
- **GIN index on records.data** - Fast JSONB queries
- **Composite indexes** - Optimized for common query patterns
- **Foreign key indexes** - Fast joins and lookups

### Query Optimization
- All foreign keys have indexes
- Soft delete queries optimized with deleted_at indexes
- JSONB queries optimized with GIN index

## Key Design Decisions

### 1. **JSONB for Dynamic Data**
- Each table can have different columns
- No schema migration needed when adding columns
- Fast queries with proper indexes

### 2. **Soft Delete**
- Databases, tables, and records use `deleted_at`
- Easy recovery
- Audit trail preserved

### 3. **UUID Primary Keys**
- Globally unique
- Safe for distributed systems
- No auto-increment conflicts

### 4. **Cascade Deletes**
- Deleting a database removes all tables
- Deleting a table removes all columns and records
- Data integrity maintained

### 5. **Audit Trail**
- All records track created_by and updated_by
- Timestamps on all entities
- Can add audit log table later

## Storage Estimates

For 10,000 records with 10 columns each:
- **records table**: ~5-10 MB (depending on data)
- **columns table**: ~100 KB
- **indexes**: ~2-5 MB
- **Total**: ~10-15 MB

JSONB is efficient - approximately 1-2 KB per record with 10 fields.

## Next Steps

1. Run migrations to create schema
2. Seed admin user and company
3. Build API endpoints
4. Add expression indexes for frequently queried fields (as needed)

