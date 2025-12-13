-- Create views table (unified architecture - every view is a dashboard with widgets)
CREATE TABLE IF NOT EXISTS views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  config JSONB NOT NULL DEFAULT '{"widgets": []}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_views_table_id ON views(table_id);
CREATE INDEX IF NOT EXISTS idx_views_deleted_at ON views(deleted_at);
CREATE INDEX IF NOT EXISTS idx_views_table_not_deleted ON views(table_id, deleted_at);

-- Index for default view lookup
CREATE INDEX IF NOT EXISTS idx_views_default ON views(table_id, is_default) WHERE is_default = true;

-- Comments
COMMENT ON TABLE views IS 'Views are dashboards with widgets - mix table, kanban, charts, metrics in one view';
COMMENT ON COLUMN views.config IS 'View configuration with widgets array - each widget can be table, kanban, calendar, chart, etc.';
COMMENT ON COLUMN views.is_default IS 'Whether this is the default view for the table';

