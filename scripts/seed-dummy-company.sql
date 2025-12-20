-- Seed dummy company for Phase 1 development
-- This company is used when no real authentication exists

INSERT INTO companies (id, name, slug, description, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Company',
  'demo-company',
  'Default company for Phase 1 development',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT id, name, slug FROM companies WHERE id = '00000000-0000-0000-0000-000000000001';

