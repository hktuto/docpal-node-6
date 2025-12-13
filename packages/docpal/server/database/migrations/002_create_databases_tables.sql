-- Create databases table
CREATE TABLE IF NOT EXISTS databases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

-- Create tables table (yes, table of tables!)
CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  metadata JSONB,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_databases_company_id ON databases(company_id);
CREATE INDEX IF NOT EXISTS idx_databases_deleted_at ON databases(deleted_at);
CREATE INDEX IF NOT EXISTS idx_tables_database_id ON tables(database_id);
CREATE INDEX IF NOT EXISTS idx_tables_deleted_at ON tables(deleted_at);

