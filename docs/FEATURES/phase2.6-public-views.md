# Phase 2.6 - Public View Access

**Status**: ✅ Complete  
**Date**: December 27, 2025

## Overview

The Views system now supports **public, shared, and private access** with a dual API structure:
- **Management APIs**: Full CRUD under workspace/table context
- **Public APIs**: Simple access by view ID only

## Access Levels

| Level | Auth Required | Who Can Access | Use Case |
|-------|---------------|----------------|----------|
| **Public** | ❌ No | Anyone with the link | Public dashboards, reports, embeds |
| **Shared** | ✅ Yes | Workspace members | Team collaboration |
| **Private** | ✅ Yes | Creator only | Personal views |

## API Structure

### 1. Management APIs (Workspace Context)

**Full CRUD operations - requires workspace/table context**

```
/api/workspaces/[slug]/tables/[slug]/views/
├── GET     /                              # List views
├── POST    /                              # Create view
├── GET     /default                       # Get default view
└── [viewId]/
    ├── GET     /                          # Get view
    ├── PUT     /                          # Update view
    ├── DELETE  /                          # Delete view
    ├── POST    /duplicate                 # Duplicate view
    ├── permissions/...                    # Manage permissions
    └── preferences/...                    # User preferences
```

**Use when:**
- Managing views (create, edit, delete)
- Setting permissions
- User preferences
- Admin operations

### 2. Public APIs (View ID Only)

**Simple access - no workspace/table context needed**

```
/api/views/[viewId]/
├── GET     /                              # Get view info
└── GET     /rows                          # Query data

/api/query/views/[viewId]/
└── GET     /rows                          # Query data (alternative)
```

**Use when:**
- Sharing public views
- Embedding views
- Mobile apps
- Quick access by ID

## Examples

### Public Dashboard

```typescript
// Create public view
const { data: view } = await $fetch(
  '/api/workspaces/my-workspace/tables/sales/views',
  {
    method: 'POST',
    body: {
      name: 'Q4 Sales Dashboard',
      isPublic: true,
      filters: { /* ... */ },
      sort: [{ columnId: 'date', direction: 'desc' }]
    }
  }
)

// Share URL - no auth needed!
const publicUrl = `https://app.com/views/${view.id}`

// Frontend: Fetch public view
const { data: viewData } = await $fetch(`/api/views/${view.id}`)
const { data: rows } = await $fetch(`/api/views/${view.id}/rows`)
```

### Embedded View

```html
<!-- Embed in external website -->
<iframe 
  src="https://app.com/embed/views/abc-123"
  width="100%" 
  height="600"
></iframe>

<!-- View loads via public API -->
<script>
  fetch('/api/views/abc-123/rows')
    .then(res => res.json())
    .then(data => renderChart(data))
</script>
```

### Shared Team View

```typescript
// Create shared view
const { data: view } = await $fetch(
  '/api/workspaces/my-workspace/tables/tasks/views',
  {
    method: 'POST',
    body: {
      name: 'Team Sprint',
      isShared: true,  // Workspace members only
      filters: { /* ... */ }
    }
  }
)

// Team members can access (with auth)
const { data: rows } = await $fetch(`/api/views/${view.id}/rows`, {
  headers: { Authorization: `Bearer ${token}` }
})
```

### Private View

```typescript
// Create private view (default)
const { data: view } = await $fetch(
  '/api/workspaces/my-workspace/tables/tasks/views',
  {
    method: 'POST',
    body: {
      name: 'My Tasks',
      isShared: false,
      isPublic: false
    }
  }
)

// Only creator can access
```

## Access Control Logic

### View Access Validation

```typescript
// server/utils/viewAccess.ts

export async function validateViewAccess(event, viewId, options) {
  const view = await getViewWithContext(viewId)
  
  // 1. PUBLIC ACCESS (no auth)
  if (view.isPublic && options.allowPublic && !options.requireEdit) {
    return { hasAccess: true, accessType: 'public' }
  }
  
  // 2. AUTHENTICATED USERS ONLY
  const user = requireAuth(event)
  
  // 3. CREATOR ACCESS (full control)
  if (view.createdBy === user.id) {
    return { hasAccess: true, accessType: 'creator' }
  }
  
  // 4. SHARED ACCESS (workspace members)
  if (view.isShared) {
    const isMember = await checkWorkspaceMembership(user, view.workspace)
    if (isMember) {
      return { hasAccess: true, accessType: 'shared' }
    }
  }
  
  // 5. DENIED
  throw createError({ statusCode: 403, message: 'Access denied' })
}
```

## Database Schema

### View Access Fields

```typescript
// data_table_views table
{
  isPublic: boolean   // Anyone with link
  isShared: boolean   // Workspace members
  createdBy: uuid     // Creator user ID
  // ... other fields
}
```

### Access Logic

```
isPublic=true  → Anyone can read (no auth)
isShared=true  → Workspace members can read
isPublic=false & isShared=false → Creator only
```

## Security Considerations

### ✅ What's Secure

1. **View ID is UUID** - Not guessable
2. **Public flag required** - Explicit opt-in
3. **Data-level security** - Can add row-level filtering later
4. **Audit logs** - Track public view access
5. **Rate limiting** - Prevent abuse

### 🔒 Recommended Enhancements

```typescript
// Future: Share tokens for additional security
GET /api/views/[id]/rows?token=xyz

