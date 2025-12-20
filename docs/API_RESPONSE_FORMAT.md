# API Response Format

## Standard Response Envelope

All API endpoints now return a standardized response format based on JSend specification.

### Success Response

```typescript
{
  "success": true,
  "data": T,           // The actual data
  "meta"?: {           // Optional metadata
    "message"?: string,
    "pagination"?: {...},
    ...
  }
}
```

### Error Response

```typescript
{
  "success": false,
  "error": {
    "code": string,
    "message": string,
    "details"?: any
  }
}
```

---

## Response Types by Endpoint

### Apps

**GET /api/apps**
```json
{
  "success": true,
  "data": [
    { "id": "...", "name": "My App", "slug": "my-app", ... }
  ]
}
```

**POST /api/apps**
```json
{
  "success": true,
  "data": { "id": "...", "name": "My App", ... },
  "meta": { "message": "App created successfully" }
}
```

**GET /api/apps/:appSlug**
```json
{
  "success": true,
  "data": { "id": "...", "name": "My App", ... }
}
```

**PUT /api/apps/:appSlug**
```json
{
  "success": true,
  "data": { "id": "...", "name": "Updated App", ... },
  "meta": { "message": "App updated successfully" }
}
```

**DELETE /api/apps/:appSlug**
```json
{
  "success": true,
  "data": { "id": "...", "name": "Deleted App", ... },
  "meta": { "message": "App deleted successfully" }
}
```

### Tables

**GET /api/apps/:appSlug/tables**
```json
{
  "success": true,
  "data": [
    { "id": "...", "name": "Contacts", "slug": "contacts", ... }
  ]
}
```

**POST /api/apps/:appSlug/tables**
```json
{
  "success": true,
  "data": { "id": "...", "name": "Contacts", ... },
  "meta": { "message": "Table created successfully" }
}
```

**GET /api/apps/:appSlug/tables/:tableSlug**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Contacts",
    "columns": [...]
  }
}
```

**PUT /api/apps/:appSlug/tables/:tableSlug**
```json
{
  "success": true,
  "data": { "id": "...", "name": "Updated Table", "columns": [...] },
  "meta": { "message": "Table updated successfully" }
}
```

**DELETE /api/apps/:appSlug/tables/:tableSlug**
```json
{
  "success": true,
  "data": { "id": "...", "name": "Deleted Table", ... },
  "meta": { "message": "Table deleted successfully" }
}
```

### Rows

**GET /api/apps/:appSlug/tables/:tableSlug/rows** (Paginated)
```json
{
  "success": true,
  "data": [
    { "id": "...", "first_name": "John", ... }
  ],
  "meta": {
    "pagination": {
      "total": 100,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

**POST /api/apps/:appSlug/tables/:tableSlug/rows**
```json
{
  "success": true,
  "data": { "id": "...", "first_name": "John", ... },
  "meta": { "message": "Row created successfully" }
}
```

**GET /api/apps/:appSlug/tables/:tableSlug/rows/:rowId**
```json
{
  "success": true,
  "data": { "id": "...", "first_name": "John", ... }
}
```

**PUT /api/apps/:appSlug/tables/:tableSlug/rows/:rowId**
```json
{
  "success": true,
  "data": { "id": "...", "first_name": "John", ... },
  "meta": { "message": "Row updated successfully" }
}
```

**DELETE /api/apps/:appSlug/tables/:tableSlug/rows/:rowId**
```json
{
  "success": true,
  "data": { "id": "...", "first_name": "John", ... },
  "meta": { "message": "Row deleted successfully" }
}
```

---

## Frontend Usage

### Accessing Data

```typescript
// Always access via .data
const response = await $fetch('/api/apps')
const apps = response.data  // Array of apps

// Check success
if (response.success) {
  // Handle data
  console.log(response.data)
}

// Access metadata
if (response.meta?.message) {
  showToast(response.meta.message)
}

// Pagination
if (response.meta?.pagination) {
  const { total, hasMore } = response.meta.pagination
}
```

### TypeScript Types

```typescript
import type { SuccessResponse, ApiResponse } from '#shared/types/api'
import type { App } from '#shared/types/db'

// Typed response
const response: SuccessResponse<App[]> = await $fetch('/api/apps')
const apps = response.data // TypeScript knows this is App[]

// Or use generic ApiResponse
const result: ApiResponse<App> = await $fetch('/api/apps/my-app')
if (result.success) {
  const app = result.data // App
} else {
  const error = result.error // { code, message }
}
```

---

## Migration Notes

### Old Format → New Format

**Before:**
```json
// Inconsistent formats
{ "id": "...", "name": "..." }                    // Direct object
{ "success": true, "table": {...} }               // Wrapped
{ "data": [...], "pagination": {...} }            // Custom
{ "message": "...", "deletedRow": {...} }         // Mixed
```

**After:**
```json
// Always consistent
{
  "success": true,
  "data": ...,      // Always here
  "meta"?: {...}    // Optional metadata
}
```

### Test Script Updates

**Old:**
```bash
APP_ID=$(echo "$RESPONSE" | jq -r '.id')
TABLES=$(echo "$RESPONSE" | jq -r '.tables')
```

**New:**
```bash
APP_ID=$(echo "$RESPONSE" | jq -r '.data.id')
TABLES=$(echo "$RESPONSE" | jq -r '.data')
MESSAGE=$(echo "$RESPONSE" | jq -r '.meta.message')
```

---

## Benefits

1. **Consistency**: Always know where to find data (`response.data`)
2. **Predictability**: Same structure for all endpoints
3. **Extensibility**: Easy to add metadata without breaking changes
4. **Type Safety**: Full TypeScript support
5. **Error Handling**: Unified error format
6. **Client-Friendly**: Easy to parse and use in frontend

---

## Implementation

All 15 API endpoints have been updated to use this format:
- ✅ 5 App endpoints
- ✅ 5 Table endpoints  
- ✅ 5 Row endpoints

Utility functions available:
- `successResponse(data, meta?)` - Create success response
- `paginatedResponse(data, total, limit, offset)` - Create paginated response
- `messageResponse(data, message)` - Create response with message

