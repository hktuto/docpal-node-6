# Template Menu Structure

**Status**: ✅ Implemented  
**Date**: December 27, 2025

## Overview

Templates can now include a pre-configured menu structure that organizes tables into folders for better navigation and UX.

## Menu Structure

### MenuItem Interface

```typescript
export interface MenuItem {
  id: string                              // Unique identifier
  label: string                           // Display name
  slug: string                            // URL-friendly identifier
  type: 'folder' | 'table' | 'view' | 'dashboard'
  icon?: string                           // Lucide icon name
  itemId?: string                         // Reference to actual table/view/dashboard
  children?: MenuItem[]                   // Nested items (for folders)
  order: number                           // Sort order
}
```

### Template Definition

```typescript
export interface AppTemplateDefinition {
  menu?: MenuItem[]          // Optional workspace menu
  tables: TemplateTableDefinition[]
}
```

## Example: Advanced CRM Menu

```json
{
  "templateDefinition": {
    "menu": [
      {
        "id": "folder-sales",
        "label": "Sales & CRM",
        "slug": "sales-crm",
        "type": "folder",
        "icon": "lucide:briefcase",
        "order": 0,
        "children": [
          {
            "id": "table-companies",
            "label": "Companies",
            "slug": "companies",
            "type": "table",
            "icon": "lucide:building-2",
            "order": 0
          },
          {
            "id": "table-contacts",
            "label": "Contacts",
            "slug": "contacts",
            "type": "table",
            "icon": "lucide:users",
            "order": 1
          },
          {
            "id": "table-deals",
            "label": "Deals",
            "slug": "deals",
            "type": "table",
            "icon": "lucide:trending-up",
            "order": 2
          }
        ]
      },
      {
        "id": "folder-activity",
        "label": "Activity & Engagement",
        "slug": "activity-engagement",
        "type": "folder",
        "icon": "lucide:activity",
        "order": 1,
        "children": [
          {
            "id": "table-activities",
            "label": "Activities",
            "slug": "activities",
            "type": "table",
            "icon": "lucide:calendar-check",
            "order": 0
          }
        ]
      },
      {
        "id": "folder-analytics",
        "label": "Analytics & Insights",
        "slug": "analytics-insights",
        "type": "folder",
        "icon": "lucide:bar-chart-3",
        "order": 2,
        "children": [
          {
            "id": "table-company-stats",
            "label": "Company Stats",
            "slug": "company-stats",
            "type": "table",
            "icon": "lucide:pie-chart",
            "order": 0
          }
        ]
      }
    ],
    "tables": [...]
  }
}
```

### Resulting Menu

```
📁 Sales & CRM
   📄 Companies
   📄 Contacts
   📄 Deals

📁 Activity & Engagement
   📄 Activities

📁 Analytics & Insights
   📄 Company Stats
```

## Menu Design Principles

### 1. Logical Grouping

Group related tables together:

```json
{
  "id": "folder-customers",
  "label": "Customer Management",
  "children": [
    { "type": "table", "label": "Customers" },
    { "type": "table", "label": "Contacts" },
    { "type": "table", "label": "Interactions" }
  ]
}
```

### 2. Clear Hierarchy

Use folders to create 2-3 levels max:

```
✅ Good:
📁 Sales
   📄 Deals
   📄 Quotes

❌ Too Deep:
📁 Sales
   📁 Opportunities
      📁 Q1
         📄 Deals
```

### 3. Meaningful Icons

Use appropriate Lucide icons:

| Category | Icon |
|----------|------|
| Sales | `lucide:briefcase`, `lucide:trending-up` |
| People | `lucide:users`, `lucide:user` |
| Tasks | `lucide:check-square`, `lucide:list-checks` |
| Analytics | `lucide:bar-chart-3`, `lucide:pie-chart` |
| Activity | `lucide:activity`, `lucide:calendar-check` |
| Documents | `lucide:file-text`, `lucide:folder` |

### 4. Consistent Slugs

Slugs should match table names (converted to kebab-case):

```javascript
Table: "Companies" → Slug: "companies"
Table: "Deal Pipeline" → Slug: "deal-pipeline"
```

### 5. Proper Ordering

Use `order` field for logical flow:

```json
{
  "children": [
    { "label": "Contacts", "order": 0 },    // First
    { "label": "Companies", "order": 1 },   // Second
    { "label": "Deals", "order": 2 }        // Third
  ]
}
```

