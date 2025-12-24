# DocPal - Master Development Plan

## Project Overview

A low-code platform built with Nuxt + NuxtHub allowing users to create companies, workspaces, dynamic data tables, views, dashboards, and automation workflows.

**Note**: As of December 23, 2025, we renamed "Apps" to "Workspaces" to better reflect their purpose as data workspace containers. This prepares the platform for a future "Apps" feature that will allow custom page collections with navigation.

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
| **Phase 2.4: Column Management & Field Types** | 🔄 In Progress | 3-4 weeks | [View Plan](./DEVELOPMENT_PLAN/phase2.4-column-management.md) |
| **Phase 2.5: Desktop Windowing System** | 🚧 **In Progress** | 3-4 weeks | [View Plan](./DEVELOPMENT_PLAN/phase2.5-desktop-view.md) |
| Phase 2.6: Views, Sharing & Permissions | 📋 Planned | 3-4 weeks | [View Plan](./DEVELOPMENT_PLAN/phase2.6-views-and-permissions.md) |
| Phase 3: Basic Workflows | 📋 Planned | 3-4 weeks | [View Plan](./DEVELOPMENT_PLAN/phase3.md) |
| Phase 4: Real-time Features | 📋 Planned | 3-4 weeks | [View Plan](./DEVELOPMENT_PLAN/phase4.md) |
| Phase 4.5: AI Assistant | 📋 Planned | 6 weeks | [View Plan](./DEVELOPMENT_PLAN/phase4.5-ai-assistant.md) |
| Phase 5: Advanced Features | 📋 Planned | 4-5 weeks | [View Plan](./DEVELOPMENT_PLAN/phase5.md) |

**Total Estimated Timeline**: 7-8 months

---

## Documentation Structure

```
docs/
├── README.md                                # This file - master plan overview
├── DEVELOPMENT_PLAN/                        # Phase plans with goals and actions
│   ├── README.md                            # Development roadmap overview
│   ├── phase1.md                            # Phase 1: POC (Complete)
│   ├── phase2.md                            # Phase 2: Authentication (Complete)
│   ├── phase2.4-column-management.md        # Phase 2.4: Column Mgmt (In Progress)
│   ├── phase2.4-datagrid-structure.md       # Phase 2.4.2: DataGrid Structure
│   ├── phase2.4-relations-implementation.md # Phase 2.4.3: Relations
│   ├── phase2.4-geolocation-fields.md       # Phase 2.4.4: Geolocation
│   ├── phase2.5-desktop-view.md             # Phase 2.5: Desktop Windowing (Current)
│   ├── phase2.6-views-and-permissions.md    # Phase 2.6: Views & Permissions
│   ├── phase3.md                            # Phase 3: Workflows
│   ├── phase4.md                            # Phase 4: Real-time
│   ├── phase4.5-ai-assistant.md             # Phase 4.5: AI Assistant
│   └── phase5.md                            # Phase 5: Advanced
├── DEVELOPMENT_PROCESS/                     # Daily work logs
│   ├── 2025-12-20.md                        # Phase 1 completion log
│   ├── 2025-12-21.md                        # Phase 2 work log
│   └── 2025-12-22.md                        # Desktop windowing development
├── DESKTOP_WINDOWING_SYSTEM.md              # Desktop system documentation
├── DESKTOP_QUICK_REFERENCE.md               # Desktop quick reference
├── AUDIT_LOGGING.md                         # Audit logging documentation
├── AUTH_SETUP.md                            # Authentication setup guide
├── AUTH_QUICK_START.md                      # Quick start for auth
├── DATABASE_MANAGEMENT.md                   # Database management guide
├── AI_SETUP.md                              # AI configuration guide (OpenAI/Ollama)
├── API_RESPONSE_FORMAT.md                   # API standards
└── MIDDLEWARE_GUIDE.md                      # Server middleware guide
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

### Architecture
- **Companies**: Top-level tenant isolation
- **Workspaces**: Data workspace containers (formerly "Apps")
- **Tables**: Dynamic data tables with custom columns
- **Views**: Different ways to visualize table data
- **Apps** (Future): Custom page collections with navigation

### API Standards
- Modified JSend format
- Slug-based routing
- Type-safe shared types
- Server middleware for context

### AI Integration
- **Phase 4.5**: Comprehensive AI Assistant with Ollama (Qwen 2.5 14B)
- Self-hosted LLM for privacy and unlimited usage
- Function calling for natural language commands
- Context-aware suggestions and automation
- Supports OpenAI (cloud) and Ollama (self-hosted)
- Requires Phase 4 (Real-time) for full functionality
- See `AI_SETUP.md` and `phase4.5-ai-assistant.md` for details

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

**Phase 2.5: Desktop Windowing System** ✅ Foundation Complete, ✅ UX Polish Complete, 📋 Enhancements Planned

Building a complete desktop windowing experience within the browser:

**Completed (Phase 2.5.1):**
- ✅ Draggable, resizable windows with GPU acceleration
- ✅ Maximize, minimize, close operations
- ✅ Dock system with auto-hide (Ubuntu/macOS hybrid)
- ✅ Window snapping (left/right/full) with visual zones
- ✅ Keyboard shortcuts (Cmd/Ctrl + Shift + Arrows)
- ✅ Cross-iframe communication via postMessage
- ✅ Ctrl/Cmd + Click to open new windows
- ✅ Visual polish (animations, glow effects, dock bounce)
- ✅ State persistence (localStorage)
- ✅ Comprehensive documentation

**Completed (Phase 2.5.1.5 - Dec 23, 2025):**
- ✅ Dock trigger zone (works even with maximized windows)
- ✅ Auto-open home window for first-time users
- ✅ "Open in Desktop Mode" button (Standalone → Desktop)
- ✅ "Open Standalone" button (Desktop → Standalone)
- ✅ Smart Ctrl+Click support (new tab behavior)
- ✅ Query param handling with smart window focusing
- ✅ Automatic query param cleanup

**Completed (Phase 2.5.1.6 - Dec 24, 2025):**
- ✅ Multi-tab windows (browser-style tabs within windows)
- ✅ TabHeader component with tab bar and controls
- ✅ TabContent component with optimized iframe rendering
- ✅ Tab operations (switch, close, new tab)
- ✅ Tab title and URL tracking
- ✅ State persistence for all tabs
- ✅ Backward compatibility with single-tab windows

**Planned (Phase 2.5.2):**
1. **Mobile & Responsive** - Full mobile support and small window handling
2. **Browser History** - Integration with browser back/forward
3. **Pin to Dock** - Add custom pages to dock
4. **Desktop Groups** - Multiple desktop workspaces
5. **Polish** - Additional UX improvements

**Timeline:** 2-3 weeks for enhancements

See [`DEVELOPMENT_PLAN/phase2.5-desktop-view.md`](./DEVELOPMENT_PLAN/phase2.5-desktop-view.md) for details.

---

## Up Next

**Phase 2.6: Views, Sharing & Permissions** (3-4 weeks)

Complete views system with filtering, sorting, bulk operations, and comprehensive permissions for workspaces, tables, and views.

See [`DEVELOPMENT_PLAN/phase2.6-views-and-permissions.md`](./DEVELOPMENT_PLAN/phase2.6-views-and-permissions.md) for details.

---

**Last Updated**: December 24, 2025  
**Current Phase**: Phase 2.5 - Desktop Windowing (Foundation & UX & Multi-tab Complete)  
**Latest Additions**: Multi-tab windows with browser-style tabs within desktop windows  
**Next Milestone**: Phase 2.5.2 Enhancements or Phase 2.6 Views & Permissions
