# Auth Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Start Your Dev Server

```bash
npm run dev
# or
pnpm dev
```

### 2. Seed the Database

Open a new terminal and run:

```bash
curl -X POST http://localhost:3000/api/seed
```

Or visit in your browser:
```
http://localhost:3000/api/seed
```

This creates:
- **Email:** `admin@docpal.dev`
- **Password:** `admin123`
- **Company:** Acme Corporation

### 3. Login

Visit: `http://localhost:3000/auth/login`

Use the credentials above to login.

---

## 🔒 How Auth Works

### Global Protection (Automatic)

**All routes require authentication by default.**

The global auth middleware (`app/middleware/auth.global.ts`) runs on every route and redirects unauthenticated users to `/auth/login`.

### Public Routes

Only these routes are public (no auth required):

```
/                     # Landing page (if any)
/auth/login          # Login page
/auth/verify         # Magic link verification
/auth/invite         # Accept invitation
/api/*               # All API routes
```

### Adding Public Routes

Edit `app/middleware/auth.global.ts`:

```typescript
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/verify',
  '/auth/invite',
  '/',
  '/about',           // ← Add your route here
]
```

Or add a prefix pattern:

```typescript
const PUBLIC_PREFIXES = [
  '/api/',
  '/_nuxt/',
  '/favicon.ico',
  '/public/',         // ← Add your prefix here
]
```

---

## 📝 Login Methods

### 1. Email & Password

```
1. Visit /auth/login
2. Enter email and password
3. Click "Sign In"
4. Redirected to /apps
```

### 2. Magic Link (Passwordless)

```
1. Visit /auth/login
2. Click "Use magic link instead"
3. Enter email
4. Click "Send Magic Link"
5. Check email and click the link
6. Automatically logged in
```

**Note:** In development, magic links are logged to the console instead of sending actual emails.

---

## 👥 Inviting Users

### As an Admin

```typescript
// In your admin panel or via API
POST /api/companies/{companyId}/members/invite

{
  "email": "newuser@example.com",
  "role": "member"  // or "admin"
}
```

The invited user receives an email with an invite link.

### For New Users

```
1. Click invite link in email
2. Visit /auth/invite?code=XXX
3. Enter name and password
4. Click "Accept Invite"
5. Automatically added to company and logged in
```

### For Existing Users

```
1. Click invite link in email
2. If logged in: auto-accept and join company
3. If not logged in: prompted to login first
```

---

## 🛡️ Using Auth in Your Code

### In Vue Components

```vue
<script setup>
const auth = useAuth()

// Get current user
console.log(auth.user.value)        // User object or null
console.log(auth.company.value)     // Company object or null

// Check auth status
console.log(auth.isAuthenticated.value)  // boolean
console.log(auth.hasCompany.value)       // boolean

// Logout
await auth.logout()
</script>

<template>
  <div>
    <p v-if="auth.isAuthenticated.value">
      Welcome, {{ auth.user.value?.name }}!
    </p>
    <el-button v-else @click="$router.push('/auth/login')">
      Login
    </el-button>
  </div>
</template>
```

### In API Routes

```typescript
export default defineEventHandler(async (event) => {
  // User is automatically attached by middleware
  const user = event.context.user
  
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }
  
  // All users have a company context
  const companyId = user.company.id
  const userRole = user.company.role  // 'owner', 'admin', 'member'
  
  // Your logic here...
})
```

### Require Auth in API Routes

```typescript
import { requireAuth } from '~~/server/utils/auth/getCurrentUser'

export default defineEventHandler(async (event) => {
  // Throws 401 if not authenticated
  const user = await requireAuth(event)
  
  // User is guaranteed to exist here
  console.log(user.email)
  console.log(user.company.id)
})
```

---

## 🔑 Session Management

### Session Duration

- **Default:** 30 days
- **Renewal:** Auto-renewed on activity if > 24 hours old
- **Storage:** HttpOnly cookie (secure, no JS access)

### Logout

```typescript
const auth = useAuth()
await auth.logout()  // Clears session and redirects to /auth/login
```

### Multiple Companies

If a user belongs to multiple companies:

```typescript
const auth = useAuth()

// Switch active company
await auth.switchCompany('company-uuid')

// Refresh user data
await auth.fetchUser()
```

---

## 🚨 Troubleshooting

### Can't login - "Invalid credentials"

- Check the email/password are correct
- Verify the seed script ran successfully
- Check the database for the user: `SELECT * FROM users WHERE email = 'admin@docpal.dev'`

### Redirected to login after logging in

- Check browser console for errors
- Verify session cookie is set: DevTools → Application → Cookies
- Check server logs for middleware errors
- Try clearing cookies and logging in again

### Magic link doesn't work

- Check the server console for the magic link URL
- Link expires after 15 minutes
- Each link is single-use only
- Make sure the token parameter is in the URL

### "hub:db:schema" TypeScript error

- This is a false positive - TypeScript doesn't recognize virtual modules
- The import works at runtime
- Restart your dev server to clear the error
- Or add `//@ts-ignore` above the import

---

## 📚 More Information

- **Full Auth Guide:** See `docs/AUTH_SETUP.md`
- **API Reference:** See `docs/DEVELOPMENT_PLAN/phase2.md`
- **User Flow Diagram:** See conversation summary above

---

## ✅ Checklist

Before deploying to production:

- [ ] Replace console.log emails in `server/utils/email.ts` with real email service
- [ ] Set secure environment variables (SMTP credentials, session secrets)
- [ ] Enable HTTPS (required for secure cookies)
- [ ] Set `COOKIE_SECURE=true` in production
- [ ] Change default admin password
- [ ] Set up password reset flow
- [ ] Add rate limiting to login endpoints
- [ ] Enable audit logging
- [ ] Test invite flow end-to-end
- [ ] Configure session expiry as needed

