# Phase 2.6: Views, Sharing & Permissions

**Status**: 📋 **Planned**  
**Estimated Duration**: 3-4 weeks

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

### Views System
- [ ] Multiple views per table with filters and sorting
- [ ] Visual query builder for filters
- [ ] Personal vs shared views
- [ ] View permissions (who can see/edit)

### Workspace Management
- [ ] Full workspace CRUD operations
- [ ] Workspace settings and configuration
- [ ] Workspace permissions and roles
- [ ] Workspace sharing and collaboration

### Table Management
- [ ] Complete table CRUD operations
- [ ] Table settings and customization
- [ ] Table permissions
- [ ] Table templates

### Bulk Operations
- [ ] Bulk update rows
- [ ] Bulk delete rows
- [ ] Import/export data (CSV, JSON)

### Customization
- [ ] Row height, column width preferences
- [ ] Column freeze/pin
- [ ] User preferences per view/table

---

## Phase 2.6.1: Views & Filters System

### Backend

#### Views Schema
- [ ] Create `table_views` table
  ```sql
  - id (uuid, primary key)
  - data_table_id (fk to data_tables)
  - name
  - slug
  - description
  - view_type ('table' | 'kanban' | 'gallery' | 'calendar' | 'form')
  - is_shared (boolean) - personal vs shared
  - is_public (boolean) - public access
  - created_by (fk to users)
  - filter_json (jsonb) - combined filter conditions
  - sort_json (jsonb) - combined sort order
  - visible_columns (array of column IDs)
  - view_config (jsonb) - type-specific settings
  - created_at
  - updated_at
  ```

- [ ] Create `view_permissions` table
  ```sql
  - id (uuid, primary key)
  - view_id (fk to table_views)
  - user_id (fk to users) - nullable (for role-based)
  - role ('owner' | 'admin' | 'member') - nullable (for user-based)
  - permission_type ('view' | 'edit' | 'delete')
  - created_at
  ```

- [ ] Create `user_view_preferences` table
  ```sql
  - id (uuid, primary key)
  - view_id (fk to table_views)
  - user_id (fk to users)
  - preferences (jsonb) - row height, column widths, etc.
  - created_at
  - updated_at
  ```

#### Views API
- [ ] `POST /api/apps/[appSlug]/tables/[tableSlug]/views` - Create view
- [ ] `GET /api/apps/[appSlug]/tables/[tableSlug]/views` - List views
- [ ] `GET /api/apps/[appSlug]/tables/[tableSlug]/views/[viewId]` - Get view
- [ ] `PUT /api/apps/[appSlug]/tables/[tableSlug]/views/[viewId]` - Update view
- [ ] `DELETE /api/apps/[appSlug]/tables/[tableSlug]/views/[viewId]` - Delete view
- [ ] `POST /api/apps/[appSlug]/tables/[tableSlug]/views/[viewId]/duplicate` - Duplicate view
- [ ] `GET /api/apps/[appSlug]/tables/[tableSlug]/views/[viewId]/data` - Get filtered data

#### View Permissions API
- [ ] `POST /api/views/[viewId]/permissions` - Add permission
- [ ] `GET /api/views/[viewId]/permissions` - List permissions
- [ ] `PUT /api/views/[viewId]/permissions/[permissionId]` - Update permission
- [ ] `DELETE /api/views/[viewId]/permissions/[permissionId]` - Remove permission
- [ ] `GET /api/views/[viewId]/check-permission` - Check if user can access

#### Query Builder Utilities
- [ ] Filter parser (parse filter_json to SQL WHERE)
- [ ] Sort parser (parse sort_json to SQL ORDER BY)
- [ ] Query builder with dynamic conditions
- [ ] Support for complex operators:
  - [ ] Equals, not equals
  - [ ] Contains, not contains
  - [ ] Greater than, less than
  - [ ] Between (dates, numbers)
  - [ ] Is empty, is not empty
  - [ ] Starts with, ends with
  - [ ] AND/OR grouping

### Frontend

#### View Components
- [ ] `components/app/view/ViewSwitcher.vue` - Switch between views
- [ ] `components/app/view/CreateViewDialog.vue` - Create new view
- [ ] `components/app/view/EditViewDialog.vue` - Edit view settings
- [ ] `components/app/view/ViewPermissionsDialog.vue` - Manage view permissions
- [ ] `components/app/view/DeleteViewDialog.vue` - Delete confirmation
- [ ] `components/app/view/DuplicateViewDialog.vue` - Duplicate view

#### Filter & Sort Components
- [ ] `components/app/view/FilterBuilder.vue` - Visual query builder
  - [ ] Add filter condition
  - [ ] Group conditions (AND/OR)
  - [ ] Field selector
  - [ ] Operator selector dropdown
  - [ ] Value input (dynamic by field type)
  - [ ] Remove condition
  - [ ] Clear all filters
- [ ] `components/app/view/SortBuilder.vue` - Sort configuration
  - [ ] Add sort field
  - [ ] Sort direction (ASC/DESC)
  - [ ] Reorder sort priority (drag & drop)
  - [ ] Remove sort
  - [ ] Clear all sorts

#### View Integration
- [ ] Integrate view switcher in table toolbar
- [ ] Show active view name and filters
- [ ] Quick filter toggle
- [ ] Save current filters as new view
- [ ] Edit current view button

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

