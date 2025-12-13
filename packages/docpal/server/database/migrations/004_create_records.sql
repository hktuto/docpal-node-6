-- Create records table (the dynamic data storage)
CREATE TABLE IF NOT EXISTS records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_records_table_id ON records(table_id);
CREATE INDEX IF NOT EXISTS idx_records_deleted_at ON records(deleted_at);
CREATE INDEX IF NOT EXISTS idx_records_created_at ON records(created_at);
CREATE INDEX IF NOT EXISTS idx_records_updated_at ON records(updated_at);

-- GIN index for JSONB data (enables fast JSONB queries)
CREATE INDEX IF NOT EXISTS idx_records_data_gin ON records USING GIN(data);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_records_table_not_deleted ON records(table_id, deleted_at);

