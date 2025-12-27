# App Templates System - Roadmap

**Status**: 🚧 **Infrastructure Ready - Waiting for Phase 2.6**  
**Date**: December 27, 2025

## Strategic Decision

We've implemented the complete App Templates infrastructure but are **intentionally holding off on seeding production templates** until Phase 2.6 (Views & Permissions) is complete.

### Why Wait?

Templates will be **10x better** with Phase 2.6 features:
- ✅ Multiple view types (Kanban, Calendar, Gallery, Grid)
- ✅ Pre-configured filters and sorting
- ✅ Dashboard layouts
- ✅ View permissions
- ✅ User preferences

### What's Ready Now (Phase 2.4)

✅ **Database Schema**
- `app_templates` table with full JSONB support
- Visibility controls (system/public/company/personal)
- Usage tracking
- Cover image field (for future Minio)

✅ **Backend APIs**
- `GET /api/app-templates` - List with search/filter
- `GET /api/app-templates/:id` - Get details
- `DELETE /api/app-templates/:id` - Delete with permissions
- `POST /api/workspaces/from-template` - Create workspace
- `POST /api/workspaces/:slug/save-as-template` - Save as template

✅ **Frontend**
- `ListPicker.vue` with search and filtering
- Template grouping (System/Company/Personal)
- Usage statistics display
- Responsive grid layout

✅ **Authentication**
- Integrated with existing auth middleware
- Permission checks for all operations
- Company and user context support

## Immediate Next Steps (Now)

### 1. Create Minimal Test Template

For testing the API and infrastructure:

```bash
# Test the system with a minimal template
curl -X POST http://localhost:3000/api/seed-templates-minimal
```

### 2. Test Workflow

Verify the complete flow works:
1. Browse templates (even if minimal)
2. Create workspace from template
3. Save existing workspace as template
4. Delete template

### 3. Update Phase 2.6 Plan

Add template enhancement to Phase 2.6 tasks.

## After Phase 2.6.1 (Views System) - Target: ~4 weeks

### Enhanced Template Definitions

Update all 8 system templates with rich views:

#### CRM Template
```typescript
{
  name: 'Deals',
  columns: [...],
  views: [
    {
      name: 'Sales Pipeline',
      viewType: 'kanban',
      groupBy: 'stage',
      sortJson: { value: 'desc' },
      filterJson: { status: { eq: 'active' } }
    },
    {
      name: 'High Value Deals',
      viewType: 'grid',
      filterJson: { value: { gte: 10000 } },
      sortJson: { value: 'desc' }
    },
    {
      name: 'Deal Cards',
      viewType: 'gallery',
      visibleColumns: ['name', 'value', 'stage', 'close_date']
    }
  ]
}
```

#### Project Management Template
```typescript
{
  name: 'Tasks',
  columns: [...],
  views: [
    {
      name: 'Task Board',
      viewType: 'kanban',
      groupBy: 'status',
      sortJson: { priority: 'desc' }
    },
    {
      name: 'Due This Week',
      viewType: 'grid',
      filterJson: { 
        due_date: { 
          between: ['$weekStart', '$weekEnd'] 
        }
      },
      sortJson: { due_date: 'asc' }
    },
    {
      name: 'Timeline',
      viewType: 'calendar',
      dateField: 'due_date',
      colorField: 'priority'
    }
  ]
}
```

#### Content Calendar Template
```typescript
{
  name: 'Content',
  columns: [...],
  views: [
    {
      name: 'Publishing Calendar',
      viewType: 'calendar',
      dateField: 'publish_date',
      colorField: 'status'
    },
    {
      name: 'Content Pipeline',
      viewType: 'kanban',
      groupBy: 'status',
      sortJson: { publish_date: 'asc' }
    },
    {
      name: 'Published Gallery',
      viewType: 'gallery',
      filterJson: { status: { eq: 'Published' } },
      sortJson: { publish_date: 'desc' }
    },
    {
      name: 'Draft Articles',
      viewType: 'grid',
      filterJson: { 
        AND: [
          { status: { eq: 'Draft' } },
          { type: { eq: 'Blog Post' } }
        ]
      }
    }
  ]
}
```

