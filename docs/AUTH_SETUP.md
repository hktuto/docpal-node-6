# Authentication Setup & Usage

## Quick Start

### 1. Seed the Database

Create a superadmin account and test company:

```bash
# Using curl
curl -X POST http://localhost:3000/api/seed

# Using fetch in browser console
fetch('http://localhost:3000/api/seed', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
```

This creates:
- **User**: admin@docpal.dev
- **Password**: admin123
- **Company**: Acme Corporation (slug: acme-corp)
- **Role**: owner

### 2. Login

Visit `http://localhost:3000/auth/login` and use the credentials above.

---

## Authentication Flow

### User Flows

#### 1. **Login with Email/Password**
```
/auth/login → Enter credentials → Authenticated → /apps
```

#### 2. **Login with Magic Link** (Passwordless)
```
/auth/login → Choose magic link → Enter email → 
Receive email → Click link → /auth/verify?token=xxx → Authenticated → /apps
```

#### 3. **Invite New User** (Admin only)
```
Admin sends invite → User receives email → 
/auth/invite?code=xxx → User sets password → Authenticated → /apps
```

---

## Middleware Protection

### Backend Middleware (Automatic)

**File**: `server/middleware/00.auth.ts`

- Runs on **every request** before all other middleware
- Reads `session_token` from cookie or `Authorization` header
- Looks up session in database
- Attaches user to `event.context.user` if session is valid
- Does **NOT** throw errors - routes decide if auth is required

**Public Paths** (no auth check):
- `/api/auth/*` - Authentication endpoints
- `/api/public/*` - Public API endpoints
- `/_nuxt/*` - Nuxt assets
- `/favicon.ico`

### Frontend Middleware

#### Global Auth Middleware (Automatic)

**File**: `app/middleware/auth.global.ts`

- Runs on **every route** automatically (`.global.ts` suffix)
- Fetches user if not already loaded
- Redirects to `/auth/login` if accessing protected routes while unauthenticated
- Preserves intended destination in `?redirect=` query parameter

**Public Routes** (no auth required):
```typescript
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/verify',
  '/auth/invite',
  '/',
]

const PUBLIC_PREFIXES = [
  '/api/',
  '/_nuxt/',
  '/favicon.ico',
]
```

**All other routes require authentication by default.**

To add a public route, edit `app/middleware/auth.global.ts` and add to `PUBLIC_ROUTES` or `PUBLIC_PREFIXES`.

#### Guest-Only Middleware (Manual)

**File**: `app/middleware/guest.ts`

Use on pages that should redirect authenticated users away:

```vue
<script setup>
definePageMeta({
  middleware: 'guest'  // Redirects to /apps if authenticated
})
</script>
```

**Example guest routes:**
- `/auth/login` - Login page

**Note**: Guest middleware is applied manually only where needed (auth pages). The global auth middleware handles all protection automatically.

---

## Session Management

### Session Storage

Sessions are stored in the `sessions` table:

```typescript
{
  id: uuid
  userId: uuid
  token: string (unique, indexed)
  expiresAt: timestamp
  lastActivityAt: timestamp
}
```

### Session Token

- Stored in `session_token` **HttpOnly cookie** (secure, no JS access)
- Automatically sent with every request
- Valid for 30 days from last activity
- Renewed on each request if > 24 hours old

### Logout

```typescript
const auth = useAuth()
await auth.logout()  // Deletes session and redirects to login
```

---

## Company Context

Every authenticated user has a **company context**:

```typescript
event.context.user = {
  id: "user-uuid",
  email: "user@example.com",
  name: "User Name",
  company: {
    id: "company-uuid",
    name: "Acme Corp",
    slug: "acme-corp",
    role: "owner"  // or "admin", "member"
  }
}
```

All database queries are automatically scoped to `event.context.user.company.id`.

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/logout` | Logout (delete session) |
| GET | `/api/auth/me` | Get current user info |
| POST | `/api/auth/magic-link/send` | Send magic link email |
| POST | `/api/auth/magic-link/verify` | Verify magic link token |

### Company Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/companies` | Create new company |
| GET | `/api/companies` | List user's companies |
| PUT | `/api/companies/[id]` | Update company |
| DELETE | `/api/companies/[id]` | Delete company |
| POST | `/api/companies/[id]/members/invite` | Invite user to company |
| POST | `/api/companies/invites/accept` | Accept company invite |
| POST | `/api/companies/switch` | Switch active company |

