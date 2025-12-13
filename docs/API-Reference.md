# API Reference - POC

## Overview
All endpoints are Nuxt server routes under `/api`. Authentication is skipped for POC (using fixed admin user).

**Base URL**: `http://localhost:3000/api`

**Response Format**: JSON
- Success: HTTP 200/201 with data
- Error: HTTP 4xx/5xx with error message

**Fixed User ID**: `00000000-0000-0000-0000-000000000001`
**Fixed Company ID**: `00000000-0000-0000-0000-000000000002`

---

## Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Authentication** |
| POST | `/api/auth/login` | Login (mock - returns fixed user) |
| POST | `/api/auth/logout` | Logout (mock) |
| GET | `/api/auth/me` | Get current user |
| **Databases** |
| GET | `/api/databases` | List all databases |
| POST | `/api/databases` | Create a database |
| GET | `/api/databases/:id` | Get database details |
| PATCH | `/api/databases/:id` | Update database |
| DELETE | `/api/databases/:id` | Soft delete database |
| **Tables** |
| GET | `/api/databases/:databaseId/tables` | List tables in database |
| POST | `/api/databases/:databaseId/tables` | Create a table |
| GET | `/api/tables/:id` | Get table details |
| PATCH | `/api/tables/:id` | Update table |
| DELETE | `/api/tables/:id` | Soft delete table |
| **Columns** |
| GET | `/api/tables/:tableId/columns` | List columns (ordered) |
| POST | `/api/tables/:tableId/columns` | Create a column |
| GET | `/api/columns/:id` | Get column details |
| PATCH | `/api/columns/:id` | Update column |
| DELETE | `/api/columns/:id` | Delete column |
| POST | `/api/columns/reorder` | Reorder columns |
| **Views** |
| GET | `/api/tables/:tableId/views` | List views for table |
| POST | `/api/tables/:tableId/views` | Create a view |
| GET | `/api/views/:id` | Get view details |
| PATCH | `/api/views/:id` | Update view |
| DELETE | `/api/views/:id` | Soft delete view |
| **Records** |
| POST | `/api/tables/:tableId/query` | Query records (primary endpoint) |
| POST | `/api/tables/:tableId/records` | Create a record |
| GET | `/api/records/:id` | Get record details |
| PATCH | `/api/records/:id` | Update record |
| DELETE | `/api/records/:id` | Soft delete record |
| POST | `/api/records/bulk` | Bulk create/update (optional) |
| **Files** |
| POST | `/api/files/upload` | Upload a file |
| GET | `/api/files/:id` | Get file metadata |
| GET | `/api/files/:id/download` | Download file |
| DELETE | `/api/files/:id` | Delete file |

---

## 1. Authentication API (POC - Mocked)

### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "00000000-0000-0000-0000-000000000001",
    "username": "admin",
    "email": "admin@docpal.local",
    "created_at": "2025-12-12T00:00:00Z"
  },
  "token": "mock_token_for_poc",
  "companies": [
    {
      "id": "00000000-0000-0000-0000-000000000002",
      "name": "Default Company",
      "role": "owner"
    }
  ]
}
```

**POC Implementation:**
- Always returns fixed admin user regardless of credentials
- Token is a mock string (not validated)
- Returns array of companies (POC has 1, production may have multiple)
- Frontend should store token in localStorage/cookies
- If multiple companies, show company selector

**Error Response:** `401 Unauthorized`
```json
{
  "error": "Invalid credentials"
}
```

---

### Logout
```http
POST /api/auth/logout
```

**Headers:**
```
Authorization: Bearer mock_token_for_poc
```

**Response:** `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

**POC Implementation:**
- Does nothing (no session to invalidate)
- Always returns success
- Frontend should clear stored token

---

### Get Current User
```http
GET /api/auth/me
```

**Headers:**
```
Authorization: Bearer mock_token_for_poc
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "00000000-0000-0000-0000-000000000001",
    "username": "admin",
    "email": "admin@docpal.local",
    "created_at": "2025-12-12T00:00:00Z"
  },
  "companies": [
    {
      "id": "00000000-0000-0000-0000-000000000002",
      "name": "Default Company",
      "role": "owner"
    }
  ]
}
```

