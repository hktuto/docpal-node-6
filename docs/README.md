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
| Phase 2: Authentication | 🔄 **Next** | 2-3 weeks | [View Plan](./DEVELOPMENT_PLAN/phase2.md) |
| Phase 1.5: Table Enhancements | 📋 Planned | 2-3 weeks | [View Plan](./DEVELOPMENT_PLAN/phase1.5.md) |
| Phase 3: Basic Workflows | 📋 Planned | 3-4 weeks | [View Plan](./DEVELOPMENT_PLAN/phase3.md) |
| Phase 4: Real-time Features | 📋 Planned | 3-4 weeks | [View Plan](./DEVELOPMENT_PLAN/phase4.md) |
| Phase 5: Advanced Features | 📋 Planned | 4-5 weeks | [View Plan](./DEVELOPMENT_PLAN/phase5.md) |

**Total Estimated Timeline**: 5-6 months

---

## Documentation Structure

```
docs/
├── README.md                    # This file - master plan overview
├── DEVELOPMENT_PLAN/            # Phase plans with goals and actions
│   ├── phase1.md               # Phase 1: POC (Complete)
│   ├── phase2.md               # Phase 2: Authentication (Next)
│   ├── phase1.5.md             # Phase 1.5: Table Enhancements
│   ├── phase3.md               # Phase 3: Workflows
│   ├── phase4.md               # Phase 4: Real-time
│   └── phase5.md               # Phase 5: Advanced
├── DEVELOPMENT_PROCESS/         # Daily work logs
│   └── 2025-12-20.md           # Phase 1 completion log
├── AI_SETUP.md                  # AI configuration guide (OpenAI/Ollama)
├── API_RESPONSE_FORMAT.md       # API standards
└── MIDDLEWARE_GUIDE.md          # Server middleware guide
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

### AI Integration (Optional)
- Supports OpenAI (cloud) and Ollama (self-hosted)
- Reusable AI service
- Graceful fallback to patterns
- See `AI_SETUP.md` for details

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

## Current Focus

**Phase 2: Authentication & Company Management**

Building user authentication, company management, and multi-tenancy features to enable real usage of the platform.

See [`DEVELOPMENT_PLAN/phase2.md`](./DEVELOPMENT_PLAN/phase2.md) for details.

---

**Last Updated**: December 20, 2025  
**Next Milestone**: Phase 2 - Authentication
