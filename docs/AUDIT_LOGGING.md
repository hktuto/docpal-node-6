# Audit Logging Documentation

This document describes all audit-logged operations in the DocPal system.

---

## Overview

All audit logs are stored in the `audit_logs` table and include:
- **User ID** - Who performed the action
- **Company ID** - Which company the action relates to
- **Action** - What action was performed
- **Entity Type** - What type of entity was affected
- **Entity ID** - The ID of the entity affected
- **Changes** - Before/after values (JSONB)
- **IP Address** - Request IP address
- **User Agent** - Browser/client information
- **Timestamp** - When the action occurred

---

## Currently Logged Operations

### Authentication Operations

| Action | Entity Type | Entity ID | Description | Changes |
|--------|-------------|-----------|-------------|---------|
| `login` | `user` | user.id | User login (password or magic link) | - |
| `logout` | `user` | user.id | User logout | - |

**Endpoints:**
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/magic-link/verify`

---

### Company Operations

| Action | Entity Type | Entity ID | Description | Changes |
|--------|-------------|-----------|-------------|---------|
| `create` | `company` | company.id | Company created | `after`: {name, slug, description, logo} |
| `update` | `company` | company.id | Company information updated | `before` and `after`: {name, slug, description, logo} |
| `invite` | `user` | invite.id | User invited to company | `after`: {email, role, inviteCode, expiresAt} |
| `accept_invite` | `user` | user.id | User accepted company invite | - |

**Endpoints:**
- `POST /api/companies`
- `PUT /api/companies/[companyId]`
- `POST /api/companies/[companyId]/members/invite`
- `POST /api/companies/invites/accept`

---

### App Operations

| Action | Entity Type | Entity ID | Description | Changes | Status |
|--------|-------------|-----------|-------------|---------|--------|
| `create` | `app` | app.id | App created | `after`: {name, slug, icon, description} | ✅ **LOGGED** |
| `update` | `app` | app.id | App updated | `before` and `after`: {name, slug, icon, description, menu} | ✅ **LOGGED** |
| `delete` | `app` | app.id | App deleted | `before`: app data | ✅ **LOGGED** |

**Endpoints:**
- `POST /api/apps`
- `PUT /api/apps/[appSlug]`
- `DELETE /api/apps/[appSlug]`

---

### Table Operations

| Action | Entity Type | Entity ID | Description | Changes | Status |
|--------|-------------|-----------|-------------|---------|--------|
| `create` | `table` | table.id | Table created | `after`: {name, slug, columns, description} | ✅ **LOGGED** |
| `update` | `table` | table.id | Table updated | `before` and `after`: {name, slug, description} | ✅ **LOGGED** |
| `delete` | `table` | table.id | Table deleted | `before`: table data | ✅ **LOGGED** |

**Endpoints:**
- `POST /api/apps/[appSlug]/tables`
- `PUT /api/apps/[appSlug]/tables/[tableSlug]`
- `DELETE /api/apps/[appSlug]/tables/[tableSlug]`

---

### Row Operations

| Action | Entity Type | Entity ID | Description | Changes | Status |
|--------|-------------|-----------|-------------|---------|--------|
| `create` | `row` | tableId:rowId | Row created | `after`: row data | ✅ **LOGGED** |
| `update` | `row` | tableId:rowId | Row updated | `before` and `after`: changed fields | ✅ **LOGGED** |
| `delete` | `row` | tableId:rowId | Row deleted | `before`: row data | ✅ **LOGGED** |

**Endpoints:**
- `POST /api/apps/[appSlug]/tables/[tableSlug]/rows`
- `PUT /api/apps/[appSlug]/tables/[tableSlug]/rows/[rowId]`
- `DELETE /api/apps/[appSlug]/tables/[tableSlug]/rows/[rowId]`

---

### Folder Operations

| Action | Entity Type | Entity ID | Description | Changes | Status |
|--------|-------------|-----------|-------------|---------|--------|
| `create` | `folder` | folder.id | Folder created | `after`: folder data | ⏳ **NOT IMPLEMENTED** |
| `update` | `folder` | folder.id | Folder updated | `before` and `after`: folder data | ⏳ **NOT IMPLEMENTED** |
| `delete` | `folder` | folder.id | Folder deleted | `before`: folder data | ⏳ **NOT IMPLEMENTED** |

**Endpoints:**
- ⏳ Not yet implemented

---

### View Operations

| Action | Entity Type | Entity ID | Description | Changes | Status |
|--------|-------------|-----------|-------------|---------|--------|
| `create` | `view` | view.id | View created | `after`: view data | ⏳ **NOT IMPLEMENTED** |
| `update` | `view` | view.id | View updated | `before` and `after`: view data | ⏳ **NOT IMPLEMENTED** |
| `delete` | `view` | view.id | View deleted | `before`: view data | ⏳ **NOT IMPLEMENTED** |

**Endpoints:**
- ⏳ Not yet implemented

---

### Dashboard Operations

| Action | Entity Type | Entity ID | Description | Changes | Status |
|--------|-------------|-----------|-------------|---------|--------|
| `create` | `dashboard` | dashboard.id | Dashboard created | `after`: dashboard data | ⏳ **NOT IMPLEMENTED** |
| `update` | `dashboard` | dashboard.id | Dashboard updated | `before` and `after`: dashboard data | ⏳ **NOT IMPLEMENTED** |
| `delete` | `dashboard` | dashboard.id | Dashboard deleted | `before`: dashboard data | ⏳ **NOT IMPLEMENTED** |

**Endpoints:**
- ⏳ Not yet implemented

---

### User Operations

| Action | Entity Type | Entity ID | Description | Changes | Status |
|--------|-------------|-----------|-------------|---------|--------|
| `switch_company` | `user` | user.id | User switched company | - | ✅ **LOGGED** |

**Endpoints:**
- `POST /api/companies/switch`

---

## Summary

### ✅ Currently Logged
- User login/logout
- Company create/update
- Company invite/accept invite
- Company switch
- App create/update/delete
- Table create/update/delete
- Row create/update/delete

### ❌ Missing Audit Logging
- None - all implemented operations are now logged!

### ⏳ Not Yet Implemented
- Folder operations
- View operations
- Dashboard operations

---

## Viewing Audit Logs

### API Endpoint
`GET /api/audit-logs`

**Query Parameters:**
- `limit` - Number of logs per page (default: 50, max: 100)
- `offset` - Pagination offset (default: 0)
- `entityType` - Filter by entity type (e.g., `user`, `company`, `app`, `table`, `row`)
- `action` - Filter by action (e.g., `create`, `update`, `delete`, `login`, `logout`)

**Example:**
```
GET /api/audit-logs?entityType=company&action=create&limit=20&offset=0
```

### UI Access
Audit logs are accessible in the Company Settings page under the "Audit Logs" tab (owner/admin only).

**Path:** `/companies/settings?tab=audit`

**Features:**
- Filter by entity type
- Filter by action
- Pagination
- View changes (expandable JSON)

---

## Implementation Details

### Audit Utility Functions

Located in `server/utils/audit.ts`:

- `createAuditLog(data)` - Create audit log entry
- `auditFromEvent(event, data)` - Create audit log from H3Event (auto-adds IP/user agent)
- `auditTableOperation()` - Helper for table operations
- `auditRowOperation()` - Helper for row operations
- `auditCompanyOperation()` - Helper for company operations
- `auditUserOperation()` - Helper for user operations

### Adding Audit Logging to New Operations

```typescript
import { auditTableOperation } from '~~/server/utils/audit'

// In your endpoint handler:
await auditTableOperation(
  event,
  'create', // or 'update', 'delete'
  tableId,
  companyId,
  userId,
  {
    before: { /* old data */ },  // optional for create
    after: { /* new data */ }    // optional for delete
  }
)
```

---

## Notes

- Audit logs are **non-blocking** - if audit logging fails, the main operation still succeeds
- IP address and user agent are automatically captured
- Company ID is automatically included when available
- All timestamps are in UTC

---

---

## Change Log

- **2025-12-22**: Added audit logging for all app, table, and row operations (create, update, delete)
- **2025-12-22**: Added audit logging for company switch operation
- **2025-12-22**: Initial documentation created with authentication and company operations

**Last Updated:** December 22, 2025

