# Development Plan - POC Phase
Date: 2025-12-12

## Overview
This is a phased development plan for building a POC of the multi-vendor Airtable-like app. The plan prioritizes core functionality and defers complex features like multi-tenancy, permissions, and advanced views to later phases.

## POC Scope Simplifications
- **Fixed User**: Single hardcoded admin user (no authentication/login)
- **No Company Management**: Single fixed company (company_id = 1)
- **No Roles/Groups**: All operations performed as admin
- **Basic Views Only**: Table view with sorting/filtering
- **No Permissions**: All data visible and editable
- **No Workflows**: Deferred to Phase 2
- **No Public Sharing**: Deferred to Phase 2

## Phase 1: Foundation & Core Data Model (Week 1-2)

### 1.1 Project Setup & Infrastructure
**Duration**: 2-3 days

**Tasks**:
- [ ] Set up PostgreSQL database
- [ ] Create database schema migrations (using Prisma/Drizzle/raw SQL)
- [ ] Set up MinIO for file storage (or use local filesystem for POC)
- [ ] Configure Nuxt 4 server with database connection
- [ ] Set up development environment (Docker Compose for services)
- [ ] Configure TypeScript strict mode
- [ ] Set up basic project structure (server routes, composables, utils)

**Deliverables**:
- Database connection working
- Basic Nuxt server running
- Docker Compose file for local development

### 1.2 Database Schema Implementation
**Duration**: 3-4 days

**Tables to Create**:
- [ ] `users` (id, username, email, password_hash, created_at) - fixed admin user
- [ ] `companies` (id, name, owner_id, created_at) - single fixed company
- [ ] `databases` (id, company_id, name, created_by, created_at, deleted_at)
- [ ] `tables` (id, database_id, name, metadata JSONB, created_by, created_at, deleted_at)
- [ ] `columns` (id, table_id, name, type, options JSONB, constraints JSONB, order_index, created_at)
- [ ] `records` (id, table_id, data JSONB, created_by, updated_by, created_at, updated_at, deleted_at)
- [ ] `files` (id, bucket, key, size, mime_type, checksum, created_by, created_at)

**Column Types to Support**:
- `text` - string values
- `number` - numeric values (integer/float)
- `boolean` - true/false
- `date` - date/datetime values
- `file` - reference to files table

**Tasks**:
- [ ] Design and create migration files
- [ ] Add indexes (company_id, database_id, table_id, deleted_at)
- [ ] Create TypeScript types/interfaces for all entities
- [ ] Seed database with fixed admin user and company

**Deliverables**:
- Complete database schema
- Migration scripts
- Type definitions

### 1.3 Basic API Endpoints - Databases
**Duration**: 2 days

**Endpoints**:
- [ ] `GET /api/databases` - List databases (filter deleted)
- [ ] `POST /api/databases` - Create database
- [ ] `GET /api/databases/:id` - Get database
- [ ] `PATCH /api/databases/:id` - Update database
- [ ] `DELETE /api/databases/:id` - Soft delete database

**Tasks**:
- [ ] Create server routes
- [ ] Implement CRUD operations
- [ ] Add validation (name required, etc.)
- [ ] Add error handling
- [ ] Test endpoints

**Deliverables**:
- Working database CRUD API

### 1.4 Basic API Endpoints - Tables
**Duration**: 2 days

**Endpoints**:
- [ ] `GET /api/databases/:databaseId/tables` - List tables
- [ ] `POST /api/databases/:databaseId/tables` - Create table
- [ ] `GET /api/tables/:id` - Get table
- [ ] `PATCH /api/tables/:id` - Update table
- [ ] `DELETE /api/tables/:id` - Soft delete table

**Tasks**:
- [ ] Create server routes
- [ ] Implement CRUD operations
- [ ] Validate database_id exists
- [ ] Add error handling
- [ ] Test endpoints

**Deliverables**:
- Working table CRUD API

### 1.5 Basic API Endpoints - Columns
**Duration**: 3 days

