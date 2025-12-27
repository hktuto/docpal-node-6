# Phase 2.6 Views System - Complete API Structure

**Status**: ✅ Complete  
**Date**: December 27, 2025

## Complete Dual API Structure

### Management APIs (Workspace Context - Full CRUD)

```
/api/workspaces/[workspaceSlug]/tables/[tableSlug]/views/
│
├── GET     /                                  List all views
├── POST    /                                  Create new view
├── GET     /default                           Get default view
│
└── [viewId]/
    │
    ├── GET     /                              Get specific view
    ├── PUT     /                              Update view
    ├── DELETE  /                              Delete view
    ├── POST    /duplicate                     Duplicate view
    │
    ├── permissions/
    │   ├── GET     /                          List permissions
    │   ├── POST    /                          Add permission
    │   │
    │   └── [permissionId]/
    │       └── DELETE  /                      Remove permission
    │
    └── preferences/
        ├── GET     /                          Get user preferences
        └── PUT     /                          Update user preferences
```

### Public APIs (View ID Only - Simple Access) ✨ NEW

```
/api/views/[viewId]/
│
├── GET     /                                  Get view (public-friendly!)
└── GET     /rows                              Query rows (public-friendly!)

/api/query/views/[viewId]/
│
└── GET     /rows                              Query rows (alternative)
```

## Summary by Resource

### Management APIs (Under Workspace Context)

**Views (7 endpoints)**
1. `GET    /workspaces/[slug]/tables/[slug]/views` - List all
2. `POST   /workspaces/[slug]/tables/[slug]/views` - Create
3. `GET    /workspaces/[slug]/tables/[slug]/views/default` - Get default
4. `GET    /workspaces/[slug]/tables/[slug]/views/:id` - Get one
5. `PUT    /workspaces/[slug]/tables/[slug]/views/:id` - Update
6. `DELETE /workspaces/[slug]/tables/[slug]/views/:id` - Delete
7. `POST   /workspaces/[slug]/tables/[slug]/views/:id/duplicate` - Duplicate

**Permissions (3 endpoints)**
8. `GET    /workspaces/[slug]/tables/[slug]/views/:id/permissions` - List
9. `POST   /workspaces/[slug]/tables/[slug]/views/:id/permissions` - Add
10. `DELETE /workspaces/[slug]/tables/[slug]/views/:id/permissions/:permissionId` - Remove

**Preferences (2 endpoints)**
11. `GET    /workspaces/[slug]/tables/[slug]/views/:id/preferences` - Get
12. `PUT    /workspaces/[slug]/tables/[slug]/views/:id/preferences` - Update

### Public APIs (View ID Only) ✨ NEW

**Simple Access (3 endpoints)**
13. `GET    /api/views/:id` - Get view (public-friendly)
14. `GET    /api/views/:id/rows` - Query rows (public-friendly)
15. `GET    /api/query/views/:id/rows` - Query rows (alternative)

**Total: 15 API Endpoints** ✅

---

## File Structure

```
server/api/
├── workspaces/
│   └── [workspaceSlug]/
│       └── tables/
│           └── [tableSlug]/
│               └── views/
│                   ├── index.get.ts
│                   ├── index.post.ts
│                   ├── default.get.ts
│                   └── [viewId]/
│                       ├── index.get.ts
│                       ├── index.put.ts
│                       ├── index.delete.ts
│                       ├── duplicate.post.ts
│                       ├── permissions/
│                       │   ├── index.get.ts
│                       │   ├── index.post.ts
│                       │   └── [permissionId]/
│                       │       └── index.delete.ts
│                       └── preferences/
│                           ├── index.get.ts
│                           └── index.put.ts
└── query/
    └── views/
        └── [viewId]/
            └── rows/
                └── index.get.ts
```

---

## Dual API Architecture ✅

### Why Two API Structures?

**Management APIs** (Full Context)
- ✅ Needs workspace/table context for CRUD
- ✅ Required for permissions and management
- ✅ Full admin capabilities
- ✅ Used in main app UI

