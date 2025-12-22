# DocPal - Master Development Plan

## Project Overview

A low-code platform built with Nuxt + NuxtHub allowing users to create companies, apps, dynamic data tables, views, dashboards, and automation workflows.

## Tech Stack

- **Frontend**: Nuxt 4, Element Plus, SCSS + CSS Variables
- **Backend**: NuxtHub, PostgreSQL, Drizzle ORM
- **File Storage**: MinIO (S3-compatible)
- **AI**: OpenAI + Ollama (optional, self-hosted LLM)
- **Workflow Engine**: Temporal (Phase 5)
- **Real-time**: WebSockets/SSE (Phase 4)

---

## Development Phases

| Phase | Status | Duration | Details |
|-------|--------|----------|---------|
| Phase 1: POC - Dynamic Tables | ✅ **Complete** | 3 weeks | [View Plan](./DEVELOPMENT_PLAN/phase1.md) |
| Phase 2: Authentication | ✅ **Complete** | 2-3 weeks | [View Plan](./DEVELOPMENT_PLAN/phase2.md) |
| **Phase 2.4: Column Management & Field Types** | 🔄 **Next** | 3-4 weeks | [View Plan](./DEVELOPMENT_PLAN/phase2.4-column-management.md) |
| **Phase 2.5: AI Assistant** | 📋 Planned | 6 weeks | [View Plan](./DEVELOPMENT_PLAN/phase2.5-ai-assistant.md) |
| Phase 1.5: Views & Bulk Operations | 📋 Planned | 2-3 weeks | [View Plan](./DEVELOPMENT_PLAN/phase1.5.md) |
| Phase 3: Basic Workflows | 📋 Planned | 3-4 weeks | [View Plan](./DEVELOPMENT_PLAN/phase3.md) |
| Phase 4: Real-time Features | 📋 Planned | 3-4 weeks | [View Plan](./DEVELOPMENT_PLAN/phase4.md) |
| Phase 5: Advanced Features | 📋 Planned | 4-5 weeks | [View Plan](./DEVELOPMENT_PLAN/phase5.md) |

**Total Estimated Timeline**: 7-8 months

---

## Documentation Structure

```
docs/
├── README.md                       # This file - master plan overview
├── DEVELOPMENT_PLAN/                  # Phase plans with goals and actions
│   ├── phase1.md                     # Phase 1: POC (Complete)
│   ├── phase2.md                     # Phase 2: Authentication (Complete)
│   ├── phase2.4-column-management.md # Phase 2.4: Column Mgmt & Field Types (Next)
│   ├── phase2.5-ai-assistant.md      # Phase 2.5: AI Assistant (Planned)
│   ├── phase1.5.md                   # Phase 1.5: Views & Bulk Operations
│   ├── phase3.md                     # Phase 3: Workflows
│   ├── phase4.md                     # Phase 4: Real-time
│   └── phase5.md                     # Phase 5: Advanced
├── DEVELOPMENT_PROCESS/            # Daily work logs
│   ├── 2025-12-20.md              # Phase 1 completion log
│   └── 2025-12-21.md              # Phase 2 work log
├── AUDIT_LOGGING.md                # Audit logging documentation
├── AUTH_SETUP.md                   # Authentication setup guide
├── AUTH_QUICK_START.md             # Quick start for auth
├── DATABASE_MANAGEMENT.md          # Database management guide
├── AI_SETUP.md                     # AI configuration guide (OpenAI/Ollama)
├── API_RESPONSE_FORMAT.md          # API standards
└── MIDDLEWARE_GUIDE.md             # Server middleware guide
```

---

## Quick Start

### For New Developers

1. **Read this README** - Understand overall project structure
2. **Check current phase plan** - See what we're working on
3. **Review latest process log** - See recent progress
4. **Set up environment** - Follow setup instructions in phase docs

### For Continuing Development

1. **Check current phase** - Review goals and actions
2. **Update task status** - Mark completed actions
3. **Log your work** - Update `DEVELOPMENT_PROCESS/` daily
4. **Move to next phase** - When all actions complete

---

## Key Decisions

### Multi-Tenancy
- Company-prefixed table names: `dt_[companyId]_[tableId]`
- Slugs unique per company (not globally)
- Physical data isolation

### API Standards
- Modified JSend format
- Slug-based routing
- Type-safe shared types
- Server middleware for context

### AI Integration
- **Phase 2.5**: Comprehensive AI Assistant with Ollama (Qwen 2.5 14B)
- Self-hosted LLM for privacy and unlimited usage
- Function calling for natural language commands
- Context-aware suggestions and automation
- Supports OpenAI (cloud) and Ollama (self-hosted)
- See `AI_SETUP.md` and `phase2.5-ai-assistant.md` for details

---

## Phase 1 Achievements (Complete)

**What We Built:**
- ✅ Dynamic table creation with physical PostgreSQL tables
- ✅ Full CRUD operations (15 API endpoints)
- ✅ DataGrid with vxe-table (virtual scrolling)
- ✅ AI-powered column suggestions
- ✅ Multi-tenant architecture
- ✅ Comprehensive documentation

**Statistics:**
- 35+ files created
- 15 API endpoints
- 12 components
- 8,000+ lines of code

---

## Phase 2 Achievements (Complete)

**What We Built:**
- ✅ Session-based authentication with magic links
- ✅ Company creation and management
- ✅ Multi-company support with switching
- ✅ Role-based access control (owner, admin, member)
- ✅ Invite system with email notifications
- ✅ Comprehensive audit logging
- ✅ User profile management
- ✅ Company settings with audit log viewer

**Statistics:**
- 20+ API endpoints
- 15+ components
- Complete auth flow
- Full audit trail

---

## Current Focus

**Phase 2.4: Column Management & Field Types** ⚠️ **Critical Before AI**

Implementing essential features missing from the current system:

**Why Critical:**
- ❌ Users currently can't add columns after creating a table!
- ❌ AI Assistant can't suggest advanced field types we don't have
- ❌ Can't test AI without variety of field types

**What We're Building:**
1. **Column CRUD** - Add/edit/delete columns after table creation
2. **15+ Field Types** - Including complex types (formula, relation, aggregation, lookup)
3. **Validation System** - Email format, phone format, required fields, constraints
4. **Column Configuration** - Options for selects, default values, visibility toggle
5. **Formula Engine** - Excel-like formulas with field references
6. **Relation System** - Link tables together with foreign keys
7. **Aggregation Engine** - SUM, COUNT, AVG, MIN, MAX
8. **Lookup System** - Pull data from related records

**Timeline:** 3-4 weeks (extended for complex types)

See [`DEVELOPMENT_PLAN/phase2.4-column-management.md`](./DEVELOPMENT_PLAN/phase2.4-column-management.md) for details.

---

## Up Next

**Phase 2.5: AI Assistant** (6 weeks - after Phase 2.4)

Comprehensive AI assistant powered by Ollama (Qwen 2.5 14B) that helps users build tables, query data, create dashboards, and automate tasks via natural language.

See [`DEVELOPMENT_PLAN/phase2.5-ai-assistant.md`](./DEVELOPMENT_PLAN/phase2.5-ai-assistant.md) for details.

---

**Last Updated**: December 22, 2025  
**Next Milestone**: Phase 2.4 - Column Management & Field Types