**Endpoints**:
- [ ] `GET /api/tables/:tableId/columns` - List columns (ordered)
- [ ] `POST /api/tables/:tableId/columns` - Create column
- [ ] `GET /api/columns/:id` - Get column
- [ ] `PATCH /api/columns/:id` - Update column (limited - no type changes)
- [ ] `DELETE /api/columns/:id` - Delete column
- [ ] `POST /api/columns/:id/reorder` - Reorder columns

**Tasks**:
- [ ] Create server routes
- [ ] Implement CRUD operations
- [ ] Validate column type and options
- [ ] Handle column ordering
- [ ] Prevent type changes (or handle carefully)
- [ ] Add error handling
- [ ] Test endpoints

**Deliverables**:
- Working column CRUD API

### 1.6 Basic API Endpoints - Records
**Duration**: 4 days

**Endpoints**:
- [ ] `GET /api/tables/:tableId/records` - List records (paginated, filter deleted)
- [ ] `POST /api/tables/:tableId/records` - Create record
- [ ] `GET /api/records/:id` - Get record
- [ ] `PATCH /api/records/:id` - Update record
- [ ] `DELETE /api/records/:id` - Soft delete record
- [ ] `POST /api/tables/:tableId/records/bulk` - Bulk create/update (optional)

**Tasks**:
- [ ] Create server routes
- [ ] Implement CRUD operations
- [ ] Validate data against column schema
- [ ] Handle JSONB data storage
- [ ] Implement pagination
- [ ] Add filtering (by column values)
- [ ] Add sorting
- [ ] Add error handling
- [ ] Test endpoints

**Deliverables**:
- Working record CRUD API with filtering/sorting

## Phase 2: Frontend & Basic UI (Week 3-4)

### 2.1 UI Foundation
**Duration**: 2 days

**Tasks**:
- [ ] Set up UI component library (or build basic components)
- [ ] Create layout components (header, sidebar, main content)
- [ ] Set up routing structure
- [ ] Create basic design system (colors, typography, spacing)
- [ ] Set up state management (Pinia or composables)

**Deliverables**:
- Basic UI framework
- Layout structure

### 2.2 Database Management UI
**Duration**: 2 days

**Pages**:
- [ ] `/databases` - List databases
- [ ] `/databases/new` - Create database
- [ ] `/databases/:id` - Database detail page

**Components**:
- [ ] Database list component
- [ ] Database form component
- [ ] Database card/item component

**Tasks**:
- [ ] Create pages and components
- [ ] Integrate with API
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add basic styling

**Deliverables**:
- Working database management UI

### 2.3 Table Management UI
**Duration**: 2 days

**Pages**:
- [ ] `/databases/:databaseId/tables` - List tables
- [ ] `/databases/:databaseId/tables/new` - Create table
- [ ] `/tables/:id` - Table detail (leads to view)

**Components**:
- [ ] Table list component
- [ ] Table form component

**Tasks**:
- [ ] Create pages and components
- [ ] Integrate with API
- [ ] Add navigation
- [ ] Add styling

**Deliverables**:
- Working table management UI

### 2.4 Column Management UI
**Duration**: 3 days

**Pages**:
- [ ] `/tables/:tableId/columns` - Manage columns (inline or modal)

**Components**:
- [ ] Column list component (draggable for reordering)
- [ ] Column form component (with type selector)
- [ ] Column type-specific options forms

**Tasks**:
- [ ] Create column management UI
- [ ] Support all column types (text, number, boolean, date, file)
- [ ] Implement drag-and-drop reordering
- [ ] Add column type options UI
- [ ] Integrate with API
- [ ] Add validation

**Deliverables**:
- Working column management UI

### 2.5 Record Management UI - Table View
**Duration**: 5 days

**Pages**:
- [ ] `/tables/:tableId/view` - Table view of records

