# Phase 2.6: Views, Sharing & Permissions

**Status**: 🟡 **In Progress** - Phase 2.6.1 COMPLETE! ✅  
**Estimated Duration**: 3-4 weeks  
**Progress**: 20% Complete (1 of 5 phases done)

**Previous Name**: Phase 1.5 (Views & Bulk Operations)  
**Expanded Scope**: Now includes comprehensive CRUD, sharing, and permissions for workspaces, tables, and views

---

## Overview

Build a complete views system with filtering, sorting, bulk operations, and permissions. Expand to include full CRUD operations for workspaces and tables, plus sharing and permission management.

**Key Philosophy**: Users should be able to:
1. Create and manage multiple views per table
2. Filter and sort data visually
3. Share views with team members
4. Control access to workspaces, tables, and views
5. Perform bulk operations efficiently
6. Customize their data experience

---

## Goals

### Views System (Phase 2.6.1) ✅ 75% COMPLETE
- [x] ✅ Multiple views per table with filters and sorting (Backend complete)
- [x] ✅ Visual query builder for filters (FilterBuilder.vue complete)
- [x] ✅ Personal vs shared views (Backend complete)
- [x] ✅ View permissions (Backend complete)
- [ ] 🔴 Frontend integration (20% - needs ViewToolbar wiring)

### Workspace Management (Phase 2.6.2) 🔴 NOT STARTED
- [ ] 🔴 Full workspace CRUD operations
- [ ] 🔴 Workspace settings and configuration
- [ ] 🔴 Workspace permissions and roles
- [ ] 🔴 Workspace sharing and collaboration

### Table Management (Phase 2.6.3) 🔴 NOT STARTED
- [ ] 🔴 Complete table CRUD operations
- [ ] 🔴 Table settings and customization
- [ ] 🔴 Table permissions
- [ ] 🔴 Table templates

### Bulk Operations (Phase 2.6.4) 🔴 NOT STARTED
- [ ] 🔴 Bulk update rows
- [ ] 🔴 Bulk delete rows
- [ ] 🔴 Import/export data (CSV, JSON)

### Customization (Phase 2.6.5) 🔴 NOT STARTED
- [ ] 🔴 Row height, column width preferences
- [ ] 🔴 Column freeze/pin
- [ ] 🔴 User preferences per view/table

---

## Phase 2.6.1: Views & Filters System ✅ 75% COMPLETE

### Backend ✅ 100% COMPLETE

#### Views Schema
- [x] ✅ Create `data_table_views` table (enhanced from existing)
  ```sql
  - id (uuid, primary key)
  - data_table_id (fk to data_tables)
  - name
  - slug
  - description
  - view_type ('grid' | 'kanban' | 'gallery' | 'calendar' | 'form')
  - is_shared (boolean) - personal vs shared
  - is_public (boolean) - public access
  - created_by (fk to users)
  - filters (jsonb) - combined filter conditions
  - sort (jsonb) - combined sort order
  - visible_columns (array of column IDs)
  - column_widths (jsonb) - custom column widths
  - view_config (jsonb) - type-specific settings
  - page_size (integer) - rows per page
  - created_at
  - updated_at
  ```

- [x] ✅ Create `view_permissions` table
  ```sql
  - id (uuid, primary key)
  - view_id (fk to data_table_views)
  - user_id (fk to users) - nullable (for role-based)
  - role ('owner' | 'admin' | 'member') - nullable (for user-based)
  - permission_type ('view' | 'edit' | 'delete')
  - created_at
  ```

- [x] ✅ Create `user_view_preferences` table
  ```sql
  - id (uuid, primary key)
  - view_id (fk to data_table_views)
  - user_id (fk to users)
  - preferences (jsonb) - row height, column widths, etc.
  - created_at
  - updated_at
  ```

