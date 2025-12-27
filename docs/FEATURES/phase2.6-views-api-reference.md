# Phase 2.6 Views System - API Reference

**Status**: ✅ Complete  
**Date**: December 27, 2025

## API Endpoint Structure

### View Management

```
GET    /api/workspaces/[slug]/tables/[slug]/views
       List all views for a table

POST   /api/workspaces/[slug]/tables/[slug]/views
       Create a new view

GET    /api/workspaces/[slug]/tables/[slug]/views/default
       Get the default view

GET    /api/workspaces/[slug]/tables/[slug]/views/[viewId]
       Get a specific view

PUT    /api/workspaces/[slug]/tables/[slug]/views/[viewId]
       Update a view

DELETE /api/workspaces/[slug]/tables/[slug]/views/[viewId]
       Delete a view

POST   /api/workspaces/[slug]/tables/[slug]/views/[viewId]/duplicate
       Duplicate a view
```

### View Permissions

```
GET    /api/workspaces/[slug]/tables/[slug]/views/[viewId]/permissions
       List all permissions for a view

POST   /api/workspaces/[slug]/tables/[slug]/views/[viewId]/permissions
       Add a permission to a view

DELETE /api/workspaces/[slug]/tables/[slug]/views/[viewId]/permissions/[permissionId]
       Remove a permission from a view
```

### User Preferences

```
GET    /api/workspaces/[slug]/tables/[slug]/views/[viewId]/preferences
       Get user's personal preferences for a view

PUT    /api/workspaces/[slug]/tables/[slug]/views/[viewId]/preferences
       Update user's preferences for a view
```

### Query Data

```
GET    /api/query/views/[viewId]/rows
       Query rows with view's filters and sorts applied
```

---

## Detailed Endpoints

### 1. List All Views

**Endpoint:** `GET /api/workspaces/:workspaceSlug/tables/:tableSlug/views`

**Description:** Get all views for a table with full column data.

**Response:**
```typescript
{
  data: Array<{
    id: string
    name: string
    slug: string
    description: string | null
    viewType: 'grid' | 'kanban' | 'calendar' | 'gallery' | 'form'
    isDefault: boolean
    isShared: boolean
    isPublic: boolean
    filters: FilterGroup | null
    sort: SortConfig[] | null
    visibleColumns: string[] | null
    columnWidths: Record<string, number> | null
    viewConfig: any | null
    pageSize: number
    createdBy: string
    createdAt: Date
    updatedAt: Date
    columns: DataTableColumn[]  // Populated with full column objects
  }>
}
```

---

### 2. Create View

**Endpoint:** `POST /api/workspaces/:workspaceSlug/tables/:tableSlug/views`

**Auth:** Required (Company context)

**Request Body:**
```typescript
{
  name: string                    // Required
  description?: string
  viewType?: 'grid' | 'kanban' | 'calendar' | 'gallery' | 'form'
  isDefault?: boolean
  isShared?: boolean
  isPublic?: boolean
  filters?: FilterGroup
  sort?: SortConfig[]
  visibleColumns?: string[]
  columnWidths?: Record<string, number>
  viewConfig?: any
  pageSize?: number
}
```

**Filter Structure:**
```typescript
interface FilterGroup {
  operator: 'AND' | 'OR'
  conditions: (FilterCondition | FilterGroup)[]
}

interface FilterCondition {
  columnId: string
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 
            'startsWith' | 'endsWith' | 'isEmpty' | 'isNotEmpty' |
            'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'in' | 'notIn'
  value?: any
}
```

**Sort Structure:**
```typescript
interface SortConfig {
  columnId: string
  direction: 'asc' | 'desc'
}
```

**Response:**
```typescript
{
  data: DataTableView
}
```

