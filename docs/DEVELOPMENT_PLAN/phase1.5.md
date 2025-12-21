# Phase 1.5: Table Management Enhancements

**Status**: 📋 **Planned**  
**Estimated Duration**: 2-3 weeks

---

## Goals

- [ ] Column management (add/remove/reorder after table creation)
- [ ] Views with filters and sorting
- [ ] Visual query builder for filters
- [ ] Bulk operations (update, delete, export)
- [ ] Table customization (row height, column width, etc.)
- [ ] Personal vs shared views

---

## Actions

### Backend

#### Column Management
- [ ] API: Add column to existing table
- [ ] API: Remove column from table
- [ ] API: Update column (name, type, config)
- [ ] API: Reorder columns
- [ ] Utility: Alter dynamic table schema (add/drop column)
- [ ] Validation: Prevent breaking changes (e.g., can't delete column with data)

#### Views
- [ ] Views schema (table_views table)
- [ ] View columns schema (view_columns table) - which columns to show
- [ ] View filters schema (view_filters table) - filter conditions
- [ ] View sorts schema (view_sorts table) - sort order
- [ ] API: Create view
- [ ] API: Get views for table
- [ ] API: Update view
- [ ] API: Delete view
- [ ] API: Get rows with view filters/sorts applied

#### Bulk Operations
- [ ] API: Bulk update rows
- [ ] API: Bulk delete rows
- [ ] API: Export table data (CSV, JSON)
- [ ] API: Import table data (CSV)

### Frontend

#### Column Management UI
- [ ] Column settings panel
- [ ] Add column button (in table settings)
- [ ] Remove column dialog (with warnings)
- [ ] Edit column dialog
- [ ] Reorder columns (drag-and-drop)
- [ ] Column visibility toggle

#### Views UI
- [ ] View switcher (in table toolbar)
- [ ] Create view dialog
- [ ] Edit view dialog
- [ ] Delete view confirmation
- [ ] Visual query builder component
  - [ ] Add filter condition
  - [ ] Group conditions (AND/OR)
  - [ ] Field selector
  - [ ] Operator selector (equals, contains, greater than, etc.)
  - [ ] Value input (text, number, date, etc.)
- [ ] Sort builder component
  - [ ] Add sort field
  - [ ] Sort direction (ASC/DESC)
  - [ ] Reorder sort priority

#### Bulk Operations UI
- [ ] Row selection (checkboxes in grid)
- [ ] Bulk action menu
- [ ] Bulk update dialog
- [ ] Bulk delete confirmation
- [ ] Export data button (with format selector)
- [ ] Import data button (with CSV upload)

#### Table Customization
- [ ] Row height selector (compact, normal, comfortable)
- [ ] Column resize (drag column border)
- [ ] Column freeze (pin columns)
- [ ] Save table preferences per user

---

## Database Schema

### table_views
- id (uuid, primary key)
- data_table_id (fk to data_tables)
- name
- slug
- description
- is_shared (boolean) - personal vs shared
- created_by (fk to users)
- filter_json (jsonb) - combined filter conditions
- sort_json (jsonb) - combined sort order
- visible_columns (array of column IDs)
- created_at
- updated_at

---

## Success Criteria

- [ ] User can add/remove columns after table creation
- [ ] User can create filtered views
- [ ] Visual query builder is intuitive
- [ ] Bulk operations work correctly
- [ ] User preferences are saved
- [ ] Personal views are private, shared views are visible to all

---

**Blocked By**: Phase 2 (needs user context)  
**Blocks**: None (enhancement of Phase 1)  
**Next Phase**: Phase 3 - Basic Workflows