**POC Implementation:**
- Always returns fixed admin user
- Doesn't validate token (any value works)
- Returns array of companies user belongs to
- Used by frontend to get user info on app load

**Error Response:** `401 Unauthorized`
```json
{
  "error": "Not authenticated"
}
```

---

### POC Authentication Notes

**For POC:**
- All auth endpoints are mocked
- Any username/password accepted
- Token is not validated (just check if present)
- Always uses fixed admin user/company

**For Production (Later):**
- Implement real password hashing (bcrypt)
- JWT token generation and validation
- Session management
- Refresh tokens
- Password reset flow
- Email verification

**Frontend Usage:**
```typescript
// Login
const { user, token, companies } = await $fetch('/api/auth/login', {
  method: 'POST',
  body: { username: 'admin', password: 'admin123' }
});

localStorage.setItem('auth_token', token);

// Handle multiple companies
if (companies.length === 1) {
  // Single company - auto-select
  localStorage.setItem('current_company_id', companies[0].id);
} else {
  // Multiple companies - show selector
  // User selects company, then:
  localStorage.setItem('current_company_id', selectedCompanyId);
}

// Add token to all requests
const databases = await $fetch('/api/databases', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
  }
});

// Get current user and companies
const { user, companies } = await $fetch('/api/auth/me');

// Switch company
function switchCompany(companyId) {
  localStorage.setItem('current_company_id', companyId);
  // Reload app data for new company
}

// Logout
await $fetch('/api/auth/logout', { method: 'POST' });
localStorage.removeItem('auth_token');
localStorage.removeItem('current_company_id');
```

---

## 2. Databases API

### List Databases
```http
GET /api/databases
```

**Query Parameters:**
- `include_deleted` (boolean, optional) - Include soft-deleted databases

**Response:**
```json
{
  "databases": [
    {
      "id": "uuid",
      "company_id": "uuid",
      "name": "My Database",
      "created_by": "uuid",
      "created_at": "2025-12-12T10:00:00Z",
      "deleted_at": null
    }
  ]
}
```

---

### Create Database
```http
POST /api/databases
```

**Request Body:**
```json
{
  "name": "My Database"
}
```

**Response:** `201 Created`
```json
{
  "database": {
    "id": "uuid",
    "company_id": "uuid",
    "name": "My Database",
    "created_by": "uuid",
    "created_at": "2025-12-12T10:00:00Z",
    "deleted_at": null
  }
}
```

**Validation:**
- `name` required, max 255 characters

---

### Get Database
```http
GET /api/databases/:id
```

**Response:**
```json
{
  "database": {
    "id": "uuid",
    "company_id": "uuid",
    "name": "My Database",
    "created_by": "uuid",
    "created_at": "2025-12-12T10:00:00Z",
    "deleted_at": null,
    "tables_count": 5
  }
}
```

---

### Update Database
```http
PATCH /api/databases/:id
```

**Request Body:**
```json
{
  "name": "Updated Database Name"
}
```

**Response:**
```json
{
  "database": {
    "id": "uuid",
    "name": "Updated Database Name",
    ...
  }
}
```

---

### Delete Database (Soft Delete)
```http
DELETE /api/databases/:id
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Database deleted"
}
```

**Note:** Cascade soft-deletes all tables and records

---

## 3. Tables API

### List Tables
```http
GET /api/databases/:databaseId/tables
```

**Query Parameters:**
- `include_deleted` (boolean, optional)

**Response:**
```json
{
  "tables": [
    {
      "id": "uuid",
      "database_id": "uuid",
      "name": "Customers",
      "metadata": {},
      "created_by": "uuid",
      "created_at": "2025-12-12T10:00:00Z",
      "deleted_at": null,
      "columns_count": 8,
      "records_count": 42
    }
  ]
}
```

---

### Create Table
```http
POST /api/databases/:databaseId/tables
```

**Request Body:**
```json
{
  "name": "Customers",
  "metadata": {
    "description": "Customer information"
  }
}
```