**Components**:
- [ ] Data table component (sortable columns, editable cells)
- [ ] Record row component
- [ ] Cell editor components (type-specific)
- [ ] Add record button/form
- [ ] Filter bar
- [ ] Pagination component

**Features**:
- [ ] Display records in table format
- [ ] Inline editing of cells
- [ ] Add new records (inline or modal)
- [ ] Delete records (with confirmation)
- [ ] Sort by columns
- [ ] Filter by column values
- [ ] Pagination
- [ ] Column resizing
- [ ] Column visibility toggle

**Tasks**:
- [ ] Create data table component
- [ ] Implement cell editing
- [ ] Add record creation
- [ ] Add record deletion
- [ ] Implement sorting
- [ ] Implement filtering
- [ ] Add pagination
- [ ] Style table view
- [ ] Handle loading/error states

**Deliverables**:
- Working table view with CRUD operations

## Phase 3: File Management & Polish (Week 5)

### 3.1 File Upload Integration
**Duration**: 3 days

**Tasks**:
- [ ] Set up MinIO client (or local file storage)
- [ ] Create file upload API endpoint
- [ ] Create file download API endpoint
- [ ] Add file upload UI component
- [ ] Integrate file upload in record creation/editing
- [ ] Display file links/downloads in table view
- [ ] Handle file deletion

**Deliverables**:
- Working file upload/download

### 3.2 UI Polish & UX Improvements
**Duration**: 2 days

**Tasks**:
- [ ] Improve styling and visual design
- [ ] Add loading indicators
- [ ] Add success/error notifications
- [ ] Improve mobile responsiveness (basic)
- [ ] Add keyboard shortcuts (optional)
- [ ] Improve error messages
- [ ] Add confirmation dialogs for destructive actions

**Deliverables**:
- Polished UI with good UX

### 3.3 Testing & Bug Fixes
**Duration**: 2 days

**Tasks**:
- [ ] Manual testing of all features
- [ ] Fix bugs
- [ ] Performance testing (basic)
- [ ] Edge case handling
- [ ] Error scenario testing

**Deliverables**:
- Stable POC ready for demo

## Phase 4: Multi-User & Permissions (Post-POC)

### 4.1 Basic Multi-User Support
- [ ] Add roles, database_members, table_permissions tables
- [ ] User invitation system
- [ ] Database owner can create roles
- [ ] Assign users to roles
- [ ] Set table permissions per role (read, create, update, delete)

### 4.2 Permission Enforcement
- [ ] Database-level access control
- [ ] Table-level permission checks
- [ ] Filter databases/tables based on user access
- [ ] UI to manage roles and permissions

### 4.3 Advanced Permissions
- [ ] Column rules (hide, readonly, masked)
- [ ] Row rules (condition-based filtering)
- [ ] View-level access control

### 4.4 Cross-Database Linking (Hybrid Three-Mode Approach)
- [ ] Add `sharing_mode` column to tables (private/public/on_request)
- [ ] Add `cross_database_access_requests` table
- [ ] Add `cross_database_grants` table
- [ ] UI: Owner sets sharing mode per table
- [ ] UI: Request access flow for on_request tables
- [ ] UI: Owner review/approve/reject requests
- [ ] UI: Grant management (view/revoke)
- [ ] Notification system for access requests
- [ ] Permission checks when displaying linked records
- [ ] Show only allowed columns based on grants
- [ ] Audit trail for all requests and grants

## Phase 5: Optional Enhancements (If Time Permits)

### 5.1 Advanced Column Types
- [ ] Category column (dropdown with predefined options)
- [ ] Tag column (multi-select tags)
- [ ] User column (reference to users table)

### 5.2 Enhanced Views
- [ ] Grouped table view (multi-level grouping)
- [ ] Advanced filtering UI
- [ ] Kanban widget
- [ ] Calendar widget

### 5.3 Advanced Features
- [ ] View-level access control
- [ ] Public sharing with tokens
- [ ] Export/import data
- [ ] Audit logs

## Technical Stack Details

