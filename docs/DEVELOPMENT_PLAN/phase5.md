# Phase 5: Advanced Features

**Status**: 📋 **Planned**  
**Estimated Duration**: 4-5 weeks

---

## Goals

- [ ] Temporal workflow engine integration
- [ ] Advanced permissions (row-level, field-level)
- [ ] Custom dashboards with widgets
- [ ] Advanced field types (formula, aggregation, relation)
- [ ] File uploads (MinIO integration)
- [ ] API webhooks
- [ ] Public forms

---

## Actions

### Backend

#### Temporal Integration
- [ ] Temporal setup and configuration
- [ ] Workflow definitions in Temporal
- [ ] Convert workflow engine to use Temporal
- [ ] Long-running workflow support
- [ ] Scheduled workflows (cron)
- [ ] Workflow retry and error handling

#### Advanced Permissions
- [ ] Permissions schema (permissions table)
- [ ] Row-level permissions schema
- [ ] Field-level permissions schema
- [ ] Permission checker utility
- [ ] API: Create permission rule
- [ ] API: Get permissions for entity
- [ ] API: Update permission rule
- [ ] API: Delete permission rule
- [ ] Middleware: Enforce permissions on all API calls

#### Advanced Field Types
- [ ] Formula field type
  - [ ] Formula parser
  - [ ] Formula evaluator
  - [ ] Support basic math, text, date operations
  - [ ] Reference other fields
- [ ] Aggregation field type
  - [ ] Sum, Count, Average, Min, Max
  - [ ] Group by support
- [ ] Relation field type
  - [ ] Link to another table
  - [ ] Lookup values from related records
  - [ ] Cascade delete options

#### File Storage (MinIO)
- [ ] MinIO connection setup
- [ ] File schema (files table)
- [ ] Utility: Upload file
- [ ] Utility: Delete file
- [ ] Utility: Generate signed URL
- [ ] API: Upload file
- [ ] API: Get file
- [ ] API: Delete file
- [ ] File field type for tables
- [ ] Image preview/thumbnails

#### Webhooks
- [ ] Webhooks schema (webhooks table)
- [ ] Webhook delivery logs schema
- [ ] API: Create webhook
- [ ] API: Get webhooks
- [ ] API: Update webhook
- [ ] API: Delete webhook
- [ ] API: Get webhook delivery logs
- [ ] Webhook sender (trigger on events)
- [ ] Retry logic for failed webhooks

#### Public Forms
- [ ] Public form schema (public_forms table)
- [ ] Public form submissions schema
- [ ] API: Create public form
- [ ] API: Get public form (no auth)
- [ ] API: Submit public form (no auth)
- [ ] API: Get public form submissions
- [ ] Rate limiting for public submissions
- [ ] Spam protection (captcha)

### Frontend

#### Advanced Permissions UI
- [ ] Permissions settings page
- [ ] Permission rule builder
- [ ] Role-based permissions
- [ ] Row-level permission rules
- [ ] Field-level permission rules
- [ ] Permission preview (test as user)

#### Custom Dashboards
- [ ] Dashboard builder page
- [ ] Widget library
  - [ ] Chart widget (bar, line, pie)
  - [ ] Table widget
  - [ ] Metric widget (KPI)
  - [ ] Text widget
  - [ ] Filter widget
- [ ] Drag-and-drop widget layout
- [ ] Widget configuration
- [ ] Dashboard sharing
- [ ] Dashboard templates

#### Advanced Field Types UI
- [ ] Formula field editor (with syntax highlighting)
- [ ] Formula field suggestions
- [ ] Aggregation field configuration
- [ ] Relation field picker (select table + field)
- [ ] Lookup field configuration

#### File Upload UI
- [ ] File upload component
- [ ] Drag-and-drop file upload
- [ ] Image preview
- [ ] File manager
- [ ] Multiple file support
- [ ] Progress indicators

#### Webhooks UI
- [ ] Webhook list page
- [ ] Create webhook dialog
- [ ] Webhook editor (URL, events, headers)
- [ ] Test webhook button
- [ ] Webhook logs viewer
- [ ] Retry failed webhook

#### Public Forms UI
- [ ] Public form builder
- [ ] Form field customization
- [ ] Form branding/styling
- [ ] Public form link generator
- [ ] Form submission list
- [ ] Form analytics (submission count, etc.)

---

## Database Schema

### permissions
- id (uuid, primary key)
- company_id (fk to companies)
- entity_type (table, row, field, workflow, etc.)
- entity_id (uuid)
- role (owner, admin, member, custom)
- permission_type (read, write, delete, execute)
- condition_json (jsonb) - for row-level conditions
- created_at
- updated_at

### files
- id (uuid, primary key)
- company_id (fk to companies)
- name
- original_name
- mime_type
- size
- storage_path (path in MinIO)
- uploaded_by (fk to users)
- created_at

### webhooks
- id (uuid, primary key)
- company_id (fk to companies)
- name
- url
- events (array of event types)
- headers (jsonb)
- is_enabled (boolean)
- secret (for signature verification)
- created_at
- updated_at

### webhook_deliveries
- id (uuid, primary key)
- webhook_id (fk to webhooks)
- event_type
- payload (jsonb)
- status (pending, success, failed)
- response_status
- response_body (text)
- attempts
- next_retry_at
- created_at
- delivered_at

### public_forms
- id (uuid, primary key)
- company_id (fk to companies)
- data_table_id (fk to data_tables)
- name
- slug (unique)
- description
- form_config (jsonb) - fields, styling, etc.
- is_enabled (boolean)
- require_captcha (boolean)
- created_by (fk to users)
- created_at
- updated_at

### public_form_submissions
- id (uuid, primary key)
- public_form_id (fk to public_forms)
- submitted_data (jsonb)
- ip_address
- user_agent
- created_at

---

## Success Criteria

- [ ] Temporal workflows run reliably
- [ ] Row-level permissions work correctly
- [ ] Formula fields calculate accurately
- [ ] Files upload to MinIO successfully
- [ ] Webhooks deliver events reliably
- [ ] Public forms accept submissions without auth
- [ ] Dashboards display real-time data
- [ ] System performs well under load

---

**Blocked By**: All previous phases  
**Next Phase**: Production deployment & optimization