**Response:** `201 Created`
```json
{
  "table": {
    "id": "uuid",
    "database_id": "uuid",
    "name": "Customers",
    "metadata": {...},
    "created_by": "uuid",
    "created_at": "2025-12-12T10:00:00Z",
    "deleted_at": null
  }
}
```

---

### Get Table
```http
GET /api/tables/:id
```

**Response:**
```json
{
  "table": {
    "id": "uuid",
    "database_id": "uuid",
    "name": "Customers",
    "metadata": {},
    "created_by": "uuid",
    "created_at": "2025-12-12T10:00:00Z",
    "deleted_at": null
  },
  "columns": [
    {
      "id": "uuid",
      "name": "Name",
      "type": "text",
      "order_index": 0,
      ...
    }
  ]
}
```

---

### Update Table
```http
PATCH /api/tables/:id
```

**Request Body:**
```json
{
  "name": "Updated Table Name",
  "metadata": {
    "description": "Updated description"
  }
}
```

---

### Delete Table (Soft Delete)
```http
DELETE /api/tables/:id
```

**Response:** `200 OK`

**Note:** Cascade soft-deletes all records

---

## 4. Columns API

### List Columns
```http
GET /api/tables/:tableId/columns
```

**Response:**
```json
{
  "columns": [
    {
      "id": "uuid",
      "table_id": "uuid",
      "name": "Name",
      "type": "text",
      "options": {
        "max_length": 255
      },
      "constraints": {
        "required": true
      },
      "order_index": 0,
      "created_at": "2025-12-12T10:00:00Z"
    },
    {
      "id": "uuid",
      "table_id": "uuid",
      "name": "Age",
      "type": "number",
      "options": {
        "precision": 0
      },
      "constraints": {
        "min": 0,
        "max": 120
      },
      "order_index": 1,
      "created_at": "2025-12-12T10:00:00Z"
    }
  ]
}
```

---

### Create Column
```http
POST /api/tables/:tableId/columns
```

**Request Body:**
```json
{
  "name": "Email",
  "type": "text",
  "options": {
    "format": "email"
  },
  "constraints": {
    "required": true,
    "unique": true
  },
  "order_index": 2
}
```

**Column Types:**
- `text` - String values
- `number` - Numeric values
- `boolean` - True/false
- `date` - Date/datetime
- `file` - File reference
- `link` - Link to another table

**Type-Specific Options:**

**Text:**
```json
{
  "max_length": 255,
  "format": "plain|email|url",
  "multiline": false
}
```

**Number:**
```json
{
  "precision": 2,
  "format": "number|currency|percent",
  "currency": "USD"
}
```

**Date:**
```json
{
  "format": "date|datetime|time",
  "include_time": true,
  "timezone": "UTC"
}
```

**File:**
```json
{
  "max_size": 10485760,
  "allowed_types": ["image/*", "application/pdf"],
  "multiple": false
}
```

**Link:**
```json
{
  "linked_table_id": "uuid",
  "allow_multiple": true,
  "display_field": "col_uuid"
}
```

**Response:** `201 Created`

---

### Get Column
```http
GET /api/columns/:id
```

**Response:**
```json
{
  "column": {
    "id": "uuid",
    "table_id": "uuid",
    "name": "Email",
    "type": "text",
    "options": {...},
    "constraints": {...},
    "order_index": 2,
    "created_at": "2025-12-12T10:00:00Z"
  }
}
```

---

### Update Column
```http
PATCH /api/columns/:id
```

**Request Body:**
```json
{
  "name": "Email Address",
  "options": {
    "format": "email"
  },
  "constraints": {
    "required": true
  }
}
```

**Note:** Type changes are NOT allowed (data migration complexity)

---

### Delete Column
```http
DELETE /api/columns/:id
```

**Response:** `200 OK`

**Note:** This is a HARD delete. All data in records.data for this column will be lost.

---

### Reorder Columns
```http
POST /api/columns/reorder
```

**Request Body:**
```json
{
  "columns": [
    {"id": "uuid-1", "order_index": 0},
    {"id": "uuid-2", "order_index": 1},
    {"id": "uuid-3", "order_index": 2}
  ]
}
```

