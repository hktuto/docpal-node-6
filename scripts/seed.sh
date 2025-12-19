#!/bin/bash

# Seed script to create initial user and company data
# This script calls the seed API endpoint

BASE_URL="${NUXT_PUBLIC_BASE_URL:-http://localhost:3000}"
SEED_URL="${BASE_URL}/api/seed"

echo "🌱 Starting seed process..."
echo "📡 Calling: ${SEED_URL}"

response=$(curl -s -w "\n%{http_code}" -X POST "${SEED_URL}" \
  -H "Content-Type: application/json")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
  echo "✅ Seed completed successfully!"
  echo "📊 Seed data:"
  echo "$body" | jq '.' 2>/dev/null || echo "$body"
  exit 0
else
  echo "❌ Seed failed with HTTP $http_code"
  echo "Error: $body"
  echo ""
  echo "💡 Make sure:"
  echo "   1. Docker containers are running (pnpm docker:up)"
  echo "   2. Database migrations are applied (pnpm db:migrate)"
  echo "   3. Dev server is running (pnpm dev)"
  exit 1
fi

