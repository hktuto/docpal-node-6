# App Templates System

**Status**: ✅ **Implemented**  
**Date**: December 27, 2025

## Overview

The App Templates System allows users to quickly create workspaces from pre-built templates or save their own workspaces as reusable templates. This enables rapid workspace creation with predefined tables, columns, and optionally sample data.

## Features

### 1. Template Management

- **System Templates**: 8 pre-built official templates covering common use cases
- **Company Templates**: Shared templates within an organization
- **Personal Templates**: Private templates created by individual users
- **Template Visibility Control**: System, Public, Company, and Personal levels

### 2. Template Creation

Users can save any workspace as a template with:
- Custom name, description, icon, and cover image
- Category and tags for organization
- Option to include sample data
- Option to include custom views
- Visibility settings (personal/company/public)

### 3. Template Usage

- Browse templates with search and filter
- View template details including included tables
- One-click workspace creation from template
- Usage tracking (how many times a template has been used)

## Database Schema

### `app_templates` Table

```sql
CREATE TABLE app_templates (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  cover_image TEXT,  -- Future: Minio URLs
  category TEXT,
  tags TEXT[],
  
  -- Source tracking
  created_from_app_id UUID REFERENCES workspaces(id),
  created_by UUID REFERENCES users(id),
  company_id UUID REFERENCES companies(id),
  
  -- Visibility control
  visibility TEXT NOT NULL DEFAULT 'personal',
  is_featured BOOLEAN DEFAULT false,
  
  -- Template definition (JSONB)
  template_definition JSONB NOT NULL,
  includes_sample_data BOOLEAN DEFAULT false,
  includes_views BOOLEAN DEFAULT true,
  
  -- Metadata
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Template Definition Structure

```typescript
interface AppTemplateDefinition {
  tables: TemplateTableDefinition[]
}

interface TemplateTableDefinition {
  name: string
  slug?: string
  description?: string
  columns: TableColumnDef[]
  views?: ViewDefinition[]
  sampleData?: Record<string, any>[]
}
```

## API Endpoints

### Template Browsing

```http
GET /api/app-templates
Query Parameters:
  - visibility: 'all' | 'system' | 'company' | 'personal'
  - category: string
  - search: string
  - sort: 'popular' | 'newest' | 'name'

GET /api/app-templates/:templateId
```

### Template Management

```http
DELETE /api/app-templates/:templateId
Permissions: Creator, Company Admin, or Platform Admin
```

### Workspace Operations

```http
POST /api/workspaces/from-template
Body: {
  templateId: string
  name: string
  description?: string
  includeSampleData?: boolean
}

POST /api/workspaces/:workspaceSlug/save-as-template
Body: {
  name: string
  description?: string
  icon?: string
  coverImage?: string
  category?: string
  tags?: string[]
  visibility: 'personal' | 'company' | 'public'
  includeSampleData?: boolean
  includeViews?: boolean
}
```

### Seeding (Development Only)

```http
POST /api/seed-templates
```

## Status: Infrastructure Complete, Templates Pending

**⚠️ Important Note**: The template system infrastructure is fully implemented and ready, but we are **strategically waiting until Phase 2.6 (Views & Permissions)** completes before seeding production templates.

**Why?** Templates will be significantly better with:
- Multiple view types (Kanban, Calendar, Gallery)
- Pre-configured filters and sorting
- Dashboard layouts
- Professional-grade user experience

**For Now**: Use `/api/seed-templates-minimal` to seed 2 simple test templates.

**Timeline**: Production templates will be enhanced and seeded after Phase 2.6 completes (~Feb/Mar 2026).

See [App Templates Roadmap](./app-templates-roadmap.md) for details.

## Built-in System Templates (Coming After Phase 2.6)

### 1. CRM (Customer Relationship Management)
**Category**: Business  
**Tables**: Contacts, Deals, Activities  
**Use Case**: Track leads, manage deals, log customer interactions

### 2. Project Management
**Category**: Productivity  
**Tables**: Projects, Tasks, Milestones  
**Use Case**: Manage projects, tasks, and team collaboration

### 3. Inventory Management
**Category**: Business  
**Tables**: Products, Suppliers  
**Use Case**: Track products, stock levels, and suppliers

### 4. Task Tracker
**Category**: Productivity  
**Tables**: Tasks  
**Use Case**: Simple personal or team task management

### 5. Customer Support
**Category**: Support  
**Tables**: Tickets, Customers  
**Use Case**: Handle support tickets and track issues

### 6. Content Calendar
**Category**: Marketing  
**Tables**: Content  
**Use Case**: Plan and schedule content publishing

### 7. Expense Tracker
**Category**: Finance  
**Tables**: Expenses, Budgets  
**Use Case**: Track expenses and manage budgets

### 8. HR Management
**Category**: Business  
**Tables**: Employees, Leave Requests  
**Use Case**: Manage employees and leave requests

## Frontend Components

### `ListPicker.vue`

Located at `app/components/app/templates/ListPicker.vue`

**Features**:
- Search templates by name, description, or tags
- Filter by category
- Grouped display (System, Company, Personal)
- Shows usage count and included tables
- Responsive grid layout
- Loading and error states

**Usage**:
```vue
<template>
  <AppTemplatesListPicker @apply="handleApplyTemplate" />
