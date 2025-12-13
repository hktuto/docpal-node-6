-- Create columns table
CREATE TABLE IF NOT EXISTS columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('text', 'number', 'boolean', 'date', 'file', 'link')),
  options JSONB,
  constraints JSONB,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_columns_table_id ON columns(table_id);
CREATE INDEX IF NOT EXISTS idx_columns_order ON columns(table_id, order_index);

-- Unique constraint on table_id + name
CREATE UNIQUE INDEX IF NOT EXISTS idx_columns_table_name ON columns(table_id, name) WHERE name IS NOT NULL;

