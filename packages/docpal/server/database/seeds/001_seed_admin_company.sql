-- Seed fixed admin user
-- Password: 'admin123' (bcrypt hash - you should generate a proper one)
INSERT INTO users (id, username, email, password_hash, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin',
  'admin@docpal.local',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- bcrypt hash of 'admin123'
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Seed fixed company
INSERT INTO companies (id, name, owner_id, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Default Company',
  '00000000-0000-0000-0000-000000000001',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