### All 8 Templates to Enhance

1. **CRM** - Kanban for pipeline, Gallery for contacts
2. **Project Management** - Kanban board, Calendar timeline, Filtered views
3. **Inventory** - Gallery for products, Low stock filters
4. **Task Tracker** - Kanban board, Today/Week/Month views
5. **Customer Support** - Kanban for ticket status, Priority filters
6. **Content Calendar** - Calendar view (perfect fit!), Pipeline kanban
7. **Expense Tracker** - Monthly/Yearly views, Category filters
8. **HR Management** - Calendar for leave, Employee directory gallery

## After Phase 2.6.2+ (Workspace Management)

### Add Dashboard Layouts

```typescript
{
  name: 'CRM',
  tables: [...],
  dashboardJson: {
    widgets: [
      {
        id: 'total-deals',
        type: 'metric',
        title: 'Total Deal Value',
        config: { 
          table: 'deals',
          aggregation: 'sum',
          field: 'value'
        }
      },
      {
        id: 'pipeline-chart',
        type: 'chart',
        title: 'Pipeline by Stage',
        config: {
          table: 'deals',
          groupBy: 'stage',
          chartType: 'bar'
        }
      }
    ]
  }
}
```

## Template Quality Checklist

Before seeding production templates, ensure:

### Views
- [ ] Each template has 3-5 useful views
- [ ] Kanban views where status/stage fields exist
- [ ] Calendar views where date fields exist
- [ ] Gallery views for visual browsing
- [ ] Filtered views for common use cases
- [ ] Proper default sorts

### Filters
- [ ] Common filter patterns (active, this week, high priority)
- [ ] Date range filters
- [ ] Status/category filters
- [ ] User-specific filters ($currentUser)

### User Experience
- [ ] Sensible default view for each table
- [ ] View names are clear and descriptive
- [ ] Filters are not too restrictive
- [ ] Sample data (optional) matches the schema

## Timeline

| Milestone | Date | Status |
|-----------|------|--------|
| Infrastructure Complete | Dec 27, 2025 | ✅ Done |
| Phase 2.6.1 Start | Jan 2026 | 📅 Planned |
| Enhanced Templates | Feb 2026 | 📅 Planned |
| Phase 2.6 Complete | Feb/Mar 2026 | 📅 Planned |
| Production Templates Seeded | Mar 2026 | 📅 Planned |

## Testing Plan (Post Phase 2.6)

1. **Create from Template Test**
   - Apply each template
   - Verify all tables created
   - Verify all views work correctly
   - Test filters and sorts
   - Verify sample data (if included)

2. **Save as Template Test**
   - Create custom workspace with views
   - Save as template
   - Create new workspace from it
   - Verify everything copied correctly

3. **Permission Test**
   - Test company templates visibility
   - Test personal templates privacy
   - Test deletion permissions

4. **Performance Test**
   - Large templates (5+ tables)
   - Templates with sample data
   - Multiple simultaneous template applications

## Future Enhancements (Post Phase 2.6)

### Phase 3+
- [ ] Template versioning
- [ ] Template update notifications
- [ ] Template marketplace
- [ ] Template ratings/reviews
- [ ] AI-suggested templates
- [ ] Template customization wizard
- [ ] Import/export templates (JSON)
- [ ] Template analytics dashboard

## Related Documentation

- [App Templates System](./app-templates-system.md) - Complete technical docs
- [Phase 2.6: Views & Permissions](../DEVELOPMENT_PLAN/phase2.6-views-and-permissions.md)
- [Phase 3: Workflows](../DEVELOPMENT_PLAN/phase3.md)

---

**Decision Made**: December 27, 2025  
**Next Review**: After Phase 2.6.1 completion

