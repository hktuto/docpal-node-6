# Electric Users Sync - Fix Summary

## Problem
The `users` table sync was failing because the proxy was trying to filter by `company_id`, but the `users` table doesn't have a `company_id` column.

### Database Schema
```
users table:
- id (PK)
- email
- name
- avatar
- password
- email_verified_at
- last_login_at
- created_at
- updated_at
❌ NO company_id column!

Users are linked to companies via the company_members join table:
users ←→ company_members ←→ companies
```

## Root Cause
The proxy (`server/api/electric/shape.get.ts`) was attempting:
```typescript
if (table === 'users') {
  whereClause = `company_id='${companyId}'`  // ❌ company_id doesn't exist!
}
```

This caused a 400 error from ElectricSQL:
```
unknown reference company_id
```

## Solution

### POC Approach: Sync Current User Only
For the POC, we simplified to sync only the **current user's own data**:

**1. Updated Proxy (`server/api/electric/shape.get.ts`):**
```typescript
if (table === 'users') {
  // POC: Only sync current user's own data
  // TODO: Implement permission-based user syncing later
  const userId = event.context.user?.id
  if (!userId) {
    throw createError({ statusCode: 401, message: 'User ID not found' })
  }
  whereClause = `id='${userId}'`
}
```

**2. Updated Composable (`app/composables/useUsers.ts`):**
- Updated documentation to reflect current user only
- Added `currentUser` computed property for easy access
- Query still returns array for consistency, but contains only 1 user

```typescript
const currentUser = computed(() => users.value[0] || null)

return {
  users: readonly(users),
  currentUser: readonly(currentUser),  // ← New helper
  // ...
}
```

## Usage

```vue
<script setup>
const { currentUser, isLoading } = useUsers()
</script>

<template>
  <div v-if="!isLoading">
    <h1>Welcome, {{ currentUser?.name }}</h1>
    <p>{{ currentUser?.email }}</p>
  </div>
</template>
```

## Future: Permission-Based User Syncing

For collaboration features (seeing other users), we'll need to:

1. **Sync `company_members` table** (includes `user_id` and `company_id`)
2. **Client-side filtering**: 
   ```typescript
   // Get all user IDs in current company
   const memberUserIds = companyMembers.value.map(m => m.user_id)
   
   // Filter users
   const companyUsers = users.value.filter(u => memberUserIds.includes(u.id))
   ```
3. **Or use a view**: Create a PostgreSQL view that denormalizes users with company_id
4. **Or add `user_companies` materialized table** for better security

## What Works Now ✅

- ✅ Current user data syncs successfully
- ✅ Real-time updates to user profile
- ✅ Offline access to user data
- ✅ No security leaks (only user's own data)

## What's Deferred 🚧

- 🚧 Syncing other users in company (for collaboration)
- 🚧 Permission-based user visibility
- 🚧 User presence indicators
- 🚧 @mentions and user search

These will be implemented when we add the full permission syncing system!