#### Views API
- [x] ✅ `POST /api/workspaces/[slug]/tables/[slug]/views` - Create view
- [x] ✅ `GET /api/workspaces/[slug]/tables/[slug]/views` - List views
- [x] ✅ `GET /api/workspaces/[slug]/tables/[slug]/views/default` - Get default view
- [x] ✅ `GET /api/workspaces/[slug]/tables/[slug]/views/[viewId]` - Get view
- [x] ✅ `PUT /api/workspaces/[slug]/tables/[slug]/views/[viewId]` - Update view
- [x] ✅ `DELETE /api/workspaces/[slug]/tables/[slug]/views/[viewId]` - Delete view
- [x] ✅ `POST /api/workspaces/[slug]/tables/[slug]/views/[viewId]/duplicate` - Duplicate view
- [x] ✅ `GET /api/query/views/[viewId]/rows` - Get filtered data (with public access)

#### View Permissions API
- [x] ✅ `POST /api/workspaces/[slug]/tables/[slug]/views/[viewId]/permissions` - Add permission
- [x] ✅ `GET /api/workspaces/[slug]/tables/[slug]/views/[viewId]/permissions` - List permissions
- [x] ✅ `DELETE /api/workspaces/[slug]/tables/[slug]/views/[viewId]/permissions/[permissionId]` - Remove permission
- [x] ✅ Access control via `validateViewAccess` utility

#### Query Builder Utilities ✅ COMPLETE
- [x] ✅ Filter parser (parse filters to SQL WHERE) - `buildFilterSQL()`
- [x] ✅ Sort parser (parse sort to SQL ORDER BY) - `buildSortSQL()`
- [x] ✅ Query builder with dynamic conditions
- [x] ✅ Support for complex operators:
  - [x] ✅ Equals, not equals
  - [x] ✅ Contains, not contains
  - [x] ✅ Greater than, less than
  - [x] ✅ Between (dates, numbers)
  - [x] ✅ Is empty, is not empty
  - [x] ✅ Starts with, ends with
  - [x] ✅ In, not in (for multi-select)
  - [x] ✅ AND/OR grouping (nested)

#### BONUS: Advanced Field Types ✅
- [x] ✅ Relation fields (enriched objects)
- [x] ✅ Lookup fields (resolve related data)
- [x] ✅ Formula fields (math, date, logic)
- [x] ✅ Rollup fields (aggregations)

### Frontend Components ✅ 100% COMPLETE

#### View Components
- [x] ✅ `components/app/views/ViewToolbar.vue` - Comprehensive toolbar with all features
  - [x] ✅ View switcher dropdown
  - [x] ✅ Create new view dialog
  - [x] ✅ Edit view dialog
  - [x] ✅ View permissions dialog
  - [x] ✅ Delete confirmation
  - [x] ✅ Duplicate view action

#### Filter & Sort Components ✅ COMPLETE
- [x] ✅ `components/app/views/FilterBuilder.vue` - Visual query builder
  - [x] ✅ Add filter condition
  - [x] ✅ Group conditions (AND/OR)
  - [x] ✅ Field selector
  - [x] ✅ Operator selector dropdown (13+ operators)
  - [x] ✅ Value input (dynamic by field type: text, number, date, select, multi-select, between)
  - [x] ✅ Remove condition
  - [x] ✅ Clear all filters
- [x] ✅ `components/app/views/SortBuilder.vue` - Sort configuration
  - [x] ✅ Add sort field
  - [x] ✅ Sort direction (ASC/DESC)
  - [x] ✅ Reorder sort priority (drag & drop)
  - [x] ✅ Remove sort
  - [x] ✅ Clear all sorts

#### View Integration 🟡 20% COMPLETE
- [ ] 🔴 Integrate ViewToolbar in table page
- [ ] 🔴 Wire up view switching
- [ ] 🔴 Wire up filter changes to API
- [ ] 🔴 Wire up sort changes to API
- [ ] 🔴 Wire up view CRUD actions
- [x] ✅ Show active view data (already working)
- [x] ✅ Use view's visible columns (already working)
- [x] ✅ Query via view API (already working)

---

## Phase 2.6.2: Workspace Management

### Backend