## Implementation

### When Creating Workspace from Template

```typescript
// server/api/workspaces/from-template.post.ts

// 1. Create workspace
const workspace = await db.insert(workspaces).values({
  name: workspaceName,
  slug: workspaceSlug,
  companyId: user.company.id,
  menu: template.templateDefinition.menu || []  // ← Use template menu
}).returning()

// 2. Create tables and update menu with actual IDs
const menuWithIds = await createTablesAndUpdateMenu(
  workspace.id,
  template.templateDefinition
)

// 3. Update workspace with menu containing real table IDs
await db.update(workspaces)
  .set({ menu: menuWithIds })
  .where(eq(workspaces.id, workspace.id))
```

### Linking Menu Items to Tables

Menu items initially have placeholder IDs. After table creation:

```typescript
function updateMenuWithTableIds(
  menu: MenuItem[],
  tableSlugToIdMap: Map<string, string>
): MenuItem[] {
  return menu.map(item => {
    if (item.type === 'table' && item.slug) {
      return {
        ...item,
        itemId: tableSlugToIdMap.get(item.slug)  // Link to actual table
      }
    }
    if (item.children) {
      return {
        ...item,
        children: updateMenuWithTableIds(item.children, tableSlugToIdMap)
      }
    }
    return item
  })
}
```

## Common Patterns

### CRM Template

```
📁 Sales & Pipeline
   📄 Leads
   📄 Opportunities
   📄 Customers
   
📁 Activity & Tasks
   📄 Activities
   📄 Tasks
   📄 Calendar
   
📁 Reports & Analytics
   📄 Sales Dashboard
   📄 Pipeline Report
```

### Project Management

```
📁 Projects
   📄 All Projects
   📄 My Projects
   📄 Team Projects
   
📁 Tasks & Issues
   📄 My Tasks
   📄 All Issues
   📄 Backlog
   
📁 Resources
   📄 Team Members
   📄 Time Tracking
```

### HR Management

```
📁 People
   📄 Employees
   📄 Departments
   📄 Teams
   
📁 Leave & Time Off
   📄 Leave Requests
   📄 Time Off Calendar
   
📁 Performance
   📄 Reviews
   📄 Goals
```

## Best Practices

### DO:
- ✅ Use 2-3 top-level folders max
- ✅ Group related tables together
- ✅ Use descriptive folder names
- ✅ Choose appropriate icons
- ✅ Keep folder names short (2-3 words)
- ✅ Order items logically

### DON'T:
- ❌ Create too many nested levels (max 2)
- ❌ Put all tables at root level
- ❌ Use generic names like "Folder 1"
- ❌ Mix unrelated tables in same folder
- ❌ Forget to set order values

## Testing Menu Structure

```bash
# Seed template with menu
curl -X POST http://localhost:3000/api/seed

# Create workspace from template
curl -X POST http://localhost:3000/api/app-templates/create-workspace \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "template-id",
    "name": "My CRM"
  }'

# Check workspace menu
curl http://localhost:3000/api/workspaces/my-crm
```

## Future Enhancements

### Views in Menu

```json
{
  "type": "folder",
  "label": "Deals",
  "children": [
    { "type": "table", "label": "All Deals" },
    { "type": "view", "label": "Active Deals", "itemId": "view-id" },
    { "type": "view", "label": "Won Deals", "itemId": "view-id" }
  ]
}
```

### Dashboards

```json
{
  "type": "folder",
  "label": "Analytics",
  "children": [
    { "type": "dashboard", "label": "Sales Dashboard" },
    { "type": "dashboard", "label": "Team Performance" }
  ]
}
```

### Custom Pages

```json
{
  "type": "custom",
  "label": "Help Center",
  "icon": "lucide:help-circle",
  "url": "/help"
}
```

## Migration

### Existing Workspaces

Workspaces created before menu support will have `menu: null`. 

**Auto-generate menu:**
```typescript
// Generate flat menu from existing tables
const autoMenu = tables.map((table, index) => ({
  id: `table-${table.id}`,
  label: table.name,
  slug: table.slug,
  type: 'table',
  itemId: table.id,
  order: index
}))
```

---

**Last Updated:** December 27, 2025  
**Status:** ✅ Implemented in Advanced CRM template  
**See Also:** `docs/FEATURES/advanced-field-types.md`