**Example Request:**
```json
{
  "name": "Active Tasks",
  "description": "Shows only active tasks",
  "viewType": "grid",
  "isShared": true,
  "filters": {
    "operator": "AND",
    "conditions": [
      {
        "columnId": "status-col-id",
        "operator": "equals",
        "value": "active"
      },
      {
        "columnId": "priority-col-id",
        "operator": "in",
        "value": ["high", "urgent"]
      }
    ]
  },
  "sort": [
    {
      "columnId": "due-date-col-id",
      "direction": "asc"
    }
  ]
}
```

---

### 3. Get View

**Endpoint:** `GET /api/workspaces/:workspaceSlug/tables/:tableSlug/views/:viewId`

**Description:** Get a specific view with full column data.

**Response:**
```typescript
{
  data: {
    ...viewData,
    columns: DataTableColumn[]  // Full column objects
  }
}
```

---

### 4. Update View

**Endpoint:** `PUT /api/workspaces/:workspaceSlug/tables/:tableSlug/views/:viewId`

**Auth:** Required (Company context)

**Permissions:** Only creator or admin can update

**Request Body:** (All fields optional)
```typescript
{
  name?: string
  description?: string
  viewType?: 'grid' | 'kanban' | 'calendar' | 'gallery' | 'form'
  isDefault?: boolean
  isShared?: boolean
  isPublic?: boolean
  filters?: FilterGroup
  sort?: SortConfig[]
  visibleColumns?: string[]
  columnWidths?: Record<string, number>
  viewConfig?: any
  pageSize?: number
}
```

**Response:**
```typescript
{
  data: DataTableView
}
```

---

### 5. Delete View

**Endpoint:** `DELETE /api/workspaces/:workspaceSlug/tables/:tableSlug/views/:viewId`

**Auth:** Required (Company context)

**Permissions:** Only creator or admin can delete

**Restrictions:** Cannot delete default view

**Response:**
```typescript
{
  data: {
    message: "View deleted successfully"
  }
}
```

---

### 6. Duplicate View

**Endpoint:** `POST /api/workspaces/:workspaceSlug/tables/:tableSlug/views/:viewId/duplicate`

**Auth:** Required (Company context)

**Request Body:**
```typescript
{
  name?: string  // Optional custom name, defaults to "[Original Name] (Copy)"
}
```

**Response:**
```typescript
{
  data: DataTableView  // The new duplicated view
}
```

**Notes:**
- Duplicate is always created as personal (not shared)
- Duplicate is never set as default
- All filters, sorts, and configurations are copied

---

### 7. List View Permissions

**Endpoint:** `GET /api/workspaces/:workspaceSlug/tables/:tableSlug/views/:viewId/permissions`

**Auth:** Required

**Permissions:** Only creator or users with shared access

**Response:**
```typescript
{
  data: Array<{
    id: string
    userId: string | null
    role: string | null
    permissionType: 'view' | 'edit' | 'delete'
    createdAt: Date
    userName: string | null
    userEmail: string | null
  }>
}
```

---

### 8. Add View Permission

**Endpoint:** `POST /api/workspaces/:workspaceSlug/tables/:tableSlug/views/:viewId/permissions`

**Auth:** Required

**Permissions:** Only view creator

**Request Body:**
```typescript
{
  userId?: string          // Specific user ID
  role?: string           // Or role-based (e.g., 'admin', 'member')
  permissionType: 'view' | 'edit' | 'delete'
}
```

**Notes:** Either `userId` OR `role` must be specified (not both)

**Response:**
```typescript
{
  data: ViewPermission
}
```

---

### 9. Remove View Permission

**Endpoint:** `DELETE /api/workspaces/:workspaceSlug/tables/:tableSlug/views/:viewId/permissions/:permissionId`

**Auth:** Required

**Permissions:** Only view creator

**Response:**
```typescript
{
  data: {
    message: "Permission removed successfully"
  }
}
```

---

### 10. Get User Preferences

**Endpoint:** `GET /api/workspaces/:workspaceSlug/tables/:tableSlug/views/:viewId/preferences`

**Auth:** Required

**Description:** Get current user's personal preferences for a view.

