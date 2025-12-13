# Authentication Implementation - POC vs Production

## Overview
For the POC, we implement mock authentication endpoints that always return the fixed admin user. This allows the frontend to be built correctly without needing refactoring when we implement real auth later.

---

## POC Implementation

### Endpoints (Mocked)

```
POST /api/auth/login      # Returns fixed admin user
POST /api/auth/logout     # No-op
GET  /api/auth/me         # Returns fixed admin user
```

### Mock Login Implementation

```typescript
// server/api/auth/login.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  
  // POC: Accept any credentials
  // Production: Validate username/password against database
  
  const fixedUser = {
    id: '00000000-0000-0000-0000-000000000001',
    username: 'admin',
    email: 'admin@docpal.local',
    created_at: new Date().toISOString()
  };
  
  const fixedCompanies = [
    {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Default Company',
      role: 'owner'
    }
  ];
  
  return {
    user: fixedUser,
    token: 'mock_token_for_poc',
    companies: fixedCompanies  // Array for future multi-company support
  };
});
```

### Mock Middleware (Optional)

```typescript
// server/middleware/auth.ts
export default defineEventHandler((event) => {
  const path = event.path;
  
  // Skip auth check for auth endpoints
  if (path.startsWith('/api/auth/')) {
    return;
  }
  
  // POC: Always set fixed user context
  // Production: Validate token and get real user
  event.context.auth = {
    userId: '00000000-0000-0000-0000-000000000001',
    companyId: '00000000-0000-0000-0000-000000000002',
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      username: 'admin',
      email: 'admin@docpal.local'
    }
  };
});
```

### Using Auth Context in Endpoints

```typescript
// server/api/databases/index.get.ts
export default defineEventHandler(async (event) => {
  const { companyId, userId } = event.context.auth;
  
  // Query databases for this company
  const databases = await sql`
    SELECT * FROM databases 
    WHERE company_id = ${companyId}
      AND deleted_at IS NULL
    ORDER BY created_at DESC
  `;
  
  return { databases };
});
```

---

## Frontend Usage

### Setup API Client

```typescript
// composables/useApi.ts
export const useApi = () => {
  const token = useState('auth_token', () => '');
  
  const apiFetch = $fetch.create({
    baseURL: '/api',
    onRequest({ options }) {
      const authToken = token.value || localStorage.getItem('auth_token');
      if (authToken) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${authToken}`
        };
      }
    },
    onResponseError({ response }) {
      if (response.status === 401) {
        // Redirect to login
        navigateTo('/login');
      }
    }
  });
  
  return { apiFetch };
};
```

### Login Flow

```vue
<!-- pages/login.vue -->
<script setup>
const { apiFetch } = useApi();
const router = useRouter();

const username = ref('admin');
const password = ref('admin123');

async function login() {
  try {
    const { user, token, companies } = await apiFetch('/auth/login', {
      method: 'POST',
      body: { username: username.value, password: password.value }
    });
    
    // Store token
    localStorage.setItem('auth_token', token);
    useState('auth_token').value = token;
    
    // Store user info
    useState('user').value = user;
    useState('companies').value = companies;
    
    // Handle company selection
    if (companies.length === 1) {
      // Single company - auto-select
      useState('currentCompanyId').value = companies[0].id;
      localStorage.setItem('current_company_id', companies[0].id);
      router.push('/');
    } else {
      // Multiple companies - show selector
      router.push('/select-company');
    }
  } catch (error) {
    console.error('Login failed:', error);
  }
}
</script>

<template>
  <div>
    <input v-model="username" placeholder="Username" />
    <input v-model="password" type="password" placeholder="Password" />
    <button @click="login">Login</button>
  </div>