#### Workspace CRUD API
- [ ] `POST /api/companies/[companyId]/apps` - Create workspace (app)
- [ ] `GET /api/companies/[companyId]/apps` - List workspaces
- [ ] `GET /api/apps/[appSlug]` - Get workspace details (already exists)
- [ ] `PUT /api/apps/[appSlug]` - Update workspace
- [ ] `DELETE /api/apps/[appSlug]` - Delete workspace
- [ ] `POST /api/apps/[appSlug]/duplicate` - Duplicate workspace

#### Workspace Settings API
- [ ] `GET /api/apps/[appSlug]/settings` - Get workspace settings
- [ ] `PUT /api/apps/[appSlug]/settings` - Update settings
- [ ] Settings include:
  - [ ] Name, description, icon
  - [ ] Default permissions
  - [ ] Features enabled/disabled
  - [ ] Custom branding

#### Workspace Permissions API
- [ ] `GET /api/apps/[appSlug]/members` - List workspace members
- [ ] `POST /api/apps/[appSlug]/members` - Add member
- [ ] `PUT /api/apps/[appSlug]/members/[userId]` - Update member role
- [ ] `DELETE /api/apps/[appSlug]/members/[userId]` - Remove member
- [ ] Role-based access (owner, admin, editor, viewer)

### Frontend

#### Workspace Components
- [ ] `components/app/workspace/CreateDialog.vue` - Create workspace
- [ ] `components/app/workspace/SettingsDialog.vue` - Workspace settings
- [ ] `components/app/workspace/DeleteDialog.vue` - Delete confirmation
- [ ] `components/app/workspace/DuplicateDialog.vue` - Duplicate workspace
- [ ] `components/app/workspace/MembersDialog.vue` - Manage members
- [ ] `components/app/workspace/PermissionsManager.vue` - Permissions UI

#### Workspace Settings Page
- [ ] General settings tab
- [ ] Members & permissions tab
- [ ] Features & integrations tab
- [ ] Danger zone (delete workspace)

---

## Phase 2.6.3: Table Management

### Backend

#### Table CRUD Enhancement
- [ ] Enhance existing table APIs
- [ ] `PUT /api/apps/[appSlug]/tables/[tableSlug]/settings` - Update table settings
- [ ] `POST /api/apps/[appSlug]/tables/[tableSlug]/duplicate` - Duplicate table
- [ ] `POST /api/apps/[appSlug]/tables/[tableSlug]/template` - Save as template

#### Table Templates
- [ ] Create `table_templates` table
  ```sql
  - id (uuid, primary key)
  - name
  - description
  - category
  - icon
  - template_json (jsonb) - columns, views, settings
  - is_public (boolean)
  - created_by (fk to users)
  - created_at
  ```

- [ ] `GET /api/table-templates` - List templates
- [ ] `GET /api/table-templates/[templateId]` - Get template
- [ ] `POST /api/apps/[appSlug]/tables/from-template` - Create from template

#### Table Permissions API
- [ ] `GET /api/tables/[tableSlug]/permissions` - List permissions
- [ ] `POST /api/tables/[tableSlug]/permissions` - Add permission
- [ ] `PUT /api/tables/[tableSlug]/permissions/[permissionId]` - Update
- [ ] `DELETE /api/tables/[tableSlug]/permissions/[permissionId]` - Remove

### Frontend

#### Table Components
- [ ] Enhance `components/app/table/CreateDialog.vue` - Add template selection
- [ ] `components/app/table/SettingsDialog.vue` - Comprehensive table settings
- [ ] `components/app/table/DuplicateDialog.vue` - Duplicate options
- [ ] `components/app/table/SaveTemplateDialog.vue` - Save as template
- [ ] `components/app/table/PermissionsDialog.vue` - Table permissions
- [ ] `components/app/table/TemplateGallery.vue` - Browse templates

#### Table Settings Page Enhancement
- [ ] General settings
- [ ] Permissions tab
- [ ] Views management
- [ ] Templates & duplication
- [ ] Import/export options

