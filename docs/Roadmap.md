# Product Roadmap

## Phase 1: Foundation & Core POC (Weeks 1-5) ✅ CURRENT

**Goal:** Build core single-user POC with essential features

### Infrastructure ✅
- [x] PostgreSQL + Docker setup
- [x] postgres.js client
- [x] Database migrations
- [x] Seed data (fixed admin user)

### Data Model ✅
- [x] Companies, Users (fixed)
- [x] Databases (bases/workspaces)
- [x] Tables
- [x] Columns (6 types: text, number, boolean, date, file, link)
- [x] Records (JSONB storage)
- [x] Views (unified widget architecture)
- [x] Files

### API Endpoints (In Progress)
- [ ] Auth API (mock)
- [ ] Databases CRUD
- [ ] Tables CRUD
- [ ] Columns CRUD
- [ ] Records CRUD (with filtering/sorting)
- [ ] Views CRUD
- [ ] Files upload/download

### Frontend (Basic)
- [ ] Database management UI
- [ ] Table management UI
- [ ] Column editor (drag-drop reordering)
- [ ] Table view widget (inline editing)
- [ ] Basic filtering/sorting
- [ ] File upload component

### Constraints
- ✅ Single fixed user (no auth)
- ✅ No permissions
- ✅ Same-database links only
- ✅ Basic table view only

---

## Phase 2: Multi-User Foundation (Weeks 6-8)

**Goal:** Add user management, database-scoped roles, and computed fields

### User Management
- [ ] Replace mock auth with real JWT auth
- [ ] User registration/invitation
- [ ] Password reset flow
- [ ] User profile management

### Role System
- [ ] Add `roles` table (database-scoped)
- [ ] Add `database_members` table
- [ ] Add `table_permissions` table
- [ ] Database owner can create/edit roles
- [ ] Assign users to databases with roles
- [ ] Set table permissions per role (CRUD flags)

### Permission Enforcement
- [ ] Middleware: Check database membership
- [ ] Filter databases by user access
- [ ] Filter tables by role permissions
- [ ] Enforce CRUD permissions on records
- [ ] UI: Role management interface
- [ ] UI: User invitation flow

### Computed Fields ⭐ NEW
- [ ] Add `computed` column type
- [ ] Support aggregations: sum, count, average, min, max, unique, array
- [ ] Compute values on query (subquery approach)
- [ ] Support filtering by computed fields
- [ ] Support sorting by computed fields
- [ ] UI: Computed field configuration
- [ ] Documentation: Performance guidelines

### UI Updates
- [ ] Database sharing/members management
- [ ] Role editor (per database)
- [ ] Table permissions matrix
- [ ] Computed field builder UI
- [ ] User can see only their accessible databases

---

## Phase 3: Advanced Permissions (Weeks 9-10)

**Goal:** Granular column and row-level permissions

### Column Rules
- [ ] Add `column_rules` table
- [ ] Modes: hide, readonly, masked
- [ ] Condition-based column visibility
- [ ] Apply column rules in record queries
- [ ] UI: Column permission editor

### Row Rules
- [ ] Add `row_rules` table
- [ ] Condition-based row filtering
- [ ] Dynamic values (e.g., current_user_id)
- [ ] Apply row rules to all queries
- [ ] UI: Row rule editor

### View Access
- [ ] Add `view_access` table (optional)
- [ ] Explicit view grants (role/user)
- [ ] Inherit from table access by default
- [ ] UI: View sharing settings

---

## Phase 4: Cross-Database Features (Weeks 11-12)

**Goal:** Enable cross-database linking with three sharing modes

### Three Sharing Modes
- [ ] Add `sharing_mode` column to tables (private/public/on_request)
- [ ] Database owner can set sharing mode per table
- [ ] Private: No cross-database linking
- [ ] Public: Anyone can link immediately
- [ ] On Request: Requires approval

### Request/Approval System
- [ ] Add `cross_database_access_requests` table
- [ ] Add `cross_database_grants` table
- [ ] Request access flow (UI)
- [ ] Owner review/approve/reject requests
- [ ] Notification system for requests
- [ ] Grant management UI (view/revoke)

### Granular Column Sharing
- [ ] Owner can approve all columns or specific columns
- [ ] Filter linked records to show only allowed columns
- [ ] Display "[No Access]" for restricted columns

### Cross-Database Linking
- [ ] Allow link columns to reference other databases
- [ ] Query only accessible tables (own + public + granted)
- [ ] Permission check when displaying linked records
- [ ] Show limited info if user lacks access
- [ ] UI: Select linkable tables with mode indicators

### Audit & Management
- [ ] Access request history
- [ ] Grant audit trail
- [ ] Dashboard: Who has access to my tables
- [ ] Dashboard: Which tables I have access to

---

## Phase 5: Enhanced Views & Widgets (Weeks 13-16)

**Goal:** Advanced data visualization and interaction

### Multi-Level Grouping
- [ ] Table widget with multi-level grouping
- [ ] Group by 2-3 columns
- [ ] Collapsible groups
- [ ] Group aggregations (sum, count, avg)

