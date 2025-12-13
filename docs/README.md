# Documentation Index

Welcome to the DocPal POC documentation! Start here to navigate all documentation.

---

## 🚀 Quick Start (Start Here!)

### [Quick Start Guide](./Quick-Start-Guide.md) ⭐
**Setup and run the project in 5 minutes**
- Prerequisites and installation
- Docker setup (PostgreSQL + MinIO)
- Running migrations
- Starting the dev server

---

## 📖 Core Documentation

### [API Reference](./API-Reference.md) ⭐⭐⭐
**Complete API specification - use this to build features**
- All endpoints with examples
- Request/response formats
- Authentication (mock)
- Databases, Tables, Columns, Records, Views, Files

### [Query API Spec](./Query-API-Spec.md) ⭐⭐
**Detailed query API documentation**
- Flexible filtering (nested AND/OR)
- Multiple sorts
- Field selection and link expansion
- Grouping support
- Cursor-based pagination

### [Database Schema](./Database-Schema.md) ⭐⭐
**Complete database schema reference**
- 8 tables explained
- JSONB structure for records
- Indexes and relationships
- Query examples

### [Views & Widgets Architecture](./Views-Unified-Architecture.md) ⭐⭐
**How views work - unified widget system**
- Every view is a dashboard with widgets
- 9 widget types (table, kanban, calendar, chart, number, etc.)
- Multi-level grouping
- Mix widgets in one view

### [Column Types](./Column-Types.md) ⭐
**All 6 column types specification**
- text, number, boolean, date, file, link
- Options and constraints per type
- Storage format and validation

---

## 📋 Planning & Roadmap

### [BRD - Business Requirements](./BRD-2025-12-12.md)
**Original product requirements document**
- Product vision and objectives
- Features and scope
- Data model and permissions

### [Development Plan POC](./Development-Plan-POC.md)
**Phased development plan (5 weeks)**
- Week-by-week task breakdown
- Deliverables per phase
- Success criteria

### [Roadmap](./Roadmap.md)
**Long-term product roadmap (10 phases)**
- Phase 1: POC (current)
- Phase 2-3: Multi-user & permissions
- Phase 4: Cross-database linking
- Phase 5+: Advanced features

### [Task Tracking](./Task-Tracking.md)
**Checklist of all tasks**
- Track progress as you build
- Mark off completed tasks

---

## 🏗️ Architecture & Design Decisions

### [Access Control Design](./Access-Control-Design.md)
**Multi-user permission system**
- Database-scoped roles
- Table permissions (CRUD flags)
- Column and row rules
- Cross-database linking (3 modes: private/public/on_request)

### [Auth Implementation](./Auth-Implementation.md)
**Authentication system (mock for POC, real for production)**
- Mock auth endpoints
- Frontend auth flow
- Migration to real auth
- Security checklist

### [JSONB Analysis](./JSONB-Analysis.md)
**Why JSONB works for dynamic schema**
- Advanced filtering capabilities
- Sorting and performance
- Query examples
- Optimization strategies

### [ORM Decision](./ORM-Decision.md)
**Why postgres.js instead of Prisma**
- JSONB flexibility
- Performance considerations
- Migration management

---

## 📂 Document Organization

```
docs/
├── README.md (this file)           ← Navigation hub
│
├── 🚀 Getting Started
│   └── Quick-Start-Guide.md        ← Setup instructions
│
├── 📖 Core Documentation
│   ├── API-Reference.md            ← API spec (most important!)
│   ├── Query-API-Spec.md           ← Query API deep dive
│   ├── Database-Schema.md          ← Schema reference
│   ├── Views-Unified-Architecture.md  ← Views & widgets
│   └── Column-Types.md             ← Column types spec (7 types)
│
├── 📋 Planning
│   ├── BRD-2025-12-12.md          ← Requirements
│   ├── Development-Plan-POC.md     ← Development phases
│   ├── Roadmap.md                  ← Long-term roadmap
│   └── Task-Tracking.md            ← Task checklist
│
└── 🏗️ Architecture
    ├── Access-Control-Design.md    ← Permission system
    ├── Auth-Implementation.md      ← Authentication
    ├── JSONB-Analysis.md          ← JSONB deep dive
    └── ORM-Decision.md            ← Database client choice
```

