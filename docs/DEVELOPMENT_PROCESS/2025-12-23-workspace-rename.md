# December 23, 2025 - Apps → Workspaces Rename

## Summary

Completed a comprehensive refactoring to rename "Apps" to "Workspaces" throughout the entire codebase. This change better reflects the purpose of these entities as data workspace containers and prepares the platform for a future "Apps" feature.

## Motivation

The original "Apps" naming was confusing because:
1. They're not applications in the traditional sense - they're data workspace containers
2. We want to build a future feature called "Apps" that will be actual custom applications with pages and navigation
3. "Workspaces" is more intuitive and aligns with similar platforms (Notion, Confluence, ClickUp)

## New Architecture Hierarchy

```
Company (Tenant)
└─ Workspaces (Data containers - formerly "Apps")
    └─ Tables (Structured data)
        ├─ Views (Different visualizations)
        ├─ Dashboards (Analytics)
        └─ Apps (Future: Custom UI/UX experiences)
```

## Changes Made

### 1. Database Schema ✅
- Renamed `apps` table → `workspaces`
- Renamed `data_tables.app_id` → `data_tables.workspace_id`
- Updated foreign key references
- Created migration: `0002_rename_apps_to_workspaces.sql`

### 2. Shared Types ✅
- `App` type → `Workspace` type
- `NewApp` type → `NewWorkspace` type
- Updated all type imports

### 3. API Endpoints ✅
- `/api/apps/*` → `/api/workspaces/*`
- `[appSlug]` parameter → `[workspaceSlug]`
- Updated all 20+ API endpoint files
- Updated event context references

### 4. Server Middleware & Utils ✅
- `server/middleware/1.app.ts` → `server/middleware/1.workspace.ts`
- Updated middleware to match `/api/workspaces/:workspaceSlug/*` routes
- `event.context.app` → `event.context.workspace`
- `event.context.appId` → `event.context.workspaceId`
- Updated audit logging: `auditAppOperation` → `auditWorkspaceOperation`
- Updated entity type in audit logs: `'app'` → `'workspace'`

### 5. Frontend Pages ✅
- `/pages/apps/*` → `/pages/workspaces/*`
- `[appSlug]` folder → `[workspaceSlug]`
- Updated all page routes and navigation

### 6. Composables ✅
- `useAppContext.ts` → `useWorkspaceContext.ts`
- `AppContext` interface → `WorkspaceContext` interface
- `AppContextKey` → `WorkspaceContextKey`
- Updated all method names:
  - `app` → `workspace`
  - `appSlug` → `workspaceSlug`
  - `appId` → `workspaceId`
  - `appName` → `workspaceName`
  - `refreshApp` → `refreshWorkspace`
  - `updateApp` → `updateWorkspace`
  - `deleteApp` → `deleteWorkspace`
  - `navigateToApp` → `navigateToWorkspace`
  - `getAppPath` → `getWorkspacePath`

### 7. Components ✅
Updated all component references:
- `app/layouts/app.vue` - Main workspace layout
- `app/pages/workspaces/index.vue` - Workspace list
- `app/pages/workspaces/[workspaceSlug]/*` - All workspace pages
- `app/components/app/menu/Menu.vue`
- `app/components/app/table/*` - Table dialogs
- `app/components/app/AppCard.vue` - Workspace card component
- All API calls updated to use `/api/workspaces/`

### 8. Documentation ✅
- Updated `docs/README.md` with new architecture
- Created this migration log
- Added note about the rename

## Files Changed

**Backend (40+ files)**:
- `server/db/schema/workspace.ts` (renamed from app.ts)
- `server/db/schema/dataTable.ts`
- `server/api/workspaces/**/*.ts` (20+ files)
- `server/middleware/1.workspace.ts`
- `server/utils/audit.ts`
- `server/types/context.d.ts`
- `shared/types/db.ts`

**Frontend (15+ files)**:
- `app/composables/useWorkspaceContext.ts`
- `app/layouts/app.vue`
- `app/pages/workspaces/**/*.vue`
- `app/components/app/**/*.vue`
- `app/components/common/menu/*.vue`

**Database**:
- New migration: `0002_rename_apps_to_workspaces.sql`

## Migration Path

To apply this change to an existing database:

```bash
# Run the migration
npm run db:migrate

# Or manually execute:
psql -d your_database -f server/db/migrations/postgresql/0002_rename_apps_to_workspaces.sql
```

The migration will:
1. Rename the `apps` table to `workspaces`
2. Rename the `app_id` column to `workspace_id` in `data_tables`
3. Update constraint names
4. Update audit log entity types

## Breaking Changes

⚠️ **API Endpoints Changed**:
- All `/api/apps/*` endpoints are now `/api/workspaces/*`
- Route parameter `appSlug` is now `workspaceSlug`

⚠️ **Frontend Routes Changed**:
- All `/apps/*` routes are now `/workspaces/*`

⚠️ **Type Changes**:
- `App` type is now `Workspace`
- `useAppContext()` is now `useWorkspaceContext()`

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Workspace CRUD operations work
- [ ] Table creation within workspaces works
- [ ] Navigation between workspaces works
- [ ] Menu management in workspaces works
- [ ] Audit logs record workspace operations
- [ ] All API endpoints respond correctly
- [ ] Frontend routing works
- [ ] No console errors

## Next Steps

1. Test the migration on development database
2. Verify all functionality works
3. Update any external documentation or API consumers
4. Plan for future "Apps" feature (custom page collections)

## Notes

- All references to "app" in variable names, functions, and comments have been updated to "workspace"
- The database table is now called `workspaces` instead of `apps`
- The audit log entity type has been updated from 'app' to 'workspace'
- This change is backward-incompatible and requires a database migration

---

**Completed**: December 23, 2025  
**Estimated Time**: 2-3 hours  
**Files Modified**: 60+ files  
**Lines Changed**: 500+ lines

