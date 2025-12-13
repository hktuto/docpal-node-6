#!/bin/bash

# Test Auth Endpoints
# Run this after starting the dev server

BASE_URL="http://localhost:3000"

echo "🧪 Testing Mock Auth Endpoints"
echo "================================"

echo ""
echo "1️⃣ Testing Login (POST /api/auth/login)"
echo "----------------------------------------"
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' \
  -w "\nStatus: %{http_code}\n\n"

echo ""
echo "2️⃣ Testing Get Current User (GET /api/auth/me)"
echo "-----------------------------------------------"
curl -X GET "$BASE_URL/api/auth/me" \
  -w "\nStatus: %{http_code}\n\n"

echo ""
echo "3️⃣ Testing Logout (POST /api/auth/logout)"
echo "------------------------------------------"
curl -X POST "$BASE_URL/api/auth/logout" \
  -w "\nStatus: %{http_code}\n\n"

echo ""
echo "✅ Auth endpoint tests complete!"

