# Electric + Auth Integration Design

## Current State

### `useAuth` (API-based)
- Fetches user from `/api/auth/me` on login/page load
- Stores in `useState('auth:user')`
- Used for: Authentication checks, user info display
- Fast, reliable, works without Electric

### `useUsers` (Electric-based)
- Syncs current user from PostgreSQL via Electric
- Stores in PGlite
- Used for: Real-time user data, offline access
- Richer data, automatic updates

## Problem

We have **two sources of user data**:
1. `useAuth().user` - From API
2. `useUsers().currentUser` - From Electric

This causes:
- ❌ Data duplication
- ❌ Potential inconsistencies
- ❌ Confusion about which to use
- ❌ `useUsers` might initialize before auth

---

## Solution: Lifecycle Coordination

Keep them **separate but coordinated**:

```
Login Flow:
┌─────────────┐
│ User logs in│
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ useAuth.login()     │ ← Fast API call
│ - Sets auth state   │
│ - Creates session   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ useUsers watches    │ ← Detects auth change
│ - Sees user is auth │
│ - Initializes sync  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Electric syncs data │ ← Background sync
│ - PGlite populated  │
│ - Real-time updates │
└─────────────────────┘
```

---

## Implementation Strategy

### Phase 1: Auto-Initialize `useUsers` After Auth ✅

**Update `useUsers` to watch auth state:**

```typescript
// app/composables/useUsers.ts
export const useUsers = () => {
  const { user: authUser, isAuthenticated } = useAuth()
  const { syncTable, watchQuery, getDB } = useSecureElectricSync()
  
  const users = ref<any[]>([])
  const isLoading = ref(false)
  const isInitialized = ref(false)

  const initialize = async () => {
    // Don't init if not authenticated
    if (!isAuthenticated.value) {
      console.log('[useUsers] Not authenticated, skipping init')
      return
    }

    if (isInitialized.value) return
    isLoading.value = true

    try {
      // ... existing init logic ...
    } finally {
      isLoading.value = false
    }
  }

  // Watch auth state - auto init when user logs in
  watch(isAuthenticated, (authenticated) => {
    if (authenticated && !isInitialized.value) {
      console.log('[useUsers] User authenticated, initializing Electric sync')
      initialize()
    } else if (!authenticated && isInitialized.value) {
      // User logged out - cleanup
      console.log('[useUsers] User logged out, cleaning up Electric sync')
      users.value = []
      isInitialized.value = false
    }
  }, { immediate: true })

  return {
    users: readonly(users),
    currentUser: readonly(currentUser),
    isLoading: readonly(isLoading),
    // ...
  }
}
```

**Benefits:**
- ✅ Auto-starts when user logs in
- ✅ Auto-cleans up on logout
- ✅ No manual coordination needed
- ✅ Safe - won't try to sync without auth

---

### Phase 2: Use Electric Data in Components 🎯

**For new components, use Electric:**
```vue
<script setup>
const { currentUser, isLoading } = useUsers() // Electric sync
</script>

<template>
  <div v-if="currentUser">
    <h1>{{ currentUser.name }}</h1>
    <p>{{ currentUser.email }}</p>
  </div>
</template>
```

**For auth checks, keep using `useAuth`:**
```vue
<script setup>
const { isAuthenticated, user } = useAuth() // Fast auth check
</script>

<template>
  <div v-if="!isAuthenticated">
    Please log in
  </div>
</template>
```

---

### Phase 3: Gradual Migration (Optional)

Eventually, we can make `useAuth` **use Electric data** instead of API:

```typescript
// app/composables/useAuth.ts (FUTURE)
export const useAuth = () => {
  const { currentUser, isLoading: electricLoading } = useUsers()
  
  // Map Electric user to auth user format
  const user = computed(() => currentUser.value ? {
    id: currentUser.value.id,
    email: currentUser.value.email,
    name: currentUser.value.name,
    avatar: currentUser.value.avatar,
    emailVerifiedAt: currentUser.value.email_verified_at,
  } : null)

  const isAuthenticated = computed(() => !!user.value)
  
  // Login still uses API (for session creation)
  const login = async (email: string, password: string) => {
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    })
    // Electric will auto-sync after this
    return response
  }

  return {
    user,
    isAuthenticated,
    login,
    logout,
    // ...
  }
}
```