</template>
```

### Auto-Login Check

```typescript
// middleware/auth.global.ts
export default defineNuxtRouteMiddleware(async (to) => {
  // Skip for login page
  if (to.path === '/login') return;
  
  const { apiFetch } = useApi();
  const user = useState('user');
  
  // Check if already logged in
  if (user.value) return;
  
  // Try to get current user
  try {
    const { user: currentUser, companies } = await apiFetch('/auth/me');
    user.value = currentUser;
    useState('companies').value = companies;
    
    // Check if company is selected
    const currentCompanyId = localStorage.getItem('current_company_id');
    if (!currentCompanyId && companies.length > 1) {
      return navigateTo('/select-company');
    }
  } catch (error) {
    // Not authenticated, redirect to login
    return navigateTo('/login');
  }
});
```

### Logout

```typescript
async function logout() {
  const { apiFetch } = useApi();
  
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout failed:', error);
  } finally {
    // Clear local state
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_company_id');
    useState('auth_token').value = '';
    useState('user').value = null;
    useState('companies').value = [];
    useState('currentCompanyId').value = null;
    
    // Redirect to login
    navigateTo('/login');
  }
}
```

---

## Production Implementation (Later)

### Real Login with Password Hashing

```typescript
// server/api/auth/login.post.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export default defineEventHandler(async (event) => {
  const { username, password } = await readBody(event);
  
  // Get user from database
  const [user] = await sql`
    SELECT * FROM users 
    WHERE username = ${username}
  `;
  
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Invalid credentials'
    });
  }
  
  // Verify password
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw createError({
      statusCode: 401,
      message: 'Invalid credentials'
    });
  }
  
  // Get user's companies (user can belong to multiple)
  const companies = await sql`
    SELECT c.id, c.name, cm.role
    FROM companies c
    JOIN company_members cm ON cm.company_id = c.id
    WHERE cm.user_id = ${user.id}
  `;
  
  // Generate JWT token (without company - user can switch between companies)
  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
  
  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at
    },
    token,
    companies: companies.map(c => ({
      id: c.id,
      name: c.name,
      role: c.role
    }))
  };
});
```

### Real Auth Middleware

```typescript
// server/middleware/auth.ts
import jwt from 'jsonwebtoken';

export default defineEventHandler((event) => {
  const path = event.path;
  
  // Skip auth for public endpoints
  if (path.startsWith('/api/auth/') || path.startsWith('/api/public/')) {
    return;
  }
  
  // Get token from header
  const authHeader = getRequestHeader(event, 'authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated'
    });
  }
  
  const token = authHeader.substring(7);
  
  try {
    // Verify JWT
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    
    // Set auth context
    event.context.auth = {
      userId: payload.userId,
      companyId: payload.companyId
    };
  } catch (error) {
    throw createError({
      statusCode: 401,
      message: 'Invalid token'
    });
  }
});
```

### User Registration (For Later)

```typescript
// server/api/auth/register.post.ts
import bcrypt from 'bcrypt';

export default defineEventHandler(async (event) => {
  const { username, email, password, companyName } = await readBody(event);
  
  // Validate input
  if (!username || !email || !password || !companyName) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields'
    });
  }
  
  // Check if user exists
  const [existingUser] = await sql`
    SELECT 1 FROM users 
    WHERE username = ${username} OR email = ${email}
  `;
  
  if (existingUser) {
    throw createError({
      statusCode: 400,
      message: 'User already exists'
    });
  }
  
  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);
  
  // Create user
  const [user] = await sql`
    INSERT INTO users (username, email, password_hash)
    VALUES (${username}, ${email}, ${passwordHash})
    RETURNING id, username, email, created_at
  `;
  
  // Create company
  const [company] = await sql`
    INSERT INTO companies (name, owner_id)
    VALUES (${companyName}, ${user.id})
    RETURNING id, name
  `;
  
  // Generate token
  const token = jwt.sign(
    { userId: user.id, companyId: company.id },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
  
  return { user, token, company };
});
```

---

## Migration Path: POC → Production

### Step 1: Install Dependencies
```bash
pnpm add bcrypt jsonwebtoken
pnpm add -D @types/bcrypt @types/jsonwebtoken
```

### Step 2: Add Environment Variables
```env
JWT_SECRET=your_secret_key_here
```

### Step 3: Replace Mock Implementations
Replace the mock implementations in:
- `server/api/auth/login.post.ts`
- `server/api/auth/logout.post.ts`
- `server/api/auth/me.get.ts`
- `server/middleware/auth.ts`

### Step 4: No Frontend Changes Needed!
Frontend code remains exactly the same because we built it correctly from the start.

---

## Security Checklist (Production)

- [ ] Use strong JWT secret (min 32 characters)
- [ ] Hash passwords with bcrypt (cost factor 10+)
- [ ] Implement rate limiting on login endpoint
- [ ] Add CSRF protection
- [ ] Use HTTPS in production
- [ ] Set secure cookie flags
- [ ] Implement refresh tokens
- [ ] Add password strength validation
- [ ] Implement account lockout after failed attempts
- [ ] Add email verification
- [ ] Implement password reset flow
- [ ] Log authentication events
- [ ] Add 2FA (optional)

---

## Summary

**POC Approach:**
- ✅ Mock auth endpoints that return fixed user
- ✅ Frontend built correctly with proper auth flow
- ✅ No refactoring needed later
- ✅ Easy to swap to real auth

**Benefits:**
- Frontend team can build features immediately
- Auth UX is correct from day 1
- Clear separation between POC and production
- Smooth migration path