### Additional Widgets
- [ ] Kanban widget (drag-drop cards)
- [ ] Calendar widget (month/week/day views)
- [ ] Gantt widget (timeline view)
- [ ] Card/gallery widget
- [ ] Chart widget (bar, line, pie)
- [ ] Number widget (metrics)
- [ ] List widget (activity feed)

### View Enhancements
- [ ] Advanced filter builder
- [ ] Save filter presets
- [ ] View templates
- [ ] Duplicate views
- [ ] View permissions (who can edit view config)

---

## Phase 6: Collaboration & Sharing (Weeks 17-18)

**Goal:** Public sharing and external collaboration

### Public Sharing
- [ ] Generate public links for views
- [ ] Token-based read-only access
- [ ] Apply row/column rules to public viewers
- [ ] Revoke public links
- [ ] Track public link usage

### Comments & Activity
- [ ] Record-level comments
- [ ] Activity feed per table
- [ ] @mentions
- [ ] Notifications

---

## Phase 7: Workflows & Automation (Weeks 19-22)

**Goal:** Automate actions with Temporal workflows

### Temporal Integration
- [ ] Set up Temporal server
- [ ] Workflow definitions table
- [ ] Event triggers (create/update/delete)
- [ ] Condition evaluation
- [ ] Enqueue workflows

### Basic Automations
- [ ] Send notification on record create
- [ ] Update related records
- [ ] Status transitions
- [ ] Field calculations
- [ ] Email notifications

### Workflow UI
- [ ] Workflow builder interface
- [ ] Condition editor
- [ ] Action selector
- [ ] Workflow run logs
- [ ] Error handling

---

## Phase 8: Files & Media (Weeks 23-24)

**Goal:** Enhanced file handling

### File Management
- [ ] MinIO integration (already planned)
- [ ] File upload/download
- [ ] Image previews/thumbnails
- [ ] File versioning
- [ ] Bulk file operations

### Media Types
- [ ] Image optimization
- [ ] PDF preview
- [ ] Video embed support
- [ ] Document preview

---

## Phase 9: Performance & Scale (Weeks 25-26)

**Goal:** Optimize for larger datasets

### Query Optimization
- [ ] Expression indexes on JSONB fields
- [ ] Generated columns for frequently queried fields
- [ ] Query result caching (Redis)
- [ ] Pagination improvements

### Performance Monitoring
- [ ] Slow query logging
- [ ] Performance metrics dashboard
- [ ] Auto-index recommendations
- [ ] Query plan analysis

---

## Phase 10: Enterprise Features (Weeks 27-30)

**Goal:** Enterprise-ready features

### Advanced Auth
- [ ] SSO (SAML, OAuth)
- [ ] 2FA
- [ ] Session management
- [ ] IP whitelisting

### Audit & Compliance
- [ ] Audit logs (all actions)
- [ ] Data retention policies
- [ ] GDPR compliance tools
- [ ] Export user data

### Administration
- [ ] Company-wide settings
- [ ] Usage analytics
- [ ] Billing integration
- [ ] User management (admin panel)

---

## Future Considerations

### Mobile
- [ ] Mobile-responsive UI
- [ ] Native mobile apps (iOS/Android)
- [ ] Offline mode

### Integration
- [ ] REST API for external apps
- [ ] Webhooks
- [ ] Zapier integration
- [ ] Import from Excel/CSV
- [ ] Export to various formats

### Advanced Features
- [ ] Full-text search (Elasticsearch)
- [ ] AI-powered suggestions
- [ ] Formula fields
- [ ] Rollup/lookup fields
- [ ] Relationship graphs
- [ ] Data validation rules
- [ ] Versioning/history

---

## Success Metrics

### Phase 1 (POC)
- ✅ User can create database, tables, columns, records
- ✅ Table view works with sorting/filtering
- ✅ File upload works
- ✅ Sub-second query response times

### Phase 2 (Multi-User)
- 5+ users can collaborate in same database
- < 200ms database/table list queries
- Roles system is intuitive to use

### Phase 3-4 (Permissions)
- Complex permission scenarios work correctly
- Row/column rules applied in < 100ms
- Cross-database linking works smoothly

### Phase 5-6 (Views & Sharing)
- Advanced widgets render in < 500ms
- Public links work without auth
- Views support 100K+ records

### Phase 7+ (Scale)
- Support 1M+ records per table
- P99 query latency < 800ms
- System uptime > 99.9%

---

## Technology Evolution

### Current (POC)
- Nuxt 4
- PostgreSQL + JSONB
- postgres.js
- MinIO
- Docker

### Phase 4+
- Add Redis for caching
- Add Temporal for workflows
- Add Elasticsearch for full-text search (optional)

### Phase 10+
- Kubernetes for orchestration
- CDN for file delivery
- Message queue (RabbitMQ/SQS)
- Monitoring (Prometheus/Grafana)

---

## Risk Mitigation

### Technical Risks
- **JSONB performance** → Expression indexes, generated columns
- **Permission complexity** → Caching, pre-computed access lists
- **Scale challenges** → Horizontal sharding, read replicas

### Product Risks
- **Feature creep** → Stick to roadmap, defer nice-to-haves
- **Complex UX** → User testing, iterate on feedback
- **Migration issues** → Careful versioning, backward compatibility

---

This roadmap is flexible and will be adjusted based on user feedback and business priorities.

