# Mock Auth API (POC)

## Overview
This is a **mock authentication system** for POC development. It always returns a fixed admin user and doesn't perform real authentication.

## Endpoints

### POST /api/auth/login
**Description:** Mock login endpoint - accepts any credentials

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "user": {
    "id": "00000000-0000-0000-0000-000000000001",
    "username": "admin",
    "email": "admin@docpal.local",
    "created_at": "2025-12-13T..."
  },
  "token": "mock_token_for_poc",
  "companies": [
    {
      "id": "00000000-0000-0000-0000-000000000002",
      "name": "Default Company",
      "role": "owner"
    }
  ]
}
```

---

### GET /api/auth/me
**Description:** Get current user - always returns fixed admin user

**Response:**
```json
{
  "user": {
    "id": "00000000-0000-0000-0000-000000000001",
    "username": "admin",
    "email": "admin@docpal.local",
    "created_at": "2025-12-13T..."
  },
  "companies": [
    {
      "id": "00000000-0000-0000-0000-000000000002",
      "name": "Default Company",
      "role": "owner"
    }
  ]
}
```

---

### POST /api/auth/logout
**Description:** Mock logout endpoint - just returns success

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Auth Middleware

All API requests (except `/api/auth/*`) automatically have `event.context.auth` injected with:

```typescript
{
  userId: '00000000-0000-0000-0000-000000000001',
  companyId: '00000000-0000-0000-0000-000000000002',
  user: {
    id: '00000000-0000-0000-0000-000000000001',
    username: 'admin',
    email: 'admin@docpal.local'
  }
}
```

## Using Auth in Your Endpoints

```typescript
import { getAuthUser, getUserId, getCompanyId } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
  // Get full auth context
  const auth = getAuthUser(event);
  
  // Or use shortcuts
  const userId = getUserId(event);
  const companyId = getCompanyId(event);
  
  // Use in queries
  const databases = await sql`
    SELECT * FROM databases 
    WHERE company_id = ${companyId}
  `;
  
  return { databases };
});
```

## Testing

Run the test script:
```bash
# Make sure dev server is running first
pnpm dev

# In another terminal:
./test-auth.sh
```

Or test manually with curl:
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "anything"}'

# Get current user
curl http://localhost:3000/api/auth/me

# Logout
curl -X POST http://localhost:3000/api/auth/logout
```

## Migration to Production

When ready for production auth (Phase 2):

1. **Replace login endpoint:**
   - Validate username/password against database
   - Generate real JWT token
   - Return token with expiry

2. **Update middleware:**
   - Read `Authorization: Bearer <token>` header
   - Validate and decode JWT
   - Query database for user
   - Inject real user context

3. **Update logout:**
   - Invalidate token (Redis blacklist or database)

4. **Add password hashing:**
   - Use bcrypt/argon2 for password storage
   - Compare hashed passwords on login

5. **Add security features:**
   - Rate limiting on login
   - Password reset flow
   - Email verification
   - Refresh tokens

See `docs/Auth-Implementation.md` for detailed migration guide.

---

## Fixed Test User

**Username:** `admin`  
**Password:** (any - not validated in POC)  
**User ID:** `00000000-0000-0000-0000-000000000001`  
**Company ID:** `00000000-0000-0000-0000-000000000002`

This user is seeded in the database via `server/database/seeds/001_seed_admin_company.sql`.