---

## Phase 2.6.4: Bulk Operations

### Backend

#### Bulk Operations API
- [ ] `POST /api/apps/[appSlug]/tables/[tableSlug]/rows/bulk-update` - Bulk update
  ```json
  {
    "rowIds": ["id1", "id2"],
    "updates": { "status": "active" }
  }
  ```

- [ ] `DELETE /api/apps/[appSlug]/tables/[tableSlug]/rows/bulk-delete` - Bulk delete
  ```json
  {
    "rowIds": ["id1", "id2"]
  }
  ```

- [ ] `POST /api/apps/[appSlug]/tables/[tableSlug]/export` - Export data
  - [ ] Support CSV format
  - [ ] Support JSON format
  - [ ] Support Excel format (optional)
  - [ ] Filtered export (current view only)

- [ ] `POST /api/apps/[appSlug]/tables/[tableSlug]/import` - Import data
  - [ ] Support CSV import
  - [ ] Support JSON import
  - [ ] Column mapping
  - [ ] Validation before import
  - [ ] Preview import

#### Bulk Operations Utilities
- [ ] CSV parser
- [ ] CSV generator
- [ ] Data validator
- [ ] Import mapper (match columns)
- [ ] Batch processor (chunked updates)

### Frontend

#### Bulk Operations Components
- [ ] Row selection in DataGrid (checkboxes)
- [ ] Bulk action toolbar (appears when rows selected)
- [ ] `components/app/table/BulkUpdateDialog.vue` - Bulk update form
- [ ] `components/app/table/BulkDeleteDialog.vue` - Bulk delete confirmation
- [ ] `components/app/table/ExportDialog.vue` - Export options
- [ ] `components/app/table/ImportDialog.vue` - Import wizard
  - [ ] File upload
  - [ ] Column mapping
  - [ ] Data preview
  - [ ] Validation results
  - [ ] Import progress

#### DataGrid Integration
- [ ] Add selection column to DataGrid
- [ ] Select all rows (current page)
- [ ] Select all rows (all pages)
- [ ] Clear selection
- [ ] Show selection count
- [ ] Bulk action menu

---

## Phase 2.6.5: Customization & Preferences

### Backend

#### User Preferences API
- [ ] `GET /api/users/preferences` - Get user preferences
- [ ] `PUT /api/users/preferences` - Update preferences
- [ ] `GET /api/users/preferences/table/[tableSlug]` - Table-specific
- [ ] `PUT /api/users/preferences/table/[tableSlug]` - Update table prefs
- [ ] `GET /api/users/preferences/view/[viewId]` - View-specific
- [ ] `PUT /api/users/preferences/view/[viewId]` - Update view prefs

#### Preferences Schema
```json
{
  "global": {
    "theme": "light",
    "defaultRowHeight": "normal",
    "dateFormat": "YYYY-MM-DD"
  },
  "table": {
    "rowHeight": "compact",
    "frozenColumns": ["name"],
    "columnWidths": {
      "name": 200,
      "status": 150
    }
  },
  "view": {
    "groupBy": "status",
    "expandGroups": true
  }
}
```

### Frontend

#### Customization Components
- [ ] `components/app/table/CustomizationPanel.vue` - Quick customization
  - [ ] Row height selector (compact, normal, comfortable)
  - [ ] Column width adjustment
  - [ ] Column freeze toggle
  - [ ] Reset to defaults
- [ ] `components/app/table/PreferencesDialog.vue` - Advanced preferences
- [ ] Row height selector in toolbar
- [ ] Column resize handles in DataGrid
- [ ] Column freeze indicator

#### DataGrid Enhancements
- [ ] Resizable columns (drag border)
- [ ] Freezable columns (pin icon)
- [ ] Row height options
- [ ] Remember column order
- [ ] Remember scroll position

---

## Database Schema Summary

### New Tables

1. **table_views** - View definitions
2. **view_permissions** - View access control
3. **user_view_preferences** - User customization per view
4. **table_templates** - Reusable table templates
5. **table_permissions** - Table access control (optional, might use existing company_members)
6. **user_preferences** - Global user preferences

