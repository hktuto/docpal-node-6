# Phase 2.6: Template System Enhancements

**Status**: 📋 **Planned - After Phase 2.6 Views Complete**

## Overview

This document outlines how we'll enhance the existing App Templates System once Phase 2.6 (Views & Permissions) is complete.

## Current State (Phase 2.4)

✅ Infrastructure complete:
- Database schema
- API endpoints  
- Frontend components
- Basic template definitions

⏳ Waiting for:
- Rich view types (Kanban, Calendar, Gallery)
- Filter builder
- Sort configurations
- Dashboard layouts

## Enhancement Tasks (Post Phase 2.6.1)

### 1. Update Template Definitions

For each of the 8 system templates, add rich view configurations:

#### Task: Enhance CRM Template
**File**: `server/api/seed-templates.post.ts`

**Tables to Update**:
1. **Contacts**
   - Grid view (default, all contacts)
   - Gallery view (contact cards with photos)
   - Filter view (active customers only)

2. **Deals**  
   - Kanban view (pipeline by stage) ⭐
   - Grid view (all deals, sorted by value)
   - Filter view (high value deals > $10k)
   - Calendar view (by close date)

3. **Activities**
   - Grid view (default, recent first)
   - Calendar view (by activity date) ⭐
   - Filter view (this week's activities)

#### Task: Enhance Project Management Template

**Tables to Update**:
1. **Projects**
   - Grid view (all projects)
   - Kanban view (by status)
   - Gallery view (project cards)

2. **Tasks** ⭐ Prime for Kanban
   - Kanban view (by status) - To Do / In Progress / Done
   - Grid view (all tasks)
   - Calendar view (by due date)
   - Filter views:
     - My tasks
     - Urgent tasks
     - Due this week

3. **Milestones**
   - Grid view (default)
   - Calendar view (by due date)

#### Task: Enhance Content Calendar Template

**Perfect Use Case for Calendar View!**

1. **Content Table**
   - Calendar view (by publish_date) ⭐ Main view
   - Kanban view (by status) - Idea / Draft / Review / Scheduled / Published
   - Grid view (all content)
   - Gallery view (visual content cards)
   - Filter views:
     - Scheduled this month
     - Draft content
     - Published this year
     - By channel (Blog, Social, etc.)

#### Task: Enhance Customer Support Template

1. **Tickets**
   - Kanban view (by status) ⭐ - New / In Progress / Resolved
   - Grid view (all tickets)
   - Filter views:
     - My tickets
     - High priority
     - Unassigned
     - Open tickets

2. **Customers**
   - Grid view (all customers)
   - Gallery view (customer cards)

#### Task: Enhance Inventory Management Template

1. **Products**
   - Grid view (all products)
   - Gallery view (product catalog with images) ⭐
   - Filter views:
     - Low stock alert (< reorder level)
     - By category
     - High value items

2. **Suppliers**
   - Grid view (default)
   - Gallery view (supplier cards)

#### Task: Enhance Task Tracker Template

1. **Tasks**
   - Kanban view (by status) ⭐
   - Grid view (all tasks)
   - Calendar view (by due date)
   - Filter views:
     - Today
     - This week
     - Completed
     - High priority

#### Task: Enhance Expense Tracker Template

1. **Expenses**
   - Grid view (all expenses)
   - Filter views:
     - This month
     - By category
     - Recent (last 30 days)
   - Calendar view (by expense date)

2. **Budgets**
   - Grid view (with progress indicators)
   - Filter view (over budget categories)

#### Task: Enhance HR Management Template

1. **Employees**
   - Grid view (employee directory)
   - Gallery view (employee cards with photos)
   - Filter views:
     - By department
     - Active employees

2. **Leave Requests**
   - Kanban view (by status) - Pending / Approved / Rejected
   - Calendar view (by start_date) ⭐
   - Grid view (all requests)
   - Filter views:
     - Pending approvals
     - Upcoming leave

## Implementation Checklist

### Pre-Development
- [ ] Review Phase 2.6.1 filter/sort syntax
- [ ] Review Phase 2.6.1 view configuration schema
- [ ] Understand view type capabilities
- [ ] Review dashboard JSON structure

### For Each Template
- [ ] Identify key workflows
- [ ] Design 3-5 useful views
- [ ] Add appropriate filters
- [ ] Configure default sorts
- [ ] Test view creation
- [ ] Verify from-template works

### Testing
- [ ] Create workspace from each template
- [ ] Verify all views load correctly
- [ ] Test filters work as expected
- [ ] Test sorts work correctly
- [ ] Verify default view is sensible
- [ ] Test calendar views (if applicable)
- [ ] Test kanban views (if applicable)
- [ ] Test gallery views (if applicable)

### Documentation
- [ ] Update template descriptions
- [ ] Document view purposes
- [ ] Add screenshots to template gallery
- [ ] Update user guide

## View Configuration Examples

### Kanban View
```typescript
{
  name: 'Sales Pipeline',
  viewType: 'kanban',
  groupBy: 'stage',
  sortJson: {
    field: 'value',
    direction: 'desc'
  },
  filterJson: {
    operator: 'AND',
    conditions: [
      { field: 'status', operator: 'eq', value: 'active' }
    ]
  },
  visibleColumns: ['name', 'value', 'probability', 'close_date']
}
```

### Calendar View
```typescript
{
  name: 'Publishing Calendar',
  viewType: 'calendar',
  dateField: 'publish_date',
  colorField: 'status',
  titleField: 'title',
  filterJson: {
    operator: 'AND',
    conditions: [
      { 
        field: 'publish_date',
        operator: 'between',
        value: ['$monthStart', '$monthEnd']
      }
    ]
  }
}
```

### Gallery View
```typescript
{
  name: 'Product Catalog',
  viewType: 'gallery',
  titleField: 'name',
  imageField: 'image',
  subtitleField: 'sku',
  visibleColumns: ['name', 'price', 'stock', 'category'],
  sortJson: {
    field: 'name',
    direction: 'asc'
  }
}
```

### Grid with Advanced Filter
```typescript
{
  name: 'High Value Deals',
  viewType: 'grid',
  sortJson: {
    field: 'value',
    direction: 'desc'
  },
  filterJson: {
    operator: 'AND',
    conditions: [
      { field: 'value', operator: 'gte', value: 10000 },
      { field: 'stage', operator: 'in', value: ['Proposal', 'Negotiation'] }
    ]
  }
}
```

## Success Metrics

After enhancement, templates should:
- Have 3-5 functional views each
- Include at least 1 kanban view (where applicable)
- Include at least 1 calendar view (where date fields exist)
- Include at least 1 gallery view (for visual content)
- Have sensible default views
- Include common filter patterns
- Work perfectly on first apply

## Timeline

| Task | Duration | Dependencies |
|------|----------|--------------|
| Phase 2.6.1 Complete | 1 week | Views system ready |
| Design view configs | 2 days | Phase 2.6.1 done |
| Update all 8 templates | 3 days | Design complete |
| Testing | 2 days | Templates updated |
| Documentation | 1 day | Testing complete |
| **Total** | **~2 weeks** | After Phase 2.6.1 |

## Related Files

**To Update**:
- `server/api/seed-templates.post.ts` - Main template definitions
- `docs/FEATURES/app-templates-system.md` - Documentation

**Reference**:
- `server/db/schema/dataTableView.ts` - View schema
- Phase 2.6.1 implementation files

---

**Created**: December 27, 2025  
**Target Date**: March 2026  
**Owner**: Development Team