**Response:** `200 OK`

---

## 5. Views API

### List Views
```http
GET /api/tables/:tableId/views
```

**Query Parameters:**
- `include_deleted` (boolean, optional)

**Response:**
```json
{
  "views": [
    {
      "id": "uuid",
      "table_id": "uuid",
      "name": "All Records",
      "config": {
        "layout": "grid",
        "widgets": [
          {
            "id": "main_table",
            "type": "table",
            "title": "",
            "position": { "x": 0, "y": 0, "w": 12, "h": 12 },
            "config": {
              "visible_columns": ["col_1", "col_2"],
              "filters": [],
              "sorts": []
            }
          }
        ]
      },
      "is_default": true,
      "created_by": "uuid",
      "created_at": "2025-12-12T10:00:00Z",
      "updated_at": "2025-12-12T10:00:00Z",
      "deleted_at": null
    }
  ]
}
```

---

### Create View
```http
POST /api/tables/:tableId/views
```

**Request Body (Unified Widget Architecture):**

Every view is a dashboard with widgets. Mix and match any widget types:

**Example 1: Simple Table View**
```json
{
  "name": "All Customers",
  "config": {
    "layout": "grid",
    "widgets": [
      {
        "id": "main_table",
        "type": "table",
        "title": "",
        "position": { "x": 0, "y": 0, "w": 12, "h": 12 },
        "config": {
          "visible_columns": ["col_name", "col_email", "col_phone"],
          "column_order": ["col_name", "col_email", "col_phone"],
          "column_settings": {
            "col_name": { "width": 200, "frozen": true }
          },
          "filters": [],
          "sorts": [
            { "column_id": "col_name", "direction": "asc" }
          ]
        }
      }
    ]
  },
  "is_default": false
}
```

**Example 2: Kanban Board**
```json
{
  "name": "Project Board",
  "config": {
    "layout": "grid",
    "widgets": [
      {
        "id": "kanban_board",
        "type": "kanban",
        "title": "Tasks",
        "position": { "x": 0, "y": 0, "w": 12, "h": 10 },
        "config": {
          "group_by_column_id": "col_status",
          "visible_columns": ["col_title", "col_assignee"],
          "card_fields": ["col_assignee", "col_due_date"],
          "show_empty_groups": true,
          "filters": [
            { "column_id": "col_archived", "operator": "equals", "value": false }
          ]
        }
      }
    ]
  }
}
```

**Example 3: Mixed Dashboard (Metrics + Kanban)**
```json
{
  "name": "Project Dashboard",
  "config": {
    "layout": "grid",
    "global_filters": [],
    "widgets": [
      {
        "id": "total_tasks",
        "type": "number",
        "title": "Total Tasks",
        "position": { "x": 0, "y": 0, "w": 3, "h": 2 },
        "config": {
          "aggregation": "count"
        }
      },
      {
        "id": "completed_tasks",
        "type": "number",
        "title": "Completed",
        "position": { "x": 3, "y": 0, "w": 3, "h": 2 },
        "config": {
          "aggregation": "count",
          "filters": [
            { "column_id": "col_status", "operator": "equals", "value": "done" }
          ]
        }
      },
      {
        "id": "task_board",
        "type": "kanban",
        "title": "Task Board",
        "position": { "x": 0, "y": 2, "w": 12, "h": 10 },
        "config": {
          "group_by_column_id": "col_status",
          "card_fields": ["col_assignee", "col_due_date"]
        }
      }
    ]
  }
}
```

**Widget Types:**
- `table` - Table view (supports multi-level grouping)
- `kanban` - Kanban board with cards
- `calendar` - Calendar view
- `gantt` - Gantt chart timeline
- `card` - Card/gallery view
- `number` - Single metric widget
- `chart` - Bar/line/pie charts
- `list` - List/activity feed
- `progress` - Progress bar towards goal

**See `docs/Views-Unified-Architecture.md` for complete widget specifications.**