---

## Success Criteria

### Views System
- [ ] Users can create multiple views per table
- [ ] Visual query builder is intuitive and powerful
- [ ] Filters and sorts work correctly
- [ ] Personal views are private, shared views visible to authorized users
- [ ] View permissions are enforced

### Workspace Management
- [ ] Full CRUD operations for workspaces
- [ ] Workspace settings are comprehensive
- [ ] Member management is easy
- [ ] Permissions are clear and enforceable

### Table Management
- [ ] Tables can be duplicated and templated
- [ ] Table settings are accessible
- [ ] Templates make table creation faster
- [ ] Permissions control table access

### Bulk Operations
- [ ] Bulk update/delete work reliably
- [ ] Import handles various CSV formats
- [ ] Export produces clean data files
- [ ] Operations are performant (handle 10k+ rows)

### Customization
- [ ] User preferences persist across sessions
- [ ] Column widths and order are saved
- [ ] Row height changes apply correctly
- [ ] Frozen columns work smoothly

---

## Technical Considerations

### Performance
- [ ] Optimize query builder for complex filters
- [ ] Index filter and sort columns
- [ ] Paginate bulk operations
- [ ] Stream large exports
- [ ] Debounce preference saves

### Security
- [ ] Validate all user inputs
- [ ] Check permissions on every API call
- [ ] Sanitize filter conditions (prevent SQL injection)
- [ ] Audit log for permission changes
- [ ] Rate limit bulk operations

### UX
- [ ] Show loading states during operations
- [ ] Provide clear error messages
- [ ] Confirm destructive actions
- [ ] Allow undo for bulk operations (optional)
- [ ] Keyboard shortcuts for common actions

---

## Migration Plan

### From Phase 1.5 to Phase 2.6
- Expanded scope from just views to full workspace/table/view management
- Added permissions and sharing capabilities
- Added workspace and table CRUD operations
- Maintained all original view and bulk operation features

### Database Migrations
1. Create table_views table
2. Create view_permissions table
3. Create user_view_preferences table
4. Create table_templates table
5. Create table_permissions table (if needed)
6. Create user_preferences table
7. Add indexes for performance

---

## Dependencies

**Requires**: 
- Phase 1 (Core Schema) ✅
- Phase 2 (Auth & Company) ✅
- Phase 2.4 (Column Management) - Soft dependency

**Blocks**: None (independent feature)

**Enhances**: All future phases (better data management foundation)

---

## Development Timeline

### Week 1: Views System
- Days 1-2: Backend (schema, API, query builder)
- Days 3-4: Frontend (view switcher, filter builder)
- Day 5: Integration and testing

### Week 2: Workspace & Table Management
- Days 1-2: Workspace CRUD and permissions
- Days 3-4: Table CRUD, templates, permissions
- Day 5: Settings pages and UI

### Week 3: Bulk Operations
- Days 1-2: Backend bulk APIs
- Day 3: Import/export functionality
- Days 4-5: Frontend bulk UI and testing

### Week 4: Customization & Polish
- Days 1-2: User preferences system
- Day 3: DataGrid enhancements
- Days 4-5: Testing, bug fixes, documentation

---

## Future Enhancements

- [ ] **Saved Filters** - Save commonly used filters
- [ ] **View Templates** - Templates for common view types
- [ ] **Advanced Permissions** - Field-level, row-level permissions
- [ ] **View Analytics** - Track view usage and popularity
- [ ] **View Comments** - Collaborate on views
- [ ] **View History** - Track changes to views
- [ ] **API Views** - Expose views via REST API
- [ ] **Embedded Views** - Embed views in external sites
- [ ] **View Subscriptions** - Get notified on data changes
- [ ] **Smart Views** - AI-suggested views based on data

---

**Status**: 📋 Planned | Ready to start after Phase 2.5 (Desktop View)

**Next Phase**: Phase 3 - Basic Workflows