**Public APIs** (View ID Only)
- ✅ No context needed - just view ID
- ✅ Public sharing without auth
- ✅ Embeddable in external sites
- ✅ Mobile-friendly URLs
- ✅ CDN-cacheable

### URL Comparison

| Purpose | Management API | Public API |
|---------|---------------|------------|
| **Get View** | `/workspaces/acme/tables/tasks/views/abc-123` | `/views/abc-123` |
| **Query Data** | `/workspaces/acme/tables/tasks/views/abc-123/rows` | `/views/abc-123/rows` |
| **Share Link** | ❌ Too long | ✅ Clean & simple |
| **Embed** | ❌ Requires context | ✅ Just view ID |
| **Auth** | Always required | Optional (if public) |

## RESTful Naming Conventions ✅

### What We're Doing RIGHT:

1. **Nested Resources**
   - Views belong to tables: `/tables/:slug/views`
   - Permissions belong to views: `/views/:id/permissions`
   - Preferences belong to views: `/views/:id/preferences`

2. **Index Routes**
   - `index.get.ts` for listing/getting
   - `index.post.ts` for creating
   - `index.put.ts` for updating
   - `index.delete.ts` for deleting

3. **Action Routes in Folders**
   - `/duplicate` as a POST action (not `/duplicate.post.ts`)
   - Folder structure: `[viewId]/duplicate.post.ts`

4. **Consistent HTTP Methods**
   - GET for reading
   - POST for creating
   - PUT for updating
   - DELETE for deleting

### Why This Structure is Better:

**Before (Inconsistent):**
```
views/
├── [viewId].get.ts        ❌ File-based dynamic route
├── [viewId].put.ts        ❌ File-based dynamic route
├── [viewId].delete.ts     ❌ File-based dynamic route
└── [viewId]/
    └── duplicate.post.ts  ❌ Inconsistent nesting
```

**After (RESTful):**
```
views/
├── index.get.ts           ✅ List endpoint
├── index.post.ts          ✅ Create endpoint
└── [viewId]/
    ├── index.get.ts       ✅ Get single
    ├── index.put.ts       ✅ Update
    ├── index.delete.ts    ✅ Delete
    └── duplicate.post.ts  ✅ Action endpoint
```

---

## URL Structure Examples

### View Management
```
GET    /api/workspaces/my-workspace/tables/tasks/views
POST   /api/workspaces/my-workspace/tables/tasks/views
GET    /api/workspaces/my-workspace/tables/tasks/views/default
GET    /api/workspaces/my-workspace/tables/tasks/views/view-123
PUT    /api/workspaces/my-workspace/tables/tasks/views/view-123
DELETE /api/workspaces/my-workspace/tables/tasks/views/view-123
POST   /api/workspaces/my-workspace/tables/tasks/views/view-123/duplicate
```

### Permissions
```
GET    /api/workspaces/my-workspace/tables/tasks/views/view-123/permissions
POST   /api/workspaces/my-workspace/tables/tasks/views/view-123/permissions
DELETE /api/workspaces/my-workspace/tables/tasks/views/view-123/permissions/perm-456
```

### Preferences
```
GET    /api/workspaces/my-workspace/tables/tasks/views/view-123/preferences
PUT    /api/workspaces/my-workspace/tables/tasks/views/view-123/preferences
```

---

## HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Successful GET, PUT, DELETE |
| 201 | Successful POST (resource created) |
| 400 | Bad request (validation error) |
| 403 | Forbidden (permission denied) |
| 404 | Resource not found |
| 500 | Server error |

---

## Response Format

All endpoints use `successResponse()` wrapper:

```typescript
{
  data: <response_data>
}
```

### Examples:

**Single Resource:**
```json
{
  "data": {
    "id": "view-123",
    "name": "Active Tasks",
    "viewType": "grid",
    ...
  }
}
```

