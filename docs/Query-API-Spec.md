# Query API Specification

## Overview

The Query API provides flexible, powerful querying capabilities for table records with:
- ✅ Nested AND/OR filtering
- ✅ Multiple sorts
- ✅ Field selection (performance optimization)
- ✅ Link expansion (fetch related records)
- ✅ Grouping support
- ✅ Cursor-based pagination

Inspired by Notion API for familiarity and power.

---

## Primary Endpoint

```http
POST /api/tables/:tableId/query
```

**Why POST?** Complex nested filters don't fit well in URL params. JSON body is more readable and maintainable.

---

## Request Schema

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

---

## Filter Types

### FilterGroup
```typescript
type FilterGroup = {
  and: (FilterGroup | FilterCondition)[];
} | {
  or: (FilterGroup | FilterCondition)[];
};
```

### FilterCondition
```typescript
type FilterCondition = {
  property: string;  // Column ID
  text?: TextFilter;
  number?: NumberFilter;
  boolean?: BooleanFilter;
  date?: DateFilter;
  select?: SelectFilter;
};
```

### Filter Operators by Type

**Text Filters:**
```typescript
interface TextFilter {
  equals?: string;
  not_equals?: string;
  contains?: string;
  not_contains?: string;
  starts_with?: string;
  ends_with?: string;
  is_empty?: boolean;
  is_not_empty?: boolean;
}
```

**Number Filters:**
```typescript
interface NumberFilter {
  equals?: number;
  not_equals?: number;
  greater_than?: number;
  less_than?: number;
  greater_or_equal?: number;
  less_or_equal?: number;
  is_empty?: boolean;
  is_not_empty?: boolean;
}
```

**Boolean Filters:**
```typescript
interface BooleanFilter {
  equals?: boolean;
  is_empty?: boolean;
  is_not_empty?: boolean;
}
```

**Date Filters:**
```typescript
interface DateFilter {
  equals?: string;  // ISO date
  before?: string;
  after?: string;
  on_or_before?: string;
  on_or_after?: string;
  is_empty?: boolean;
  is_not_empty?: boolean;
}
```

**Select Filters:**
```typescript
interface SelectFilter {
  equals?: string;
  not_equals?: string;
  is_any_of?: string[];
  is_none_of?: string[];
  is_empty?: boolean;
  is_not_empty?: boolean;
}
```

---

## Sort

```typescript
interface Sort {
  property: string;  // Column ID
  direction: 'ascending' | 'descending';
}
```

Multiple sorts are applied in order (first sort, then second, then third, etc.)

---

## Response Formats

### Without Grouping

```typescript
interface QueryResponse {
  records: Record[];
  has_more: boolean;
  next_cursor: string | null;
}

interface Record {
  id: string;
  table_id: string;
  data: Record<string, any>;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}
```

### With Grouping

```typescript
interface GroupedQueryResponse {
  groups: Group[];
}

interface Group {
  value: string;  // The group value
  count: number;
  records: Record[];
  has_more: boolean;
  next_cursor: string | null;
}
```

---

## Query Examples

### Example 1: Simple Filter
```json
POST /api/tables/:tableId/query

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

---

### Example 2: Complex Nested Filter
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
  },
  "sorts": [
    { "property": "col_created_at", "direction": "descending" }
  ]
}
```

**Explanation**: Find records where:
- Status is "active" OR "pending"
- AND (Amount > 10000 OR (Priority is "urgent" AND Due date before 2025-12-31))

---

### Example 3: Field Selection + Link Expansion
```json
{
  "select": ["col_name", "col_status", "col_customer", "col_quotations"],
  "expand": ["col_customer"],  // Expand customer, not quotations
  "page_size": 100
}
```

**Response:**
```json
{
  "records": [
    {
      "id": "record_1",
      "data": {
        "col_name": "Acme Project",
        "col_status": "active",
        "col_customer": {
          "id": "customer_1",
          "display": "Acme Corp",
          "record": {
            "data": {
              "col_name": "Acme Corp",
              "col_email": "contact@acme.com"
            }
          }
        },
        "col_quotations": [
          { "id": "q1", "display": "Q-001" },
          { "id": "q2", "display": "Q-002" }
        ]
      }
    }
  ],
  "has_more": false,
  "next_cursor": null
}
```

---

### Example 4: Grouped Query
```json
{
  "filter": {
    "property": "col_year",
    "number": { "equals": 2025 }
  },
  "group_by": ["col_status"],
  "sorts": [
    { "property": "col_created_at", "direction": "descending" }
  ],
  "page_size": 50
}
```

