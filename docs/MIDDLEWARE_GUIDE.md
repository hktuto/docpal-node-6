# Server Middleware Guide

## Overview

Our application uses **Nuxt server middleware** to provide context (company, app, user) to all API routes. This eliminates code duplication, ensures consistent error handling, and provides proper multi-tenant scoping.

---

## How It Works

### 1. Middleware Execution Order

Nuxt server middleware files are executed in **alphabetical order** (hence the `1.`, `2.` prefixes):

```
1. server/middleware/1.company.ts  ← Runs FIRST
2. server/middleware/2.app.ts      ← Runs SECOND
3. server/api/...                  ← Your route handlers
```

### 2. Context Attachment

Middleware attaches data to `event.context`:

```typescript
// Middleware sets context
event.context.companyId = 'abc-123'
event.context.app = { ... }

// Route handlers access context
export default defineEventHandler(async (event) => {
  const companyId = event.context.companyId
  const app = event.context.app
  // ... use the data
})
```

---

## Middleware Files

### `server/middleware/1.company.ts`

**Purpose:** Determine and load the current company for all API requests.

**Runs on:** All `/api/*` requests

**Phase 1:** Reads `active_company_id` from cookie/header (dummy value)

**Phase 2+:** Will use real session/auth

**Context Set:**
- `event.context.company` - Full company object
- `event.context.companyId` - Company UUID

**Example:**
```typescript
// Before middleware
GET /api/apps → Returns ALL apps (wrong!)

// After middleware
GET /api/apps → Returns only apps in YOUR company ✓
```

---

### `server/middleware/2.app.ts`

**Purpose:** Load app data for app-specific routes.

**Runs on:** Only `/api/apps/:appSlug/*` requests

**Context Set:**
- `event.context.app` - Full app object (already scoped to company)
- `event.context.appId` - App UUID

**Example:**
```typescript
// Before middleware
GET /api/apps/my-crm/tables
→ Must fetch app by slug
→ Validate company scoping
→ Handle errors

// After middleware
GET /api/apps/my-crm/tables
→ App already loaded and validated!
→ Just use event.context.app
```

---

## Using Context in Route Handlers

### Method 1: Direct Access (Simple)

```typescript
// server/api/apps/[appSlug]/index.get.ts
export default defineEventHandler(async (event) => {
  const app = event.context.app // Already loaded!
  return app
})
```

### Method 2: Helper Functions (Recommended)

```typescript
import { requireApp, requireCompanyId } from '~/server/utils/context'

export default defineEventHandler(async (event) => {
  const app = requireApp(event) // Throws error if not found
  const companyId = requireCompanyId(event)
  
  // ... use app and companyId
})
```

---

## Before & After Comparison

### Before (Without Middleware)

```typescript
// server/api/apps/[appSlug]/tables/index.get.ts
export default defineEventHandler(async (event) => {
  const appSlug = getRouterParam(event, 'appSlug')
  
  // ❌ 20+ lines of boilerplate:
  if (!appSlug) throw createError({ ... })
  
  const app = await db.select()
    .from(apps)
    .where(eq(apps.slug, appSlug))
    .limit(1)
    .then(rows => rows[0])
  
  if (!app) throw createError({ ... })
  
  // ❌ BUG: Not scoped to company!
  
  // Finally, the actual logic:
  const tables = await db.select()
    .from(dataTables)
    .where(eq(dataTables.appId, app.id))
  
  return tables
})
```

### After (With Middleware)

```typescript
// server/api/apps/[appSlug]/tables/index.get.ts
export default defineEventHandler(async (event) => {
  const app = event.context.app // ✅ Already loaded & validated!
  
  // Just the actual logic:
  const tables = await db.select()
    .from(dataTables)
    .where(eq(dataTables.appId, app.id))
  
  return tables
})
```

**Benefits:**
- ✅ 90% less boilerplate
- ✅ Company scoping guaranteed
- ✅ Consistent error handling
- ✅ Type-safe context
- ✅ Easier to test

---

## Frontend Integration

### Phase 1: Cookie-based

```typescript
// app/plugins/company-context.ts
export default defineNuxtPlugin(() => {
  const companyId = useCookie('active_company_id')
  companyId.value = '00000000-0000-0000-0000-000000000001' // Dummy
})
```

All API requests automatically include the cookie:

```typescript
// Frontend
await $fetch('/api/apps')
// → Backend reads cookie via middleware
// → Returns apps scoped to company
```

### Phase 2+: Session-based

```typescript
// app/plugins/company-context.ts
export default defineNuxtPlugin(() => {
  const { user } = useUserSession()
  const companyId = useCookie('active_company_id')
  companyId.value = user.value?.activeCompanyId
})
```

---

## TypeScript Support

Context types are defined in `server/types/context.d.ts`:

```typescript
declare module 'h3' {
  interface H3EventContext {
    company?: Company
    companyId?: string
    app?: App
    appId?: string
  }
}
```

This gives you **full IntelliSense** in VSCode:

```typescript
event.context.app. // ← Auto-complete shows: id, name, slug, etc.
```

---

## Middleware Naming Convention

Files are prefixed with numbers to control execution order:

```
1.company.ts    ← Runs first
2.app.ts        ← Runs second
3.auth.ts       ← Would run third (Phase 2+)
```

Without numbers, they'd run alphabetically (`app.ts` before `company.ts` ❌).

---

## Testing with curl

### Set company via cookie:
```bash
curl http://localhost:3000/api/apps \
  -H "Cookie: active_company_id=00000000-0000-0000-0000-000000000001"
```

### Set company via header (Phase 1 fallback):
```bash
curl http://localhost:3000/api/apps \
  -H "X-Company-Id: 00000000-0000-0000-0000-000000000001"
```

---

## Debugging

Enable debug logs in middleware (already included):

```typescript
// server/middleware/1.company.ts
console.log(`[Company Context] ${company.slug} (${company.id})`)

// server/middleware/2.app.ts
console.log(`[App Context] ${app.slug} (${app.id})`)
```

Check terminal output when making requests:

```
[Company Context] acme-corp (00000000-0000-0000-0000-000000000001)
[App Context] my-crm (abc-123-...)
```

---

## Next Steps (Phase 2+)

1. **Replace cookie with session:**
   ```typescript
   const session = await requireUserSession(event)
   const companyId = session.user.activeCompanyId
   ```

2. **Add user context:**
   ```typescript
   event.context.user = session.user
   event.context.userId = session.user.id
   ```

3. **Add permission checks:**
   ```typescript
   // server/middleware/3.permissions.ts
   if (!canAccessCompany(user, company)) {
     throw createError({ statusCode: 403, message: 'Access denied' })
   }
   ```

---

## Summary

✅ **Middleware runs before all API routes**  
✅ **Company context is set globally**  
✅ **App context is set for app routes**  
✅ **All routes are properly scoped to company**  
✅ **90% less boilerplate in route handlers**  
✅ **Type-safe context with IntelliSense**  
✅ **Consistent error handling**  

This architecture scales perfectly into Phase 2+ when we add real authentication!