**Response:** `201 Created`
```json
{
  "view": {
    "id": "uuid",
    "table_id": "uuid",
    "name": "Project Dashboard",
    "config": {
      "layout": "grid",
      "widgets": [...]
    },
    "is_default": false,
    "created_by": "uuid",
    "created_at": "2025-12-12T10:00:00Z",
    "updated_at": "2025-12-12T10:00:00Z",
    "deleted_at": null
  }
}
```

---

### Get View
```http
GET /api/views/:id
```

**Response:**
```json
{
  "view": {
    "id": "uuid",
    "table_id": "uuid",
    "name": "Project Dashboard",
    "config": {
      "layout": "grid",
      "widgets": [...]
    },
    "is_default": false,
    "created_by": "uuid",
    "created_at": "2025-12-12T10:00:00Z",
    "updated_at": "2025-12-12T10:00:00Z",
    "deleted_at": null
  }
}
```

---

### Update View
```http
PATCH /api/views/:id
```

**Request Body:**
```json
{
  "name": "Updated View Name",
  "config": {
    "visible_columns": ["col_1", "col_2", "col_3"],
    "filters": [...]
  }
}
```

**Response:**
```json
{
  "view": {
    "id": "uuid",
    "name": "Updated View Name",
    "updated_at": "2025-12-12T11:00:00Z",
    ...
  }
}
```

---

### Delete View (Soft Delete)
```http
DELETE /api/views/:id
```

**Response:** `200 OK`

**Note:** Cannot delete default view without setting another view as default first

---

---

## 6. Records API

### Query Records (Primary Endpoint)
```http
POST /api/tables/:tableId/query
```

**Purpose:** Flexible querying with filtering, sorting, field selection, grouping, and link expansion.

**Request Body:**
```typescript
interface QueryRequest {
  // Filtering (nested AND/OR)
  filter?: FilterGroup | FilterCondition;
  
  // Sorting (multiple sorts supported)
  sorts?: Sort[];
  
  // Field selection (performance optimization)
  select?: string[];  // Column IDs to return
  
  // Link expansion (fetch linked record details)
  expand?: string[];  // Link column IDs to expand (1 level only)
  
  // Grouping (optional - changes response structure)
  group_by?: string[];  // Column IDs for grouping
  
  // Pagination (cursor-based)
  page_size?: number;   // default 100, max 500
  start_cursor?: string | null;
}
```

**Filter Types:**
```typescript
type FilterGroup = {
  and: (FilterGroup | FilterCondition)[];
} | {
  or: (FilterGroup | FilterCondition)[];
};

type FilterCondition = {
  property: string;  // Column ID
  text?: {
    equals?: string;
    not_equals?: string;
    contains?: string;
    not_contains?: string;
    starts_with?: string;
    ends_with?: string;
    is_empty?: boolean;
    is_not_empty?: boolean;
  };
  number?: {
    equals?: number;
    not_equals?: number;
    greater_than?: number;
    less_than?: number;
    greater_or_equal?: number;
    less_or_equal?: number;
    is_empty?: boolean;
    is_not_empty?: boolean;
  };
  boolean?: {
    equals?: boolean;
    is_empty?: boolean;
    is_not_empty?: boolean;
  };
  date?: {
    equals?: string;  // ISO date
    before?: string;
    after?: string;
    on_or_before?: string;
    on_or_after?: string;
    is_empty?: boolean;
    is_not_empty?: boolean;
  };
  select?: {
    equals?: string;
    not_equals?: string;
    is_any_of?: string[];
    is_none_of?: string[];
    is_empty?: boolean;
    is_not_empty?: boolean;
  };
};

interface Sort {
  property: string;  // Column ID
  direction: 'ascending' | 'descending';
}
```

**Example Request:**
```json
{
  "filter": {
    "and": [
      {
        "property": "col_status",
        "select": { "equals": "active" }
      },
      {
        "or": [
          {
            "property": "col_amount",
            "number": { "greater_than": 1000 }
          },
          {
            "property": "col_priority",
            "select": { "equals": "urgent" }
          }
        ]
      }
    ]
  },
  "sorts": [
    { "property": "col_created_at", "direction": "descending" },
    { "property": "col_name", "direction": "ascending" }
  ],
  "select": ["col_name", "col_status", "col_amount", "col_customer"],
  "expand": ["col_customer"],
  "page_size": 100,
  "start_cursor": null
}
```

