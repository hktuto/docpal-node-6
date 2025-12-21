# Phase 3: Basic Workflow System

**Status**: 📋 **Planned**  
**Estimated Duration**: 3-4 weeks

---

## Goals

- [ ] Trigger system (when record is created/updated/deleted)
- [ ] Basic actions (update record, create record, send email, user form)
- [ ] Condition builder (if/else logic)
- [ ] Workflow execution history
- [ ] User form submissions
- [ ] Email notifications

---

## Actions

### Backend

#### Workflow Schema
- [ ] Workflows schema (workflows table)
- [ ] Workflow triggers schema (workflow_triggers table)
- [ ] Workflow actions schema (workflow_actions table)
- [ ] Workflow conditions schema (workflow_conditions table)
- [ ] Workflow runs schema (workflow_runs table)
- [ ] Workflow run logs schema (workflow_run_logs table)

#### Workflow Engine
- [ ] Trigger handler (listen to table events)
- [ ] Condition evaluator
- [ ] Action executor
  - [ ] Update record action
  - [ ] Create record action
  - [ ] Send email action
  - [ ] User form action (create form submission request)
- [ ] Workflow runner (orchestrate trigger → conditions → actions)
- [ ] Error handling and retry logic

#### API Endpoints
- [ ] API: Create workflow
- [ ] API: Get workflows for table
- [ ] API: Update workflow
- [ ] API: Delete workflow
- [ ] API: Enable/disable workflow
- [ ] API: Get workflow runs (history)
- [ ] API: Get workflow run details (with logs)
- [ ] API: Create form submission
- [ ] API: Get pending form submissions for user
- [ ] API: Submit user form response

### Frontend

#### Workflow Builder UI
- [ ] Workflow list page
- [ ] Create workflow button
- [ ] Workflow builder page
  - [ ] Trigger selector
  - [ ] Condition builder (visual)
  - [ ] Action builder (drag-and-drop)
  - [ ] Action configuration forms
- [ ] Test workflow button
- [ ] Enable/disable toggle

#### Workflow History
- [ ] Workflow runs list
- [ ] Run details page (with logs)
- [ ] Rerun workflow button
- [ ] Filter by status (success, failed, running)

#### User Forms
- [ ] Pending forms page (user's tasks)
- [ ] Form submission dialog
- [ ] Form notification badge
- [ ] Form submission history

---

## Database Schema

### workflows
- id (uuid, primary key)
- company_id (fk to companies)
- data_table_id (fk to data_tables)
- name
- description
- is_enabled (boolean)
- created_by (fk to users)
- created_at
- updated_at

### workflow_triggers
- id (uuid, primary key)
- workflow_id (fk to workflows)
- trigger_type (record_created, record_updated, record_deleted, schedule, manual)
- trigger_config (jsonb) - e.g., which fields trigger on update

### workflow_actions
- id (uuid, primary key)
- workflow_id (fk to workflows)
- action_type (update_record, create_record, send_email, user_form, webhook)
- action_config (jsonb) - action-specific settings
- order (integer) - execution order
- parent_action_id (fk to workflow_actions, nullable) - for nested actions

### workflow_conditions
- id (uuid, primary key)
- workflow_id (fk to workflows)
- action_id (fk to workflow_actions, nullable) - condition for specific action
- condition_json (jsonb) - if/else logic

### workflow_runs
- id (uuid, primary key)
- workflow_id (fk to workflows)
- trigger_type
- trigger_data (jsonb) - what triggered the run
- status (running, success, failed)
- started_at
- completed_at
- error_message

### workflow_run_logs
- id (uuid, primary key)
- workflow_run_id (fk to workflow_runs)
- action_id (fk to workflow_actions)
- status (pending, running, success, failed, skipped)
- input_data (jsonb)
- output_data (jsonb)
- error_message
- created_at

### form_submissions
- id (uuid, primary key)
- company_id (fk to companies)
- workflow_run_id (fk to workflow_runs)
- assigned_to (fk to users)
- form_config (jsonb) - form fields
- status (pending, submitted, cancelled)
- submitted_data (jsonb)
- submitted_at
- created_at

---

## Success Criteria

- [ ] Workflow triggers on table events
- [ ] Conditions evaluate correctly
- [ ] Actions execute in order
- [ ] User can create workflows visually
- [ ] Workflow runs are logged
- [ ] User forms work end-to-end
- [ ] Email notifications are sent

---

**Blocked By**: Phase 2 (needs users for assignments)  
**Next Phase**: Phase 4 - Real-time Features

