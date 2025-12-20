#!/bin/bash

# Test script for dynamic table creation
echo "🧪 Testing Dynamic Table Creation"
echo "=================================="
echo ""

# First, get the app slug (assuming we have one from previous setup)
APP_SLUG="crm"

# Test 1: Create a dynamic table with basic columns
echo "📋 Test 1: Creating a 'contacts' table..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/apps/$APP_SLUG/tables \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Contacts",
    "description": "Customer contact information",
    "columns": [
      {
        "id": "col_1",
        "name": "first_name",
        "label": "First Name",
        "type": "text",
        "required": true,
        "order": 0,
        "config": {
          "placeholder": "Enter first name",
          "maxLength": 100
        }
      },
      {
        "id": "col_2",
        "name": "last_name",
        "label": "Last Name",
        "type": "text",
        "required": true,
        "order": 1,
        "config": {
          "placeholder": "Enter last name",
          "maxLength": 100
        }
      },
      {
        "id": "col_3",
        "name": "email",
        "label": "Email",
        "type": "text",
        "required": false,
        "order": 2,
        "config": {
          "placeholder": "email@example.com"
        }
      },
      {
        "id": "col_4",
        "name": "age",
        "label": "Age",
        "type": "number",
        "required": false,
        "order": 3,
        "config": {
          "min": 0,
          "max": 150
        }
      },
      {
        "id": "col_5",
        "name": "birth_date",
        "label": "Birth Date",
        "type": "date",
        "required": false,
        "order": 4,
        "config": {
          "format": "date"
        }
      },
      {
        "id": "col_6",
        "name": "last_contacted",
        "label": "Last Contacted",
        "type": "date",
        "required": false,
        "order": 5,
        "config": {
          "format": "datetime"
        }
      },
      {
        "id": "col_7",
        "name": "is_active",
        "label": "Active",
        "type": "switch",
        "required": false,
        "order": 6,
        "config": {
          "defaultValue": true
        }
      }
    ]
  }')

echo "$RESPONSE" | jq '.'
echo ""

# Extract table slug from response
TABLE_SLUG=$(echo "$RESPONSE" | jq -r '.table.slug')

if [ "$TABLE_SLUG" != "null" ] && [ -n "$TABLE_SLUG" ]; then
  echo "✅ Table created with slug: $TABLE_SLUG"
  echo ""
  
  # Test 2: Get the table details
  echo "📋 Test 2: Fetching table details..."
  curl -s http://localhost:3000/api/apps/$APP_SLUG/tables/$TABLE_SLUG | jq '.'
  echo ""
  
  # Test 3: List all tables in the app
  echo "📋 Test 3: Listing all tables in app..."
  curl -s http://localhost:3000/api/apps/$APP_SLUG/tables | jq '.'
  echo ""
  
  echo "✅ All tests completed!"
else
  echo "❌ Failed to create table"
  echo "$RESPONSE"
fi