---

## 🎯 What to Read Based on Your Goal

### "I want to set up the project"
→ [Quick Start Guide](./Quick-Start-Guide.md)

### "I want to build the API"
→ [API Reference](./API-Reference.md) ⭐⭐⭐
→ [Query API Spec](./Query-API-Spec.md) ⭐⭐ (for complex queries)

### "I want to understand the database"
→ [Database Schema](./Database-Schema.md)
→ [JSONB Analysis](./JSONB-Analysis.md)

### "I want to understand views"
→ [Views & Widgets Architecture](./Views-Unified-Architecture.md)

### "I want to understand permissions"
→ [Access Control Design](./Access-Control-Design.md)

### "I want to track progress"
→ [Task Tracking](./Task-Tracking.md)
→ [Development Plan POC](./Development-Plan-POC.md)

---

## 📝 Key Concepts Quick Reference

### POC Simplifications
- ✅ Fixed admin user (no real auth)
- ✅ Single company
- ✅ No permissions (Phase 2+)
- ✅ Same-database links only (cross-database in Phase 4)

### Tech Stack
- **Frontend/Backend**: Nuxt 4
- **Database**: PostgreSQL with JSONB
- **DB Client**: postgres.js (no ORM)
- **File Storage**: MinIO
- **Package Manager**: pnpm

### Core Architecture
- **Dynamic schema**: Records stored as JSONB
- **Column types**: text, number, boolean, date, file, link, computed (Phase 2)
- **Views**: Unified widget system (every view is a dashboard)
- **Query API**: POST-based with nested filters, multiple sorts, grouping
- **Soft delete**: All entities use `deleted_at`

### Fixed Credentials (POC)
- **User ID**: `00000000-0000-0000-0000-000000000001`
- **Username**: `admin` / **Password**: `admin123`
- **Company ID**: `00000000-0000-0000-0000-000000000002`

---

## 🔄 Document Status

| Document | Status | Purpose |
|----------|--------|---------|
| Quick Start Guide | ✅ Complete | Setup instructions |
| API Reference | ✅ Complete | API specification |
| Query API Spec | ✅ Complete | Query API details |
| Database Schema | ✅ Complete | Schema reference |
| Views & Widgets | ✅ Complete | View architecture |
| Column Types | ✅ Complete | Column specifications (7 types) |
| Access Control | ✅ Complete | Permission design |
| Auth Implementation | ✅ Complete | Auth system |
| Development Plan | ✅ Complete | Development phases |
| Roadmap | ✅ Complete | Long-term plan |
| Task Tracking | 🔄 In Progress | Task checklist |

---

## 💡 Tips

1. **Start with Quick Start** - Get the project running
2. **Use API Reference** - It has everything for building endpoints
3. **Check Task Tracking** - Mark off tasks as you complete them
4. **Update docs** - Keep them current as you make changes
5. **Follow Roadmap** - Stay on track with planned phases

---

## 📚 Related Files

### In Codebase
- `.cursor/rules/main.md` - Cursor AI context and rules
- `packages/admin/server/database/` - Migrations and connection
- `packages/admin/server/types/database.ts` - TypeScript types
- `docker-compose.dev.yml` - Docker services config

---

## 🆘 Need Help?

1. Check the relevant doc above
2. Review code examples in API Reference
3. Look at migration files for schema details
4. Check JSONB Analysis for query examples
5. See Views & Widgets for view configuration

**Most Important Docs:**
- 🥇 [API Reference](./API-Reference.md) - Build features
- 🥈 [Database Schema](./Database-Schema.md) - Understand data
- 🥉 [Views & Widgets](./Views-Unified-Architecture.md) - Build views
