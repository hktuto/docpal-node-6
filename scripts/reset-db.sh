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
echo "Step 1: Dropping database..."
pnpm db:drop --confirm

echo ""
echo "Step 2: Running migrations..."
pnpm db:migrate

echo ""
echo "Step 3: Seeding database..."
sleep 2  # Wait for server to be ready

# Call the seed endpoint
echo "Calling seed endpoint..."
response=$(curl -s -X POST http://localhost:3000/api/seed)

# Check if successful
if echo "$response" | grep -q '"success":true'; then
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

