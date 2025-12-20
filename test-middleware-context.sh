#!/bin/bash

set -e

BASE_URL="http://localhost:3000"
COMPANY_ID="00000000-0000-0000-0000-000000000001"

echo "🧪 Testing Middleware Context System..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to check if value exists in JSON
check_field() {
  local json=$1
  local field=$2
  local expected=$3
  local actual=$(echo "$json" | jq -r "$field")
  
  if [ "$actual" == "$expected" ]; then
    echo -e "${GREEN}✓${NC} Field '$field' = '$expected'"
    ((TESTS_PASSED++))
    return 0
  else
    echo -e "${RED}✗${NC} Field '$field' expected '$expected', got '$actual'"
    ((TESTS_FAILED++))
    return 1
  fi
}

echo "═══════════════════════════════════════════════════════════"
echo "Test 1: Company Context - Cookie"
echo "═══════════════════════════════════════════════════════════"
echo "Testing: GET /api/apps with company cookie"
echo ""

RESPONSE=$(curl -s "$BASE_URL/api/apps" \
  -H "Cookie: active_company_id=$COMPANY_ID")

# Check if response is array
if echo "$RESPONSE" | jq -e '. | type == "array"' > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Response is an array (scoped to company)"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗${NC} Response is not an array"
  echo "Response: $RESPONSE"
  ((TESTS_FAILED++))
fi

