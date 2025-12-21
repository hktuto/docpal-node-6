#!/bin/bash

# Database Reset Script
# This script will drop all tables and reseed the database

set -e

echo "🗑️  Database Reset Script"
echo "========================"
echo ""
echo "⚠️  WARNING: This will delete ALL data in your database!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted."
    exit 1
fi

echo ""
echo "Step 1: Dropping all tables..."
# Try using the API endpoint first (requires dev server to be running)
# If that fails, fall back to direct SQL using psql
if curl -s -f -X POST http://localhost:3000/api/db-reset > /dev/null 2>&1; then
    echo "✅ Tables dropped via API endpoint"
else
    echo "⚠️  API endpoint not available, using direct SQL connection..."
    # Use psql directly with a here-doc to avoid bash quoting issues
    # Get connection string from environment or docker
    DB_URL="${NUXT_HUB_DATABASE_URL:-${DATABASE_URL:-postgresql://docpal:docpal@localhost:5432/docpal}}"
    psql "$DB_URL" <<'PSQL'
DO $drop_tables$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
    ) LOOP 
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $drop_tables$;
PSQL
fi

echo ""
echo "Step 2: Running migrations..."
if ! pnpm db:migrate; then
    echo "❌ Migration failed. Please check the error above."
    exit 1
fi

# Verify that migrations created the users table
echo "Verifying migrations..."
if ! pnpm db:sql "SELECT 1 FROM users LIMIT 1" > /dev/null 2>&1; then
    echo "❌ Migrations did not create required tables. Please check migration status."
    exit 1
fi
echo "✅ Migrations verified - tables exist"

echo ""
echo "Step 3: Seeding database..."
sleep 2  # Wait for server to be ready

# Call the seed endpoint
echo "Calling seed endpoint..."
response=$(curl -s -X POST http://localhost:3000/api/seed)

# Check if successful (account for optional whitespace in JSON)
if echo "$response" | grep -qE '"success"\s*:\s*true'; then
    echo "✅ Database reset and seeded successfully!"
    echo ""
    echo "📝 Login Credentials:"
    echo "   Email: admin@docpal.dev"
    echo "   Password: admin123"
    echo "   Company: Acme Corporation"
    echo ""
    echo "🌐 Login at: http://localhost:3000/auth/login"
else
    echo "❌ Seed failed. Response:"
    echo "$response"
    echo ""
    echo "Please make sure your dev server is running:"
    echo "  pnpm dev"
    exit 1
fi

