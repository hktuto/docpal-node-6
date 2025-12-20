#!/bin/bash

# Test script for AI column type suggestion API
# This tests both the fallback mode (no AI) and AI mode (if configured)

echo "==================================="
echo "AI Column Type Suggestion API Test"
echo "==================================="
echo ""

# Check if server is running
SERVER_URL=${1:-http://localhost:3000}
echo "Testing server at: $SERVER_URL"
echo ""

# Test 1: Email field
echo "Test 1: Email field"
curl -s -X POST "$SERVER_URL/api/ai/suggest-column-type" \
  -H "Content-Type: application/json" \
  -d '{
    "columnName": "email",
    "columnLabel": "Email Address",
    "appSlug": "test-app"
  }' | jq '.'
echo ""

# Test 2: Description field
echo "Test 2: Description field"
curl -s -X POST "$SERVER_URL/api/ai/suggest-column-type" \
  -H "Content-Type: application/json" \
  -d '{
    "columnName": "description",
    "columnLabel": "Product Description",
    "tableDescription": "Product catalog",
    "appSlug": "test-app"
  }' | jq '.'
echo ""

# Test 3: Is Active (boolean)
echo "Test 3: Is Active field"
curl -s -X POST "$SERVER_URL/api/ai/suggest-column-type" \
  -H "Content-Type: application/json" \
  -d '{
    "columnName": "is_active",
    "columnLabel": "Active Status",
    "appSlug": "test-app"
  }' | jq '.'
echo ""

# Test 4: Price (number)
echo "Test 4: Price field"
curl -s -X POST "$SERVER_URL/api/ai/suggest-column-type" \
  -H "Content-Type: application/json" \
  -d '{
    "columnName": "price",
    "columnLabel": "Product Price",
    "appSlug": "test-app"
  }' | jq '.'
echo ""

# Test 5: Created At (date)
echo "Test 5: Created At field"
curl -s -X POST "$SERVER_URL/api/ai/suggest-column-type" \
  -H "Content-Type: application/json" \
  -d '{
    "columnName": "created_at",
    "columnLabel": "Creation Date",
    "appSlug": "test-app"
  }' | jq '.'
echo ""

# Test 6: Missing column name (should fail)
echo "Test 6: Missing column name (error test)"
curl -s -X POST "$SERVER_URL/api/ai/suggest-column-type" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.'
echo ""

echo "==================================="
echo "Test completed!"
echo ""
echo "Response format (NEW):"
echo "  - suggestedColumn: Full column config object"
echo "    - name, label, type, required, config"
echo "  - confidence: high/medium/low"
echo "  - reason: Why this suggestion was made"
echo "  - aiEnabled: true (AI) or false (pattern matching)"
echo ""
echo "Note: If OLLAMA_BASE_URL is not configured,"
echo "the API will use fallback pattern matching."
echo "==================================="