</template>

<script setup>
const handleApplyTemplate = async (template) => {
  // Create workspace from template
  const { data } = await $fetch('/api/workspaces/from-template', {
    method: 'POST',
    body: {
      templateId: template.id,
      name: 'My New Workspace',
      includeSampleData: true
    }
  })
  
  // Navigate to new workspace
  navigateTo(`/workspaces/${data.slug}`)
}
</script>
```

## Permission Model

### Viewing Templates
- **System Templates**: Everyone
- **Public Templates**: Everyone
- **Company Templates**: Company members only
- **Personal Templates**: Creator only

### Using Templates
- Same as viewing permissions

### Deleting Templates
- **Creator**: Can delete their own templates
- **Company Admin**: Can delete company templates
- **Platform Admin**: Can delete system templates (not implemented yet)

## Authentication

All template endpoints use the existing auth middleware (`server/middleware/00.auth.ts`):

```typescript
// Get authenticated user
const user = requireAuth(event)

// Get authenticated user with company context
const user = requireCompany(event)
```

## Usage Examples

### 1. Seed System Templates (First Time Setup)

```bash
curl -X POST http://localhost:3000/api/seed-templates
```

### 2. Browse Templates

```bash
# Get all templates user has access to
GET /api/app-templates?visibility=all&sort=popular

# Search templates
GET /api/app-templates?search=crm

# Filter by category
GET /api/app-templates?category=Business
```

### 3. Create Workspace from Template

```javascript
const response = await $fetch('/api/workspaces/from-template', {
  method: 'POST',
  body: {
    templateId: 'template-id',
    name: 'My Sales CRM',
    description: 'CRM for our sales team',
    includeSampleData: false
  }
})

// Response: { success: true, data: workspace }
```

### 4. Save Workspace as Template

```javascript
const response = await $fetch('/api/workspaces/my-workspace/save-as-template', {
  method: 'POST',
  body: {
    name: 'Custom CRM Template',
    description: 'Our customized CRM setup',
    category: 'Business',
    tags: ['CRM', 'Sales', 'Custom'],
    visibility: 'company',
    includeSampleData: true,
    includeViews: true
  }
})

// Response: { success: true, data: template }
```

## Future Enhancements

### Phase 1 (Next)
- [ ] Cover image upload with Minio integration
- [ ] Template preview screenshots
- [ ] Template ratings and reviews
- [ ] Template marketplace (public templates)

### Phase 2
- [ ] Template versioning
- [ ] Template update notifications
- [ ] Import/export templates (JSON files)
- [ ] Template analytics (usage statistics)

### Phase 3
- [ ] AI-suggested templates based on user needs
- [ ] Template recommendations
- [ ] Template customization wizard
- [ ] Collaborative template editing

## Technical Notes

### Template Definition Storage

Templates store the complete workspace structure as JSONB:
- All tables with their schemas
- Column definitions with types and configurations
- Optional view configurations
- Optional sample data

When creating a workspace from a template:
1. Workspace record is created
2. For each table in template:
   - Create table metadata record
   - Create physical PostgreSQL table
   - Insert column definitions
   - Create views (if included)
   - Insert sample data (if included)
3. Increment template usage count

### Performance Considerations

- Template list queries are optimized with proper indexes
- Large sample data is optional to keep template size manageable
- Template definition is stored as JSONB for flexible querying
- Usage tracking helps surface popular templates

### Security

- All endpoints require authentication
- Permission checks enforce visibility rules
- User can only access templates they have rights to
- Audit logging for template creation and deletion

## Related Documentation

- [Phase 2.6: Views & Permissions](../DEVELOPMENT_PLAN/phase2.6-views-and-permissions.md)
- [Database Management](../DATABASE_MANAGEMENT.md)
- [API Response Standards](../../repo_specific_rule.md)

---

**Implemented by**: Claude Sonnet 4.5  
**Review Status**: Ready for testing