**Response:**
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
      "next_cursor": "cursor_xyz"
    }
  ]
}
```

---

### Example 5: Multi-Level Grouping
```json
{
  "group_by": ["col_status", "col_priority"],
  "sorts": [
    { "property": "col_created_at", "direction": "descending" }
  ]
}
```

**Response:**
```json
{
  "groups": [
    {
      "value": "active|high",  // Composite group value
      "count": 15,
      "records": [...]
    },
    {
      "value": "active|medium",
      "count": 20,
      "records": [...]
    },
    {
      "value": "pending|high",
      "count": 10,
      "records": [...]
    }
  ]
}
```

---

### Example 6: Multiple Sorts
```json
{
  "sorts": [
    { "property": "col_status", "direction": "ascending" },
    { "property": "col_priority", "direction": "descending" },
    { "property": "col_created_at", "direction": "descending" }
  ]
}
```

Sorts are applied in order: first by status (asc), then priority (desc), then created_at (desc).

---

### Example 7: Pagination
```json
// First page
{
  "filter": {...},
  "page_size": 100,
  "start_cursor": null
}

// Response:
{
  "records": [...],
  "has_more": true,
  "next_cursor": "cursor_abc123"
}

// Next page
{
  "filter": {...},
  "page_size": 100,
  "start_cursor": "cursor_abc123"  // Use cursor from previous response
}
```

---

### Example 8: Computed Fields (Phase 2)

Computed fields can be filtered and sorted:

```json
{
  "filter": {
    "and": [
      {
        "property": "col_status",
        "select": { "equals": "active" }
      },
      {
        "property": "col_total_quotation_amount",  // Computed field
        "number": { "greater_than": 10000 }
      }
    ]
  },
  "sorts": [
    { "property": "col_total_quotation_amount", "direction": "descending" }
  ],
  "select": ["col_name", "col_total_quotation_amount"]
}
```

---

## SQL Translation Examples

### Simple Filter
```json
{
  "filter": {
    "property": "col_status",
    "select": { "equals": "active" }
  }
}
```

```sql
SELECT * FROM records
WHERE table_id = ?
  AND deleted_at IS NULL
  AND data->>'col_status' = 'active'
```

---

### Nested AND/OR
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
  }
}
```

```sql
SELECT * FROM records
WHERE table_id = ?
  AND deleted_at IS NULL
  AND data->>'col_status' = 'active'
  AND (
    (data->>'col_amount')::numeric > 1000
    OR data->>'col_priority' = 'urgent'
  )
```

---

### With Grouping
```json
{
  "group_by": ["col_status"],
  "sorts": [
    { "property": "col_created_at", "direction": "descending" }
  ]
}
```

```sql
SELECT 
  data->>'col_status' as group_value,
  COUNT(*) as count,
  json_agg(
    json_build_object(
      'id', id,
      'data', data,
      'created_at', created_at,
      'updated_at', updated_at
    )
    ORDER BY created_at DESC
  ) as records
FROM records
WHERE table_id = ?
  AND deleted_at IS NULL
GROUP BY data->>'col_status'
ORDER BY group_value
```

---

## Performance Considerations

### Field Selection
Always use `select` to limit returned fields:

```json
// ❌ Bad: Returns all columns
{
  "filter": {...}
}

// ✅ Good: Returns only needed columns
{
  "filter": {...},
  "select": ["col_name", "col_email", "col_status"]
}
```

### Link Expansion
Only expand when you need the full linked records:

```json
// ❌ Bad: Expands all links (slow)
{
  "expand": ["col_customer", "col_products", "col_tags", "col_assignee"]
}

// ✅ Good: Expand only what you need
{
  "expand": ["col_customer"]  // Just customer details
}
```

### Pagination
Use cursor-based pagination for consistent results:

```json
// ✅ Cursor-based (consistent)
{
  "page_size": 100,
  "start_cursor": "cursor_abc"
}
```

### Computed Fields (Phase 2)
Computed fields add overhead:

- ⚠️ Each computed field = 1 subquery per record
- ✅ Works well for <10K records
- 💡 Consider caching for large datasets

---

## Error Responses

### Invalid Filter
```json
{
  "error": "invalid_filter",
  "message": "Invalid filter operator for column type",
  "details": {
    "column_id": "col_amount",
    "operator": "contains",
    "reason": "Number columns don't support 'contains' operator"
  }
}
```

### Invalid Column
```json
{
  "error": "invalid_column",
  "message": "Column not found",
  "details": {
    "column_id": "col_invalid"
  }
}
```

### Page Size Exceeded
```json
{
  "error": "page_size_exceeded",
  "message": "Page size must be between 1 and 500",
  "details": {
    "requested": 1000,
    "max": 500
  }
}
```

---

## Implementation Phases

### Phase 1 (POC)
- ✅ Basic filtering (equals, contains, greater_than, etc.)
- ✅ Nested AND/OR
- ✅ Multiple sorts
- ✅ Field selection
- ✅ Link expansion (1 level)
- ✅ Cursor pagination
- ✅ Basic grouping

### Phase 2
- ✅ Computed fields in filters/sorts
- ✅ Multi-level grouping
- ✅ Advanced operators (is_any_of, is_none_of)

### Phase 3+
- Full-text search
- Aggregations in response
- Query optimization/caching
- Real-time subscriptions

---

## Reference

- **Notion API**: https://developers.notion.com/reference/post-database-query
- **PostgREST**: https://postgrest.org/en/stable/api.html
- **JSON:API**: https://jsonapi.org/format/#fetching-filtering

Our API design is most similar to Notion's approach, optimized for Airtable-like use cases.