### Utility

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/seed` | Create test superadmin + company |

---

## Using Auth in Components

### Get Current User

```vue
<script setup>
const auth = useAuth()

// Reactive user state
console.log(auth.user.value)  // User object or null
console.log(auth.company.value)  // Company object or null

// Computed states
console.log(auth.isAuthenticated.value)  // boolean
console.log(auth.hasCompany.value)  // boolean
</script>
```

### Login Programmatically

```typescript
const auth = useAuth()

// Email/Password
const result = await auth.login('user@example.com', 'password')
if (result.success) {
  // Logged in
} else {
  console.error(result.error)
}

// Magic Link
const result = await auth.sendMagicLink('user@example.com')
if (result.success) {
  // Email sent
}
```

### Logout

```typescript
const auth = useAuth()
await auth.logout()  // Auto-redirects to /auth/login
```

### Switch Company

```typescript
const auth = useAuth()
await auth.switchCompany('company-uuid')
await auth.fetchUser()  // Refresh data
```

---

## Backend: Accessing User

### In API Routes

```typescript
export default defineEventHandler(async (event) => {
  // Get current user (already loaded by middleware)
  const user = event.context.user
  
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }
  
  // User has company context
  const companyId = user.company.id
  const userRole = user.company.role
  
  // Query scoped to company
  const apps = await db
    .select()
    .from(apps)
    .where(eq(apps.companyId, companyId))
})
```

### Using getCurrentUser Utility

```typescript
import { getCurrentUser } from '~~/server/utils/auth/getCurrentUser'

export default defineEventHandler(async (event) => {
  // Alternative: manually get user from token
  const token = getCookie(event, 'session_token')
  const user = await getCurrentUser(token)
  
  // ... rest of logic
})
```

---

## Security Notes

### Password Hashing

Passwords are hashed using **bcrypt** with 12 rounds:

```typescript
import { hashPassword, comparePassword } from '~~/server/utils/auth/password'

const hashedPassword = await hashPassword('plaintext')
const isValid = await comparePassword('plaintext', hashedPassword)
```

### Token Generation

Secure random tokens (magic links, sessions):

```typescript
import { generateToken } from '~~/server/utils/auth/token'

const token = generateToken(32)  // 32-byte random hex string
```

### Session Security

- **HttpOnly cookies** - No JavaScript access
- **SameSite: Lax** - CSRF protection
- **Secure flag** - HTTPS only (production)
- **Token expiry** - 30-day absolute, renewed on activity

### Magic Link Security

- **One-time use** - Deleted after verification
- **15-minute expiry** - Short-lived tokens
- **Secure random** - Cryptographically strong

---

## Development vs Production

### Development

- Emails logged to console (see `server/utils/email.ts`)
- Session tokens visible in browser DevTools
- No HTTPS requirement

### Production

Configure environment variables:

```env
# Email service (e.g., SendGrid, AWS SES, etc.)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-password
SMTP_FROM=noreply@yourdomain.com

# Session security
SESSION_EXPIRES_DAYS=30
COOKIE_SECURE=true
```

Update `server/utils/email.ts` to use real email service.

---

## Testing Accounts

After running `/api/seed`:

| Email | Password | Company | Role |
|-------|----------|---------|------|
| admin@docpal.dev | admin123 | Acme Corporation | owner |

Create additional test users via invite system or by calling `/api/auth/register` (if enabled).

---

## Troubleshooting

### "Unauthorized" on protected routes

1. Check if session_token cookie is set in browser DevTools
2. Verify session exists in database: `SELECT * FROM sessions WHERE token = '...'`
3. Check if session has expired
4. Ensure middleware is running: check console for auth logs

### Magic link not working

1. Check console logs for email output
2. Verify magic link hasn't expired (15 min)
3. Check `magic_links` table for token
4. Ensure URL includes correct token parameter

### User logged out unexpectedly

1. Check session expiry (30 days default)
2. Verify database connection
3. Check if session was deleted manually

### Cannot access protected route after login

1. Ensure `middleware: 'auth'` is set on the page
2. Check if `auth.fetchUser()` completed
3. Verify `auth.isAuthenticated.value` is `true`
4. Check browser console for errors

---

## Next Steps

1. **Email Service**: Replace console.log in `server/utils/email.ts` with real email provider
2. **OAuth**: Add social login (Google, GitHub, etc.)
3. **2FA**: Implement two-factor authentication
4. **Password Reset**: Add forgot password flow
5. **Rate Limiting**: Add login attempt limits
6. **Audit Logs**: Track authentication events (already partially implemented)

