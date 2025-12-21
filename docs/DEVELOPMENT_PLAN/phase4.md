# Phase 4: Real-time Features

**Status**: 📋 **Planned**  
**Estimated Duration**: 3-4 weeks

---

## Goals

- [ ] WebSockets/SSE implementation
- [ ] User presence indicators (who's viewing what)
- [ ] Live data updates (see changes in real-time)
- [ ] Collaborative editing (lock rows/cells)
- [ ] Activity feed with comments
- [ ] Interactive workflow approvals
- [ ] Notifications system

---

## Actions

### Backend

#### Real-time Infrastructure
- [ ] WebSocket server setup (or SSE)
- [ ] Connection manager (track active connections)
- [ ] Room/channel system (per table, per row)
- [ ] Presence tracker (user locations)
- [ ] Broadcast utility (send to all in room)

#### Activity Feed
- [ ] Activities schema (activities table)
- [ ] Activity comments schema (activity_comments table)
- [ ] API: Get activities for entity
- [ ] API: Create comment
- [ ] API: Update comment
- [ ] API: Delete comment
- [ ] Activity generator (auto-create on events)

#### Interactive Approvals
- [ ] Approval requests schema (approval_requests table)
- [ ] API: Create approval request
- [ ] API: Approve/reject request
- [ ] API: Get pending approvals for user
- [ ] Workflow action: Request approval

#### Notifications
- [ ] Notifications schema (notifications table)
- [ ] API: Get user notifications
- [ ] API: Mark notification as read
- [ ] API: Mark all as read
- [ ] Notification generator (on mentions, approvals, etc.)

#### Real-time Events
- [ ] Event: User joined/left
- [ ] Event: Record created
- [ ] Event: Record updated
- [ ] Event: Record deleted
- [ ] Event: Comment added
- [ ] Event: Approval requested
- [ ] Event: Approval responded

### Frontend

#### Real-time Connection
- [ ] WebSocket composable
- [ ] Auto-reconnect logic
- [ ] Connection status indicator
- [ ] Room join/leave on route changes

#### Presence UI
- [ ] User avatars (who's here)
- [ ] Active users list
- [ ] "User is viewing" indicator
- [ ] Cursor position indicators (optional)

#### Live Updates
- [ ] Auto-refresh grid on remote changes
- [ ] Optimistic updates
- [ ] Conflict resolution
- [ ] Row locking indicator
- [ ] "New data available" banner

#### Activity Feed UI
- [ ] Activity timeline component
- [ ] Comment input
- [ ] Comment list
- [ ] Mentions (@user)
- [ ] Approval buttons (in feed)
- [ ] Activity filters (all, comments, approvals, changes)

#### Notifications UI
- [ ] Notification bell (with badge)
- [ ] Notification dropdown
- [ ] Notification list page
- [ ] Real-time notification popup
- [ ] Notification preferences

---

## Database Schema

### activities
- id (uuid, primary key)
- company_id (fk to companies)
- entity_type (table, row, workflow, etc.)
- entity_id (uuid)
- action_type (created, updated, deleted, commented, etc.)
- user_id (fk to users)
- metadata (jsonb) - action-specific data
- created_at

### activity_comments
- id (uuid, primary key)
- activity_id (fk to activities)
- user_id (fk to users)
- content (text)
- mentions (array of user IDs)
- created_at
- updated_at

### approval_requests
- id (uuid, primary key)
- company_id (fk to companies)
- workflow_run_id (fk to workflow_runs)
- requested_by (fk to users)
- assigned_to (fk to users)
- title
- description
- status (pending, approved, rejected)
- responded_at
- response_note (text)
- created_at

### notifications
- id (uuid, primary key)
- user_id (fk to users)
- type (mention, approval, comment, update, etc.)
- title
- message
- link (url to relevant page)
- is_read (boolean)
- created_at
- read_at

---

## Success Criteria

- [ ] Users see real-time updates without refresh
- [ ] Presence indicators show who's active
- [ ] Activity feed works for all entity types
- [ ] Comments support mentions
- [ ] Approvals can be done from activity feed
- [ ] Notifications appear in real-time
- [ ] No data loss during concurrent edits

---

**Blocked By**: Phase 3 (needs workflows for approvals)  
**Next Phase**: Phase 5 - Advanced Features