# Check that all apps have the correct companyId
APP_COUNT=$(echo "$RESPONSE" | jq 'length')
if [ "$APP_COUNT" -gt 0 ]; then
  WRONG_COMPANY_COUNT=$(echo "$RESPONSE" | jq "[.[] | select(.companyId != \"$COMPANY_ID\")] | length")
  if [ "$WRONG_COMPANY_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✓${NC} All $APP_COUNT apps belong to company $COMPANY_ID"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗${NC} Found $WRONG_COMPANY_COUNT apps from wrong company"
    ((TESTS_FAILED++))
  fi
fi

echo ""

echo "═══════════════════════════════════════════════════════════"
echo "Test 2: Company Context - Header Fallback"
echo "═══════════════════════════════════════════════════════════"
echo "Testing: GET /api/apps with X-Company-Id header"
echo ""

RESPONSE=$(curl -s "$BASE_URL/api/apps" \
  -H "X-Company-Id: $COMPANY_ID")

if echo "$RESPONSE" | jq -e '. | type == "array"' > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Header fallback works - response is array"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗${NC} Header fallback failed"
  echo "Response: $RESPONSE"
  ((TESTS_FAILED++))
fi

echo ""

echo "═══════════════════════════════════════════════════════════"
echo "Test 3: Create App with Company Context"
echo "═══════════════════════════════════════════════════════════"
echo "Testing: POST /api/apps (should use company from cookie)"
echo ""

APP_NAME="Test App $(date +%s)"
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/apps" \
  -H "Content-Type: application/json" \
  -H "Cookie: active_company_id=$COMPANY_ID" \
  -d "{\"name\": \"$APP_NAME\", \"description\": \"Test app for middleware\"}")

APP_SLUG=$(echo "$CREATE_RESPONSE" | jq -r '.slug')
APP_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id')

if [ "$APP_ID" != "null" ] && [ -n "$APP_ID" ]; then
  echo -e "${GREEN}✓${NC} App created: $APP_SLUG"
  ((TESTS_PASSED++))
  check_field "$CREATE_RESPONSE" '.companyId' "$COMPANY_ID"
else
  echo -e "${RED}✗${NC} Failed to create app"
  echo "Response: $CREATE_RESPONSE"
  ((TESTS_FAILED++))
fi

echo ""

echo "═══════════════════════════════════════════════════════════"
echo "Test 4: App Context - GET Single App"
echo "═══════════════════════════════════════════════════════════"
echo "Testing: GET /api/apps/$APP_SLUG (middleware should load app)"
echo ""

if [ -n "$APP_SLUG" ] && [ "$APP_SLUG" != "null" ]; then
  GET_APP_RESPONSE=$(curl -s "$BASE_URL/api/apps/$APP_SLUG" \
    -H "Cookie: active_company_id=$COMPANY_ID")
  
  check_field "$GET_APP_RESPONSE" '.slug' "$APP_SLUG"
  check_field "$GET_APP_RESPONSE" '.companyId' "$COMPANY_ID"
  check_field "$GET_APP_RESPONSE" '.name' "$APP_NAME"
else
  echo -e "${YELLOW}⊘${NC} Skipping - no app to test"
fi

echo ""

echo "═══════════════════════════════════════════════════════════"
echo "Test 5: App Context - UPDATE App"
echo "═══════════════════════════════════════════════════════════"
echo "Testing: PUT /api/apps/$APP_SLUG (middleware should provide app)"
echo ""

if [ -n "$APP_SLUG" ] && [ "$APP_SLUG" != "null" ]; then
  UPDATED_NAME="Updated $APP_NAME"
  UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/apps/$APP_SLUG" \
    -H "Content-Type: application/json" \
    -H "Cookie: active_company_id=$COMPANY_ID" \
    -d "{\"name\": \"$UPDATED_NAME\"}")
  
  check_field "$UPDATE_RESPONSE" '.name' "$UPDATED_NAME"
  check_field "$UPDATE_RESPONSE" '.slug' "$APP_SLUG"
else
  echo -e "${YELLOW}⊘${NC} Skipping - no app to test"
fi

echo ""

echo "═══════════════════════════════════════════════════════════"
echo "Test 6: App Context - List Tables in App"
echo "═══════════════════════════════════════════════════════════"
echo "Testing: GET /api/apps/$APP_SLUG/tables (middleware should provide app)"
echo ""

if [ -n "$APP_SLUG" ] && [ "$APP_SLUG" != "null" ]; then
  TABLES_RESPONSE=$(curl -s "$BASE_URL/api/apps/$APP_SLUG/tables" \
    -H "Cookie: active_company_id=$COMPANY_ID")
  
  if echo "$TABLES_RESPONSE" | jq -e '.tables | type == "array"' > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Tables endpoint accessible (app context working)"
    ((TESTS_PASSED++))
    TABLE_COUNT=$(echo "$TABLES_RESPONSE" | jq '.tables | length')
    echo "  Found $TABLE_COUNT tables in app"
  else
    echo -e "${RED}✗${NC} Tables endpoint failed"
    echo "Response: $TABLES_RESPONSE"
    ((TESTS_FAILED++))
  fi
else
  echo -e "${YELLOW}⊘${NC} Skipping - no app to test"
fi

echo ""

echo "═══════════════════════════════════════════════════════════"
echo "Test 7: Multi-Tenancy - Wrong Company"
echo "═══════════════════════════════════════════════════════════"
echo "Testing: Access app with different company ID (should fail)"
echo ""

if [ -n "$APP_SLUG" ] && [ "$APP_SLUG" != "null" ]; then
  WRONG_COMPANY_ID="99999999-9999-9999-9999-999999999999"
  ERROR_RESPONSE=$(curl -s "$BASE_URL/api/apps/$APP_SLUG" \
    -H "Cookie: active_company_id=$WRONG_COMPANY_ID" 2>&1)
  
  # Should return 404 because app doesn't exist in that company
  if echo "$ERROR_RESPONSE" | grep -q "404\|not found\|Company not found"; then
    echo -e "${GREEN}✓${NC} Correctly rejected access from wrong company"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗${NC} Security issue: App accessible from wrong company!"
    echo "Response: $ERROR_RESPONSE"
    ((TESTS_FAILED++))
  fi
else
  echo -e "${YELLOW}⊘${NC} Skipping - no app to test"
fi

echo ""

echo "═══════════════════════════════════════════════════════════"
echo "Test 8: Missing Company Context"
echo "═══════════════════════════════════════════════════════════"
echo "Testing: Request without company cookie/header (should use dummy)"
echo ""

NO_COOKIE_RESPONSE=$(curl -s "$BASE_URL/api/apps")

if echo "$NO_COOKIE_RESPONSE" | jq -e '. | type == "array"' > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Middleware provides default company when cookie missing"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗${NC} Request failed without company context"
  echo "Response: $NO_COOKIE_RESPONSE"
  ((TESTS_FAILED++))
fi

echo ""

echo "═══════════════════════════════════════════════════════════"
echo "Test 9: App Context - DELETE App"
echo "═══════════════════════════════════════════════════════════"
echo "Testing: DELETE /api/apps/$APP_SLUG (cleanup)"
echo ""

if [ -n "$APP_SLUG" ] && [ "$APP_SLUG" != "null" ]; then
  DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/apps/$APP_SLUG" \
    -H "Cookie: active_company_id=$COMPANY_ID")
  
  if echo "$DELETE_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} App deleted successfully"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗${NC} Failed to delete app"
    echo "Response: $DELETE_RESPONSE"
    ((TESTS_FAILED++))
  fi
else
  echo -e "${YELLOW}⊘${NC} Skipping - no app to delete"
fi

echo ""

echo "═══════════════════════════════════════════════════════════"
echo "Test Results"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All middleware context tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed. Check middleware configuration.${NC}"
  exit 1
fi