**Response:**
```typescript
{
  data: {
    id: string
    viewId: string
    userId: string
    preferences: {
      columnWidths?: Record<string, number>
      columnOrder?: string[]
      hiddenColumns?: string[]
      frozenColumns?: string[]
      rowHeight?: 'compact' | 'comfortable' | 'spacious'
      // ... any other user-specific settings
    }
    createdAt: Date
    updatedAt: Date
  } | null  // null if no preferences set yet
}
```

---

### 11. Update User Preferences

**Endpoint:** `PUT /api/workspaces/:workspaceSlug/tables/:tableSlug/views/:viewId/preferences`

**Auth:** Required

**Description:** Save or update current user's personal preferences for a view. Creates if doesn't exist.

**Request Body:**
```typescript
{
  preferences: {
    columnWidths?: Record<string, number>
    columnOrder?: string[]
    hiddenColumns?: string[]
    frozenColumns?: string[]
    rowHeight?: 'compact' | 'comfortable' | 'spacious'
    // ... any other user-specific settings
  }
}
```

**Response:**
```typescript
{
  data: UserViewPreference
}
```

**Notes:**
- User preferences override view defaults
- Each user has their own preferences per view
- Useful for personal customizations without affecting shared views

---

### 12. Query View Rows

**Endpoint:** `GET /api/query/views/:viewId/rows`

**Auth:** Required (Company context)

**Query Parameters:**
```typescript
{
  limit?: number    // Default: 50
  offset?: number   // Default: 0
}
```

**Description:** Query rows with the view's filters and sorts automatically applied.

**Response:**
```typescript
{
  data: {
    rows: any[]
    total: number
    view: DataTableView
    columns: DataTableColumn[]
  }
}
```

---

## Filter Operators Reference

| Operator | Description | Value Type | Example |
|----------|-------------|------------|---------|
| `equals` | Exact match | any | `{ operator: 'equals', value: 'Active' }` |
| `notEquals` | Not equal to | any | `{ operator: 'notEquals', value: 'Done' }` |
| `contains` | Contains text (case insensitive) | string | `{ operator: 'contains', value: 'urgent' }` |
| `notContains` | Doesn't contain text | string | `{ operator: 'notContains', value: 'spam' }` |
| `startsWith` | Starts with text | string | `{ operator: 'startsWith', value: 'TASK' }` |
| `endsWith` | Ends with text | string | `{ operator: 'endsWith', value: '.pdf' }` |
| `isEmpty` | Field is empty or null | none | `{ operator: 'isEmpty' }` |
| `isNotEmpty` | Field has a value | none | `{ operator: 'isNotEmpty' }` |
| `gt` | Greater than | number/date | `{ operator: 'gt', value: 100 }` |
| `gte` | Greater than or equal | number/date | `{ operator: 'gte', value: 0 }` |
| `lt` | Less than | number/date | `{ operator: 'lt', value: 1000 }` |
| `lte` | Less than or equal | number/date | `{ operator: 'lte', value: 100 }` |
| `between` | Between two values | [min, max] | `{ operator: 'between', value: [0, 100] }` |
| `in` | In array of values | array | `{ operator: 'in', value: ['A', 'B', 'C'] }` |
| `notIn` | Not in array | array | `{ operator: 'notIn', value: ['spam', 'deleted'] }` |

---

## Complex Filter Examples

### Example 1: Nested AND/OR

```json
{
  "operator": "OR",
  "conditions": [
    {
      "operator": "AND",
      "conditions": [
        { "columnId": "status", "operator": "equals", "value": "urgent" },
        { "columnId": "assignee", "operator": "isEmpty" }
      ]
    },
    {
      "operator": "AND",
      "conditions": [
        { "columnId": "priority", "operator": "equals", "value": "high" },
        { "columnId": "dueDate", "operator": "lte", "value": "2025-12-31" }
      ]
    }
  ]
}
```