**Response (Without Grouping):**
```json
{
  "records": [
    {
      "id": "uuid",
      "table_id": "uuid",
      "data": {
        "col_name": "Acme Corp",
        "col_status": "active",
        "col_amount": 5000,
        "col_customer": {
          "id": "customer_uuid",
          "display": "John Doe",
          "record": {
            "data": {
              "col_name": "John Doe",
              "col_email": "john@example.com"
            }
          }
        }
      },
      "created_by": "uuid",
      "updated_by": "uuid",
      "created_at": "2025-12-12T10:00:00Z",
      "updated_at": "2025-12-12T10:00:00Z"
    }
  ],
  "has_more": true,
  "next_cursor": "cursor_string_xyz"
}
```

**Response (With Grouping):**
```json
{
  "groups": [
    {
      "value": "active",
      "count": 42,
      "records": [...],
      "has_more": false,
      "next_cursor": null
    },
    {
      "value": "pending",
      "count": 28,
      "records": [...],
      "has_more": true,
      "next_cursor": "cursor_abc"
    }
  ]
}
```

**More Query Examples:**

**Simple Filter:**
```json
{
  "filter": {
    "property": "col_status",
    "select": { "equals": "active" }
  },
  "sorts": [
    { "property": "col_name", "direction": "ascending" }
  ],
  "page_size": 50
}
```