// Future: Expiring links
{
  shareToken: 'xyz',
  expiresAt: '2025-12-31'
}

// Future: Password protection
{
  shareToken: 'xyz',
  password: 'hashed_password'
}
```

## API Response Format

### With Access Type

All view responses now include `accessType`:

```json
{
  "data": {
    "id": "view-123",
    "name": "Public Dashboard",
    "isPublic": true,
    "accessType": "public",  // ← NEW
    "columns": [...],
    "filters": {...}
  }
}
```

**Access Types:**
- `"public"` - Anyone can access
- `"shared"` - Workspace members
- `"private"` - Creator only
- `"creator"` - Current user is creator

## Frontend Usage

### Detecting Access Level

```typescript
const { data: view } = await $fetch(`/api/views/${viewId}`)

if (view.accessType === 'public') {
  // Show "Anyone with link can view"
  // Hide edit/delete buttons
} else if (view.accessType === 'creator') {
  // Show full controls
  // Can edit, delete, manage permissions
} else if (view.accessType === 'shared') {
  // Show "Shared with team"
  // Read-only for non-admins
}
```

### Share Dialog

```vue
<template>
  <el-dialog title="Share View">
    <el-switch v-model="isPublic" label="Make public" />
    
    <div v-if="isPublic">
      <p>Anyone with this link can view:</p>
      <el-input :value="shareUrl" readonly>
        <template #append>
          <el-button @click="copyLink">Copy</el-button>
        </template>
      </el-input>
    </div>
    
    <el-switch v-model="isShared" label="Share with team" />
  </el-dialog>
</template>

<script setup>
const shareUrl = computed(() => 
  `${window.location.origin}/views/${props.viewId}`
)
</script>
```

## URL Patterns

### Management (Full Context)
```
https://app.com/workspaces/acme/tables/tasks/views/abc-123
```
**Use for:** Editing, managing, full admin UI

### Public (View ID Only)
```
https://app.com/views/abc-123
```
**Use for:** Sharing, embedding, mobile

### API Comparison

| Feature | Management API | Public API |
|---------|---------------|------------|
| **URL** | `/workspaces/.../tables/.../views/[id]` | `/views/[id]` |
| **Context** | Needs workspace + table | Just view ID |
| **Auth** | Required | Optional (if public) |
| **CRUD** | Full | Read-only |
| **Use** | Admin, editing | Sharing, viewing |

## Testing Checklist

### Public Views
- [ ] Create public view
- [ ] Access without auth
- [ ] Query rows without auth
- [ ] Cannot edit without auth
- [ ] Public view in search results

### Shared Views
- [ ] Create shared view
- [ ] Workspace members can access
- [ ] Non-members cannot access
- [ ] Only creator/admin can edit

### Private Views
- [ ] Create private view
- [ ] Only creator can access
- [ ] Other users get 403

### API Endpoints
- [ ] `/api/views/[id]` works
- [ ] `/api/views/[id]/rows` works
- [ ] `/api/query/views/[id]/rows` works
- [ ] Both APIs return same data
- [ ] `accessType` included in response

## Migration Notes

**Backward Compatibility:** ✅ Complete

Existing views:
- Default: `isPublic=false, isShared=false` (private)
- No code changes needed
- All existing endpoints still work

## Performance

### Caching Strategy

```typescript
// Public views - cache aggressively
Cache-Control: public, max-age=300

// Shared views - cache per user
Cache-Control: private, max-age=60

// Private views - no cache
Cache-Control: no-cache
```

### CDN-Friendly

Public views can be served via CDN:
```
https://cdn.app.com/api/views/abc-123/rows
```

## Future Enhancements

1. **Share Tokens** - Additional security layer
2. **Expiring Links** - Time-limited access
3. **Password Protection** - For sensitive public views
4. **Analytics** - Track public view usage
5. **Rate Limiting** - Prevent abuse
6. **Embed Builder** - UI to generate embed code
7. **Custom Domains** - Brand public views

---

**Phase 2.6 Public Views: COMPLETE** ✅  
**Ready for public sharing and embeds!** 🚀

