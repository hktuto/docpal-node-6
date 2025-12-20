# Testing Middleware Context System

## Overview

The `test-middleware-context.sh` script verifies that our server middleware is correctly setting company and app context for all API requests.

## What It Tests

### 1. **Company Context (via Cookie)**
- ✓ Middleware reads `active_company_id` from cookie
- ✓ All apps returned are scoped to the company
- ✓ Created resources use company from context

### 2. **Company Context (via Header)**
- ✓ Middleware falls back to `X-Company-Id` header
- ✓ Header works when cookie not present

### 3. **App Context Loading**
- ✓ Middleware loads app by slug on app routes
- ✓ App is scoped to current company
- ✓ App context available in all nested routes

### 4. **Multi-Tenancy Security**
- ✓ Apps not accessible from wrong company
- ✓ Company isolation is enforced

### 5. **CRUD Operations with Context**
- ✓ GET /api/apps/:slug
- ✓ PUT /api/apps/:slug
- ✓ DELETE /api/apps/:slug
- ✓ GET /api/apps/:slug/tables

## Prerequisites

1. **Dev server must be running:**
   ```bash
   pnpm dev
   ```

2. **Database must be initialized:**
   ```bash
   pnpm setup
   ```

3. **Dummy company must exist in DB:**
   ```sql
   -- Should already exist from migrations
   -- ID: 00000000-0000-0000-0000-000000000001
   ```

## Running the Test

```bash
# Make executable (first time only)
chmod +x test-middleware-context.sh

# Run the test
./test-middleware-context.sh
```

## Expected Output

```
🧪 Testing Middleware Context System...

═══════════════════════════════════════════════════════════
Test 1: Company Context - Cookie
═══════════════════════════════════════════════════════════
Testing: GET /api/apps with company cookie

✓ Response is an array (scoped to company)
✓ All 3 apps belong to company 00000000-0000-0000-0000-000000000001

═══════════════════════════════════════════════════════════
Test 2: Company Context - Header Fallback
═══════════════════════════════════════════════════════════
Testing: GET /api/apps with X-Company-Id header

✓ Header fallback works - response is array

═══════════════════════════════════════════════════════════
Test 3: Create App with Company Context
═══════════════════════════════════════════════════════════
Testing: POST /api/apps (should use company from cookie)

✓ App created: test-app-1734660234
✓ Field '.companyId' = '00000000-0000-0000-0000-000000000001'

... (more tests)

═══════════════════════════════════════════════════════════
Test Results
═══════════════════════════════════════════════════════════

Tests Passed: 15
Tests Failed: 0

🎉 All middleware context tests passed!
```

## Test Breakdown

| Test | What It Checks | Why It Matters |
|------|----------------|----------------|
| 1. Company Cookie | Middleware reads cookie | Main auth method (Phase 1) |
| 2. Header Fallback | X-Company-Id header works | For testing/APIs |
| 3. Create App | POST uses company context | Resources scoped correctly |
| 4. Get App | App loaded by middleware | Reduces boilerplate |
| 5. Update App | PUT uses app context | Middleware provides data |
| 6. List Tables | Nested routes work | App context propagates |
| 7. Wrong Company | Access denied | Security enforcement |
| 8. Missing Cookie | Default company used | Graceful fallback |
| 9. Delete App | DELETE uses context | Cleanup works |

## Debugging Failed Tests

### If Test 1 fails:
```bash
# Check if company middleware is running
tail -f .output/dev/server.log | grep "Company Context"

# Should see:
# [Company Context] 00000000-0000-0000-0000-000000000001
```

### If Test 4-6 fail:
```bash
# Check if app middleware is running
tail -f .output/dev/server.log | grep "App Context"

# Should see:
# [App Context] my-crm (abc-123...) in company 00000000-0000-0000-0000-000000000001
```

### If Test 7 fails:
```
❌ SECURITY ISSUE: Apps are not properly scoped to company!
Check middleware is using AND condition for company + slug
```

### Common Issues:

1. **"Company not found"**
   - Dummy company doesn't exist in DB
   - Run: `pnpm db:migrate` to create it

2. **"Middleware error"**
   - Middleware files not loaded
   - Check files exist: `server/middleware/1.company.ts`, `2.app.ts`
   - Check naming (numbers prefix required)

3. **"Connection refused"**
   - Dev server not running
   - Start with: `pnpm dev`

4. **All apps returned (not scoped)**
   - Company middleware not running
   - Check middleware only runs on `/api/*` routes

## Manual Testing

You can also test manually with curl:

```bash
# Test company context
curl -v http://localhost:3000/api/apps \
  -H "Cookie: active_company_id=00000000-0000-0000-0000-000000000001"

# Test app context
curl -v http://localhost:3000/api/apps/my-crm \
  -H "Cookie: active_company_id=00000000-0000-0000-0000-000000000001"

# Check response headers for debugging
curl -v http://localhost:3000/api/apps/my-crm \
  -H "Cookie: active_company_id=00000000-0000-0000-0000-000000000001" \
  2>&1 | grep "X-"
```

## Integration with CI/CD

Add to `package.json`:

```json
{
  "scripts": {
    "test:middleware": "bash test-middleware-context.sh"
  }
}
```

Then run:
```bash
pnpm test:middleware
```

## Next Steps

Once all tests pass, you can migrate the remaining API routes to use the context system:

1. Tables routes (5 files)
2. Rows routes (5 files)

Follow the pattern shown in `docs/MIDDLEWARE_GUIDE.md`.

---

**Note:** This test creates and deletes a temporary app. It won't affect your existing data.