**List of Resources:**
```json
{
  "data": [
    { "id": "view-1", "name": "View 1", ... },
    { "id": "view-2", "name": "View 2", ... }
  ]
}
```

**Success Message:**
```json
{
  "data": {
    "message": "View deleted successfully"
  }
}
```

---

## Authentication & Authorization

### Middleware Chain:

1. **Auth Middleware** (`@server/middleware/00.auth.ts`)
   - Validates session
   - Loads user context

2. **Workspace Middleware** (`@server/middleware/01.workspace.ts`)
   - Validates workspace access
   - Loads workspace context

3. **Route Handlers**
   - `requireAuth(event)` - Requires authenticated user
   - `requireCompany(event)` - Requires company context

### Permission Checks:

```typescript
// View creator
if (view.createdBy === user.id) { ... }

// Company admin
if (user.company.role === 'admin') { ... }

// View visibility
if (view.isPublic || view.isShared || view.createdBy === user.id) { ... }
```

---

## Database Schema

### Tables Involved:

1. **`data_table_views`** - View definitions
2. **`view_permissions`** - Access control
3. **`user_view_preferences`** - User customizations

### Relationships:

```
data_tables
    ↓ (has many)
data_table_views
    ↓ (has many)
view_permissions
    ↓ (references)
users

data_table_views
    ↓ (has many)
user_view_preferences
    ↓ (references)
users
```

---

## Testing Coverage

### Manual Testing Checklist:

**Views:**
- [ ] List views for a table
- [ ] Create view with filters
- [ ] Create view with sorts
- [ ] Get default view
- [ ] Get specific view
- [ ] Update view
- [ ] Set view as default
- [ ] Duplicate view
- [ ] Delete view
- [ ] Cannot delete default view

**Permissions:**
- [ ] List permissions (as creator)
- [ ] Add user permission
- [ ] Add role permission
- [ ] Remove permission
- [ ] Non-creator cannot add permission
- [ ] Non-creator cannot remove permission

**Preferences:**
- [ ] Get preferences (none set)
- [ ] Create preferences
- [ ] Update existing preferences
- [ ] Preferences are user-specific

**Filters:**
- [ ] All 13 operators work
- [ ] Nested AND/OR conditions
- [ ] Invalid filter validation
- [ ] Empty filters

**Sorts:**
- [ ] Single column sort
- [ ] Multi-column sort
- [ ] Invalid sort validation

---

## Performance Considerations

### Indexing Recommendations:

```sql
-- Views table
CREATE INDEX idx_views_table_id ON data_table_views(data_table_id);
CREATE INDEX idx_views_created_by ON data_table_views(created_by);
CREATE INDEX idx_views_is_default ON data_table_views(is_default);

-- Permissions table
CREATE INDEX idx_permissions_view_id ON view_permissions(view_id);
CREATE INDEX idx_permissions_user_id ON view_permissions(user_id);

-- Preferences table
CREATE INDEX idx_preferences_view_user ON user_view_preferences(view_id, user_id);
```

### Caching Strategy:

- **Views list:** Cache per table (invalidate on create/update/delete)
- **Default view:** Cache per table (invalidate on default change)
- **User preferences:** Cache per user per view (invalidate on update)

---

## Next Steps

### Frontend Components Needed:

1. **ViewSwitcher.vue** - Dropdown to switch between views
2. **FilterBuilder.vue** - Visual filter creation UI
3. **SortBuilder.vue** - Sort configuration UI
4. **ViewDialog.vue** - Create/edit view modal
5. **ShareViewDialog.vue** - Manage permissions
6. **ViewToolbar.vue** - Quick actions (filter, sort, share)

### Integration Points:

- **Table page** - Use views to query and display data
- **DataGrid** - Apply view's column visibility and widths
- **Row queries** - Use `/api/query/views/:id/rows` endpoint

---

**Phase 2.6.1 Backend: COMPLETE** ✅  
**API Structure: RESTful & Consistent** ✅  
**Ready for Frontend Development** ✅

