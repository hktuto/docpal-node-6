# Phase 2: Authentication & Company Management

**Status**: 🔄 **In Progress** (Backend Complete)  
**Estimated Duration**: 2-3 weeks  
**Started**: Dec 21, 2025

---

## Goals

- [x] User registration and login (session-based) ✅
- [x] Magic link authentication ✅
- [x] Company creation and management ✅
- [x] Invite system (magic links + codes) ✅
- [x] User can switch between companies ✅
- [x] Basic roles (owner, admin, member) ✅
- [ ] Audit logging for all operations ✅
- [x] Multi-tenancy enforcement ✅

---

## Actions

### Backend ✅ COMPLETE

#### Authentication
- [x] User schema (users table) ✅
- [x] Session schema (sessions table) ✅
- [x] Magic link schema (magic_links table) ✅
- [x] API: Register user ✅
- [x] API: Login (email + password) ✅
- [x] API: Send magic link ✅
- [x] API: Verify magic link ✅
- [x] API: Logout ✅
- [x] API: Get current user ✅
- [x] Auth middleware ✅

#### Company Management
- [x] Company schema (already exists, enhance if needed) ✅
- [x] Company members schema (company_members table) ✅
- [x] Company invites schema (company_invites table) ✅
- [x] API: Create company ✅
- [x] API: Get user's companies ✅
- [x] API: Update company ✅
- [x] API: Delete company ✅
- [x] API: Invite user to company ✅
- [x] API: Accept invite ✅
- [x] API: Switch company (update session) ✅

#### Audit Logging
- [x] Audit log schema (audit_logs table) ✅
- [x] Audit utility function ✅
- [x] Log table operations (create, update, delete) ✅
- [x] Log row operations (create, update, delete) ✅
- [x] Log user operations (login, logout, invite) ✅
- [x] API: Get audit logs (paginated, filtered) ✅

### Frontend

#### Authentication Pages
- [X] Login page
- [ ] Register page
- [ ] Magic link sent page
- [ ] Magic link verify page
- [ ] Logout functionality

#### Company Management UI
- [ ] Company switcher (in header)
- [ ] Company settings page
- [ ] Create company dialog
- [ ] Company member list
- [ ] Invite member dialog
- [ ] Accept invite page

#### User Profile
- [ ] User profile page
- [ ] Update profile
- [ ] Change password
- [ ] User preferences

### Middleware & Auth
- [x] Update server middleware to enforce auth ✅
- [ ] Frontend auth middleware
- [ ] Redirect to login if not authenticated
- [ ] Handle session expiration

---

## Database Schema

### users
- id (uuid, primary key)
- email (unique)
- password_hash
- name
- avatar_url
- email_verified
- created_at
- updated_at

### sessions
- id (uuid, primary key)
- user_id (fk to users)
- company_id (fk to companies) - current company
- token (unique)
- expires_at
- created_at

### magic_links
- id (uuid, primary key)
- email
- token (unique)
- type (login, invite, verify_email)
- expires_at
- used_at
- created_at

### company_members
- id (uuid, primary key)
- company_id (fk to companies)
- user_id (fk to users)
- role (owner, admin, member)
- created_at
- updated_at

### company_invites
- id (uuid, primary key)
- company_id (fk to companies)
- email
- role (admin, member)
- invite_code (unique)
- invited_by (fk to users)
- accepted_at
- expires_at
- created_at

### audit_logs
- id (uuid, primary key)
- company_id (fk to companies)
- user_id (fk to users)
- action (create, update, delete, login, etc.)
- entity_type (table, row, user, company, etc.)
- entity_id
- changes (jsonb) - before/after values
- ip_address
- user_agent
- created_at

---

## Success Criteria

- [ ] User can register and login
- [ ] Magic link authentication works
- [ ] User can create company
- [ ] User can invite others to company
- [ ] User can switch between companies
- [ ] All operations are audited
- [ ] Multi-tenancy is enforced (users only see their company data)

---

**Blocked By**: None  
**Blocks**: All future phases (need auth for proper testing)  
**Next Phase**: Phase 1.5 - Table Enhancements