**Complex Nested Filter:**
```json
{
  "filter": {
    "and": [
      {
        "property": "col_status",
        "select": { "is_any_of": ["active", "pending"] }
      },
      {
        "or": [
          {
            "property": "col_amount",
            "number": { "greater_than": 10000 }
          },
          {
            "and": [
              {
                "property": "col_priority",
                "select": { "equals": "urgent" }
              },
              {
                "property": "col_due_date",
                "date": { "before": "2025-12-31" }
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Grouped Query:**
```json
{
  "filter": {
    "property": "col_year",
    "number": { "equals": 2025 }
  },
  "group_by": ["col_status"],
  "sorts": [
    { "property": "col_created_at", "direction": "descending" }
  ]
}
```

---

### List Records (Simple)
```http
GET /api/tables/:tableId/records
```

**Purpose:** Simple listing without filters (for basic use cases).

**Query Parameters:**
- `page_size` (number, default: 100, max: 500)
- `cursor` (string, optional) - Pagination cursor

**Response:**
```json
{
  "records": [
    {
      "id": "uuid",
      "table_id": "uuid",
      "data": {
        "col_uuid_1": "John Doe",
        "col_uuid_2": 25,
        "col_uuid_3": true
      },
      "created_by": "uuid",
      "updated_by": "uuid",
      "created_at": "2025-12-12T10:00:00Z",
      "updated_at": "2025-12-12T10:00:00Z",
      "deleted_at": null
    }
  ],
  "has_more": false,
  "next_cursor": null
}
```

---

### Create Record
```http
POST /api/tables/:tableId/records
```

**Request Body:**
```json
{
  "data": {
    "col_uuid_1": "John Doe",
    "col_uuid_2": 25,
    "col_uuid_3": true,
    "col_uuid_4": "2025-12-12T00:00:00Z"
  }
}
```

**Response:** `201 Created`
```json
{
  "record": {
    "id": "uuid",
    "table_id": "uuid",
    "data": {...},
    "created_by": "uuid",
    "updated_by": "uuid",
    "created_at": "2025-12-12T10:00:00Z",
    "updated_at": "2025-12-12T10:00:00Z",
    "deleted_at": null
  }
}
```

**Validation:**
- Data validated against column definitions
- Type checking for each field
- Constraint validation (required, min, max, etc.)

---

### Get Record
```http
GET /api/records/:id
```

**Response:**
```json
{
  "record": {
    "id": "uuid",
    "table_id": "uuid",
    "data": {...},
    "created_by": "uuid",
    "updated_by": "uuid",
    "created_at": "2025-12-12T10:00:00Z",
    "updated_at": "2025-12-12T10:00:00Z",
    "deleted_at": null
  }
}
```

---

### Update Record
```http
PATCH /api/records/:id
```

**Request Body:**
```json
{
  "data": {
    "col_uuid_1": "Jane Doe",
    "col_uuid_2": 30
  }
}
```

**Note:** Partial updates supported. Only provided fields are updated.

**Response:**
```json
{
  "record": {
    "id": "uuid",
    "data": {
      "col_uuid_1": "Jane Doe",
      "col_uuid_2": 30,
      "col_uuid_3": true,
      ...
    },
    "updated_by": "uuid",
    "updated_at": "2025-12-12T11:00:00Z"
  }
}
```

---

### Delete Record (Soft Delete)
```http
DELETE /api/records/:id
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Record deleted"
}
```

---

### Bulk Operations (Optional)
```http
POST /api/records/bulk
```

**Request Body:**
```json
{
  "table_id": "uuid",
  "operation": "create|update|delete",
  "records": [
    {
      "id": "uuid",  // for update/delete
      "data": {...}  // for create/update
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "created": 5,
  "updated": 3,
  "deleted": 2,
  "errors": []
}
```

---

## 7. Files API

### Upload File
```http
POST /api/files/upload
```

**Request:** `multipart/form-data`
```
Content-Type: multipart/form-data
file: [binary data]
```

**Response:** `201 Created`
```json
{
  "file": {
    "id": "uuid",
    "bucket": "docpal-files",
    "key": "uploads/2025/12/filename.jpg",
    "size": 1024000,
    "mime_type": "image/jpeg",
    "checksum": "sha256hash",
    "created_by": "uuid",
    "created_at": "2025-12-12T10:00:00Z"
  }
}
```

---

### Get File Metadata
```http
GET /api/files/:id
```

**Response:**
```json
{
  "file": {
    "id": "uuid",
    "bucket": "docpal-files",
    "key": "uploads/2025/12/filename.jpg",
    "size": 1024000,
    "mime_type": "image/jpeg",
    "checksum": "sha256hash",
    "created_by": "uuid",
    "created_at": "2025-12-12T10:00:00Z"
  }
}
```

---

### Download File
```http
GET /api/files/:id/download
```

**Response:** Binary file stream with appropriate headers
```
Content-Type: image/jpeg
Content-Disposition: attachment; filename="filename.jpg"
```

---

### Delete File
```http
DELETE /api/files/:id
```

**Response:** `200 OK`

**Note:** Deletes from both database and MinIO storage

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "name",
      "message": "Name is required"
    }
  ]
}
```

### 404 Not Found
```json
{
  "error": "Database not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Database connection failed"
}
```

---

## JSONB Query Examples

### Filter by Text Field
```sql
SELECT * FROM records 
WHERE data->>'col_uuid' = 'John Doe';
```

### Filter by Number (Greater Than)
```sql
SELECT * FROM records 
WHERE (data->>'col_uuid')::int > 18;
```

### Filter by Date Range
```sql
SELECT * FROM records 
WHERE (data->>'col_uuid')::date BETWEEN '2025-01-01' AND '2025-12-31';
```

### Filter by Boolean
```sql
SELECT * FROM records 
WHERE (data->>'col_uuid')::boolean = true;
```

### Filter by Link (Contains)
```sql
SELECT * FROM records 
WHERE data->'col_uuid' @> '"linked_record_uuid"'::jsonb;
```

### Sort by Field
```sql
SELECT * FROM records 
ORDER BY (data->>'col_uuid')::text ASC;
```

---

## Authentication (Future)

For POC, all endpoints use fixed user ID. For production:

```http
Authorization: Bearer <token>
```

---

## Rate Limiting (Future)

Not implemented in POC. For production:
- 100 requests per minute per user
- 1000 requests per hour per user

---

## Next Steps

1. Review this API specification
2. Implement endpoints phase by phase:
   - Phase 1: Databases API
   - Phase 2: Tables API  
   - Phase 3: Columns API
   - Phase 4: Records API
   - Phase 5: Files API
3. Test with Postman/curl
4. Build frontend UI