### Backend (Nuxt 4 Server)
- **Database**: PostgreSQL with Prisma ORM (or Drizzle)
- **File Storage**: MinIO (or local filesystem for POC)
- **Validation**: Zod or similar
- **Error Handling**: Custom error handlers

### Frontend (Nuxt 4)
- **UI Framework**: Vue 3 Composition API
- **Styling**: Tailwind CSS (recommended) or custom CSS
- **State Management**: Pinia or composables
- **HTTP Client**: $fetch (built-in Nuxt)

### Development Tools
- **Package Manager**: pnpm (already configured)
- **Type Checking**: TypeScript strict mode
- **Linting**: ESLint
- **Formatting**: Prettier
- **Database Migrations**: Prisma Migrate or Drizzle Kit

## Database Schema (Simplified for POC)

```sql
-- Fixed admin user (seed data)
users (
  id UUID PRIMARY KEY,
  username VARCHAR(255) UNIQUE,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  created_at TIMESTAMP
)

-- Fixed company (seed data)
companies (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP
)

-- Databases
databases (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP,
  deleted_at TIMESTAMP NULL
)

-- Tables
tables (
  id UUID PRIMARY KEY,
  database_id UUID REFERENCES databases(id),
  name VARCHAR(255) NOT NULL,
  metadata JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP,
  deleted_at TIMESTAMP NULL
)

-- Columns
columns (
  id UUID PRIMARY KEY,
  table_id UUID REFERENCES tables(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- text, number, boolean, date, file
  options JSONB, -- type-specific options
  constraints JSONB, -- required, unique, etc.
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP
)

-- Records
records (
  id UUID PRIMARY KEY,
  table_id UUID REFERENCES tables(id),
  data JSONB NOT NULL, -- { column_id: value }
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP NULL
)

-- Files
files (
  id UUID PRIMARY KEY,
  bucket VARCHAR(255),
  key VARCHAR(255),
  size BIGINT,
  mime_type VARCHAR(255),
  checksum VARCHAR(255),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP
)

-- Indexes
CREATE INDEX idx_databases_company_id ON databases(company_id);
CREATE INDEX idx_databases_deleted_at ON databases(deleted_at);
CREATE INDEX idx_tables_database_id ON tables(database_id);
CREATE INDEX idx_tables_deleted_at ON tables(deleted_at);
CREATE INDEX idx_columns_table_id ON columns(table_id);
CREATE INDEX idx_records_table_id ON records(table_id);
CREATE INDEX idx_records_deleted_at ON records(deleted_at);
CREATE INDEX idx_records_data_gin ON records USING GIN(data); -- for JSONB queries
```

## Success Criteria for POC

1. ✅ Can create a database
2. ✅ Can create tables within a database
3. ✅ Can add columns to a table (text, number, boolean, date, file)
4. ✅ Can add records to a table
5. ✅ Can edit records inline
6. ✅ Can delete records (soft delete)
7. ✅ Can view records in table format
8. ✅ Can sort records by columns
9. ✅ Can filter records by column values
10. ✅ Can upload files and reference them in records
11. ✅ All operations work smoothly without errors
12. ✅ UI is intuitive and responsive

## Risk Mitigation

### Technical Risks
- **Complex JSONB queries**: Use proper indexes and consider query optimization
- **File storage**: Start with local filesystem, migrate to MinIO later
- **Performance**: Paginate all list endpoints, optimize queries

### Scope Risks
- **Feature creep**: Stick to Phase 1-3 scope, defer enhancements
- **Over-engineering**: Keep it simple, add complexity only when needed
- **Time management**: Focus on core features first, polish later

## Next Steps After POC

1. Gather feedback from stakeholders
2. Prioritize features for MVP
3. **Phase 4: Multi-User & Permissions** (documented above)
   - Database-scoped roles
   - Table permissions per role
   - Cross-database linking with public_read flag
4. Plan authentication system (replace mock auth)
5. Plan Phase 5 enhancements (advanced views, workflows)

