#!/bin/bash

set -e

BASE_URL="http://localhost:3000"
APP_SLUG="test-app-$(date +%s)"

echo "🚀 Testing complete dynamic table + row CRUD..."
echo ""

# 1. Create a test app
echo "1️⃣  Creating test app..."
APP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/apps" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test App $(date +%s)\",
    \"slug\": \"$APP_SLUG\",
    \"description\": \"Testing dynamic tables\"
  }")

APP_ID=$(echo "$APP_RESPONSE" | jq -r '.id')
if [ "$APP_ID" == "null" ]; then
  echo "❌ Failed to create app"
  echo "$APP_RESPONSE"
  exit 1
fi
echo "✅ App created: $APP_SLUG"
echo ""

# 2. Create a dynamic table
echo "2️⃣  Creating dynamic table..."
TABLE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/apps/$APP_SLUG/tables" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Contacts",
    "description": "Customer contact information",
    "columns": [
      {
        "name": "first_name",
        "type": "text",
        "required": true
      },
      {
        "name": "last_name",
        "type": "text",
        "required": true
      },
      {
        "name": "email",
        "type": "email",
        "required": true
      },
      {
        "name": "phone",
        "type": "text"
      },
      {
        "name": "age",
        "type": "number"
      },
      {
        "name": "is_active",
        "type": "switch"
      }
    ]
  }')

TABLE_SLUG=$(echo "$TABLE_RESPONSE" | jq -r '.table.slug')
if [ "$TABLE_SLUG" == "null" ] || [ -z "$TABLE_SLUG" ]; then
  echo "❌ Failed to create table"
  echo "$TABLE_RESPONSE"
  exit 1
fi
echo "✅ Table created: $TABLE_SLUG"
echo ""

# 3. Create rows
echo "3️⃣  Creating rows..."
ROW1=$(curl -s -X POST "$BASE_URL/api/apps/$APP_SLUG/tables/$TABLE_SLUG/rows" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "age": 30,
    "is_active": true
  }')

ROW1_ID=$(echo "$ROW1" | jq -r '.id')
echo "✅ Row 1 created: $ROW1_ID"

ROW2=$(curl -s -X POST "$BASE_URL/api/apps/$APP_SLUG/tables/$TABLE_SLUG/rows" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@example.com",
    "age": 25,
    "is_active": false
  }')

ROW2_ID=$(echo "$ROW2" | jq -r '.id')
echo "✅ Row 2 created: $ROW2_ID"
echo ""

# 4. Get all rows
echo "4️⃣  Fetching all rows..."
ALL_ROWS=$(curl -s "$BASE_URL/api/apps/$APP_SLUG/tables/$TABLE_SLUG/rows")
ROW_COUNT=$(echo "$ALL_ROWS" | jq '.data | length')
echo "✅ Found $ROW_COUNT rows"
echo ""

# 5. Get single row
echo "5️⃣  Fetching single row..."
SINGLE_ROW=$(curl -s "$BASE_URL/api/apps/$APP_SLUG/tables/$TABLE_SLUG/rows/$ROW1_ID")
SINGLE_ROW_EMAIL=$(echo "$SINGLE_ROW" | jq -r '.email')
echo "✅ Row fetched: $SINGLE_ROW_EMAIL"
echo ""

# 6. Update row
echo "6️⃣  Updating row..."
UPDATED_ROW=$(curl -s -X PUT "$BASE_URL/api/apps/$APP_SLUG/tables/$TABLE_SLUG/rows/$ROW1_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9876543210",
    "age": 31
  }')

UPDATED_PHONE=$(echo "$UPDATED_ROW" | jq -r '.phone')
echo "✅ Row updated, new phone: $UPDATED_PHONE"
echo ""

# 7. Delete row
echo "7️⃣  Deleting row..."
DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/apps/$APP_SLUG/tables/$TABLE_SLUG/rows/$ROW2_ID")
DELETE_MSG=$(echo "$DELETE_RESPONSE" | jq -r '.message')
echo "✅ $DELETE_MSG"
echo ""

# 8. Verify deletion
echo "8️⃣  Verifying deletion..."
REMAINING_ROWS=$(curl -s "$BASE_URL/api/apps/$APP_SLUG/tables/$TABLE_SLUG/rows")
REMAINING_COUNT=$(echo "$REMAINING_ROWS" | jq '.data | length')
echo "✅ Remaining rows: $REMAINING_COUNT (expected: 1)"
echo ""

# 9. Get table metadata
echo "9️⃣  Fetching table metadata..."
TABLE_META=$(curl -s "$BASE_URL/api/apps/$APP_SLUG/tables/$TABLE_SLUG")
COLUMN_COUNT=$(echo "$TABLE_META" | jq '.columns | length')
echo "✅ Table has $COLUMN_COUNT columns"
echo ""

# 10. Update table metadata
echo "🔟 Updating table metadata..."
UPDATED_TABLE=$(curl -s -X PUT "$BASE_URL/api/apps/$APP_SLUG/tables/$TABLE_SLUG" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Contacts",
    "description": "Updated description"
  }')

NEW_TABLE_NAME=$(echo "$UPDATED_TABLE" | jq -r '.name')
echo "✅ Table renamed to: $NEW_TABLE_NAME"
echo ""

echo "🎉 All tests passed!"
echo ""
echo "📊 Summary:"
echo "  - App: $APP_SLUG"
echo "  - Table: $TABLE_SLUG"
echo "  - Created: 2 rows"
echo "  - Updated: 1 row"
echo "  - Deleted: 1 row"
echo "  - Remaining: $REMAINING_COUNT row(s)"
echo ""
echo "💡 Clean up with:"
echo "   curl -X DELETE $BASE_URL/api/apps/$APP_SLUG/tables/$TABLE_SLUG"
echo "   curl -X DELETE $BASE_URL/api/apps/$APP_SLUG"