But this is **not needed for POC**! Keep it simple.

---

## Recommended Approach for POC

### 1. Keep Both (Recommended) ✅

**Use `useAuth` for:**
- ✅ Authentication checks (`isAuthenticated`)
- ✅ Login/logout actions
- ✅ Fast initial page load
- ✅ Session management

**Use `useUsers` for:**
- ✅ Displaying user profile
- ✅ Real-time user updates
- ✅ Offline user data
- ✅ User preferences/settings

**Example - Profile Page:**
```vue
<script setup>
// Auth check (fast)
const { isAuthenticated } = useAuth()

// User data (Electric, rich)
const { currentUser, isLoading } = useUsers()
</script>

<template>
  <!-- Auth guard -->
  <div v-if="!isAuthenticated">
    Please log in
  </div>

  <!-- User data display -->
  <div v-else-if="!isLoading && currentUser">
    <h1>{{ currentUser.name }}</h1>
    <p>{{ currentUser.email }}</p>
    <img :src="currentUser.avatar" />
  </div>
</template>
```

---

## Decision Matrix

| Use Case | Use `useAuth` | Use `useUsers` |
|----------|---------------|----------------|
| Check if logged in | ✅ Yes | ❌ No |
| Login/logout | ✅ Yes | ❌ No |
| Display user name | 🟡 OK | ✅ Better |
| Display user profile | 🟡 OK | ✅ Better |
| Real-time updates | ❌ No | ✅ Yes |
| Offline access | ❌ No | ✅ Yes |
| Middleware/guards | ✅ Yes | ❌ No |

---

## Implementation Steps

1. ✅ **Add auth watcher to `useUsers`** - Auto-init after login
2. ✅ **Update profile page** - Use `useUsers` for display
3. ⏸️ **Keep login flow** - Still use `useAuth.login()`
4. ⏸️ **Keep auth guards** - Still use `useAuth.isAuthenticated`

---

## Code Changes Needed

### 1. Update `useUsers` Composable

```typescript
// app/composables/useUsers.ts
export const useUsers = () => {
  const { isAuthenticated } = useAuth() // ← Add this
  const { syncTable, watchQuery, getDB } = useSecureElectricSync()
  
  // ... existing code ...

  // Watch auth state
  watch(isAuthenticated, (authenticated) => {
    if (authenticated && !isInitialized.value) {
      console.log('[useUsers] User authenticated, initializing sync')
      initialize()
    } else if (!authenticated && isInitialized.value) {
      console.log('[useUsers] User logged out, cleaning up')
      users.value = []
      isInitialized.value = false
    }
  }, { immediate: true })

  // Remove onMounted - let watch handle it
  // onMounted(() => { initialize() })

  return { /* ... */ }
}
```

### 2. Update Profile Page

```vue
<!-- app/pages/profile.vue -->
<script setup>
const { isAuthenticated } = useAuth()
const { currentUser, isLoading } = useUsers()
</script>

<template>
  <div v-if="!isAuthenticated">Please log in</div>
  <div v-else-if="isLoading">Loading...</div>
  <div v-else-if="currentUser">
    <h1>{{ currentUser.name }}</h1>
    <p>{{ currentUser.email }}</p>
    <!-- Real-time data, auto-updates! -->
  </div>
</template>
```

---

## Summary

**For POC:**
- ✅ Keep both `useAuth` and `useUsers` separate
- ✅ `useUsers` watches auth state, auto-initializes
- ✅ Components use `useAuth` for auth checks
- ✅ Components use `useUsers` for user data display
- ✅ No breaking changes, gradual migration

**Future (Optional):**
- 🚀 Merge `useAuth` to use Electric under the hood
- 🚀 Single source of truth
- 🚀 Consistent API

Want me to implement the changes now? 🎯