**Logic:** `(status = urgent AND assignee is empty) OR (priority = high AND dueDate <= 2025-12-31)`

### Example 2: Multiple Text Filters

```json
{
  "operator": "AND",
  "conditions": [
    { "columnId": "title", "operator": "contains", "value": "invoice" },
    { "columnId": "status", "operator": "in", "value": ["pending", "processing"] },
    { "columnId": "tags", "operator": "notContains", "value": "archived" }
  ]
}
```

---

## Authorization Matrix

| Endpoint | Creator | Admin | Member | Public |
|----------|---------|-------|--------|--------|
| List views | ✅ | ✅ | ✅ (shared only) | ✅ (public only) |
| Create view | ✅ | ✅ | ✅ | ❌ |
| Get view | ✅ | ✅ | ✅ (if shared) | ✅ (if public) |
| Update view | ✅ | ✅ | ❌ | ❌ |
| Delete view | ✅ | ✅ | ❌ | ❌ |
| Duplicate view | ✅ | ✅ | ✅ | ❌ |
| Manage permissions | ✅ | ❌ | ❌ | ❌ |
| Set preferences | ✅ | ✅ | ✅ | ❌ |
| Query rows | ✅ | ✅ | ✅ (if shared) | ✅ (if public) |

---

## Error Codes

| Status | Message | Cause |
|--------|---------|-------|
| 400 | Invalid filter configuration | Filter structure doesn't match schema |
| 400 | Invalid sort configuration | Sort structure doesn't match schema |
| 400 | Cannot delete default view | Attempted to delete the default view |
| 403 | Permission denied | User lacks required permissions |
| 404 | View not found | View ID doesn't exist |
| 404 | Table not found | Table slug doesn't exist |
| 500 | Workspace context not found | Middleware error |

---

## Frontend Integration Tips

### 1. Fetching and Displaying Views

```typescript
// Get all views
const { data: views } = await useFetch(
  `/api/workspaces/${workspaceSlug}/tables/${tableSlug}/views`
)

// Get default view
const { data: defaultView } = await useFetch(
  `/api/workspaces/${workspaceSlug}/tables/${tableSlug}/views/default`
)
```

### 2. Creating a View with Filters

```typescript
const createView = async () => {
  const { data } = await $fetch(
    `/api/workspaces/${workspaceSlug}/tables/${tableSlug}/views`,
    {
      method: 'POST',
      body: {
        name: 'My View',
        filters: {
          operator: 'AND',
          conditions: [
            { columnId: statusColId, operator: 'equals', value: 'active' }
          ]
        }
      }
    }
  )
}
```

### 3. User Preferences (Auto-save)

```typescript
// Load preferences on mount
const { data: prefs } = await useFetch(
  `/api/workspaces/${workspace}/tables/${table}/views/${viewId}/preferences`
)

// Auto-save on changes (debounced)
const savePreferences = async (newPrefs: any) => {
  await $fetch(
    `/api/workspaces/${workspace}/tables/${table}/views/${viewId}/preferences`,
    {
      method: 'PUT',
      body: { preferences: newPrefs }
    }
  )
}
```

---

## File Structure

```
server/api/workspaces/[workspaceSlug]/tables/[tableSlug]/views/
├── index.get.ts                              # List views
├── index.post.ts                             # Create view
├── default.get.ts                            # Get default view
└── [viewId]/
    ├── index.get.ts                          # Get view
    ├── index.put.ts                          # Update view
    ├── index.delete.ts                       # Delete view
    ├── duplicate.post.ts                     # Duplicate view
    ├── permissions/
    │   ├── index.get.ts                      # List permissions
    │   ├── index.post.ts                     # Add permission
    │   └── [permissionId]/
    │       └── index.delete.ts               # Remove permission
    └── preferences/
        ├── index.get.ts                      # Get user preferences
        └── index.put.ts                      # Update user preferences
```

---

**API Reference Complete** ✅  
**Ready for frontend integration**

