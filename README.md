# DocPal - Low-Code Application Platform

A powerful low-code platform built with Nuxt + NuxtHub that allows users to create dynamic databases, views, dashboards, and automation workflows.

## 🎯 Project Vision

DocPal enables users to:
- Create companies and collaborate with team members
- Build custom applications with dynamic data tables
- Design flexible views (table, kanban, gantt, calendar)
- Create interactive dashboards with widgets
- Set up advanced workflows and automations
- Manage granular permissions (table & row-level)

## 🏗️ Tech Stack

- **Frontend**: Nuxt 4
- **UI Library**: Element Plus
- **Styling**: SCSS + CSS Variables (no Tailwind)
- **Backend**: NuxtHub
- **Database**: PostgreSQL + Drizzle ORM
- **File Storage**: MinIO (S3-compatible)
- **Workflow Engine**: Temporal (Phase 5)
- **Real-time**: WebSockets/SSE (Phase 4)

## 📋 Development Phases

The project is divided into 5 phases:

### Phase 1: POC - Dynamic Tables & Views (CURRENT)
- Create dynamic database tables with custom schemas
- Add/edit/delete records in dynamic tables
- Build views with filters and sorting
- Auto-generate forms and card views

### Phase 2: Authentication & Multi-Tenancy
- Session-based authentication
- Company management
- User invitations (magic links + invite codes)
- Multi-tenancy support

### Phase 3: Basic Workflows
- Workflow triggers (on record create/update/delete)
- Basic actions (update record, create record, user forms)
- Condition-based execution
- Execution history

### Phase 4: Real-Time Features
- User presence tracking
- Live data updates
- Collaborative editing
- WebSocket/SSE implementation

### Phase 5: Advanced Features
- Temporal workflow engine integration
- Document generation & e-signatures
- Advanced permissions (row-level)
- Dashboard builder with widgets
- Folder system

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm 8+
- Docker & Docker Compose

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Development Services

```bash
# Start PostgreSQL and MinIO
docker-compose -f docker-compose.dev.yml up -d

# Verify services are running
docker-compose -f docker-compose.dev.yml ps
```

**Services:**
- PostgreSQL: `localhost:5432`
  - Database: `docpal`
  - User: `docpal`
  - Password: `docpal_dev`
- MinIO Console: `http://localhost:9001`
  - Username: `minioadmin`
  - Password: `minioadmin`
- MinIO API: `localhost:9000`

### 3. Set Up Environment Variables

Create a `.env` file:

```bash
# Database
DATABASE_URL="postgresql://docpal:docpal_dev@localhost:5432/docpal"

# MinIO (S3-compatible)
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_USE_SSL="false"
MINIO_BUCKET="docpal"

# Session Secret (generate: openssl rand -base64 32)
SESSION_SECRET="dev-secret-change-in-production"
```

### 4. Seed Initial Data

Before creating apps, you need to seed the database with initial user and company data:

```bash
# Make sure dev server is running first
pnpm dev

# In another terminal, run the seed script
pnpm seed
```

This creates:
- A development user (`dev@docpal.local`)
- A development company (ID: `00000000-0000-0000-0000-000000000001`)

**Note**: The seed script is idempotent - it's safe to run multiple times.

### 5. Start Development

NuxtHub automatically manages Drizzle ORM and applies migrations on dev server start:

```bash
# Generate migrations from schema (when you create/modify schema files)
pnpm db:generate

# Start dev server (auto-applies migrations)
pnpm dev
```

Visit `http://localhost:3000`

**Note**: Database schema files are in `server/db/schema/`. NuxtHub automatically scans and imports them.

## 📁 Project Structure

```
docpal-node-6/
├── app/                          # Nuxt app directory
│   └── app.vue
├── components/                   # Vue components
│   ├── app/                     # App-related components
│   ├── table/                   # Dynamic table components
│   ├── view/                    # View components
│   ├── fields/                  # Field type components
│   └── workflow/                # Workflow components
├── composables/                  # Vue composables
│   ├── useTable.ts
│   ├── useRecord.ts
│   ├── useView.ts
│   └── useDynamicForm.ts
├── pages/                        # Nuxt pages (routes)
│   ├── index.vue                # App list
│   └── apps/
│       └── [appId]/
│           ├── index.vue        # App dashboard
│           ├── tables/          # Table views
│           ├── views/           # View pages
│           └── settings/        # App settings
├── server/                       # Backend code
│   ├── api/                     # API endpoints
│   │   ├── apps/
│   │   ├── tables/
│   │   ├── views/
│   │   └── workflows/
│   ├── db/                      # Database
│   │   ├── schema/              # Drizzle schemas
│   │   │   ├── user.ts
│   │   │   ├── company.ts
│   │   │   ├── app.ts
│   │   │   ├── dataTable.ts
│   │   │   └── view.ts
│   │   └── migrations/          # SQL migrations
│   ├── utils/                   # Server utilities
│   │   ├── dynamicTable.ts      # Dynamic table manager
│   │   ├── schemaGenerator.ts   # SQL schema generator
│   │   ├── typeMapper.ts        # Type conversions
│   │   └── queryBuilder.ts      # Query builder
│   └── middleware/              # Server middleware
├── shared/                       # Shared code
│   └── types/                   # TypeScript types
├── docs/                         # Documentation
│   ├── DEVELOPMENT_PLAN.md      # Full development plan
│   ├── PHASE_1_TECHNICAL_SPEC.md # Phase 1 detailed spec
│   └── ARCHITECTURE.md          # Architecture decisions
├── docker-compose.dev.yml        # Dev services
├── nuxt.config.ts               # Nuxt configuration
├── drizzle.config.ts            # Drizzle configuration
└── package.json
```

## 🔧 Available Scripts

```bash
# Development
pnpm dev                  # Start dev server (auto-applies migrations)

# Database (NuxtHub commands)
pnpm db:generate          # Generate migrations from schema
pnpm db:migrate           # Apply migrations
pnpm db:drop              # Drop database
pnpm db:sql               # Execute SQL query

# Build
pnpm build                # Build for production
pnpm preview              # Preview production build

# Code Quality
pnpm lint                 # Lint code
pnpm type-check           # Type checking

# Docker
pnpm docker:up            # Start PostgreSQL & MinIO
pnpm docker:down          # Stop services
pnpm docker:logs          # View logs
pnpm docker:restart       # Restart services

# Setup
pnpm setup                # Start Docker + run migrations
```

## 📚 Documentation

Essential documentation for the project:

- **[Development Plan](./docs/DEVELOPMENT_PLAN.md)** - Complete 5-phase development roadmap with detailed implementation specs
- **[Architecture](./docs/ARCHITECTURE.md)** - Key architectural decisions, multi-tenancy strategy, and system design

## 🎯 Development Roadmap

### Phase 1: Dynamic Tables & Views POC (4-6 weeks)
Prove dynamic table creation works with company-prefixed tables (`dt_[companyId]_[tableId]`)

### Phase 2: Auth & Multi-Tenancy (3-4 weeks)
User authentication, company management, invitations, **and audit logging system**

### Phase 3: Basic Workflows (3-4 weeks)
Workflow engine with triggers, actions, and **workflow audit integration**

### Phase 4: Real-time & Activity Feed (3-4 weeks)
WebSockets, live updates, **unified activity feed with comments and interactive workflow approvals**

### Phase 5: Advanced Features (6-8 weeks)
Temporal workflows, advanced permissions, dashboards, folders, document generation

See [Development Plan](./docs/DEVELOPMENT_PLAN.md) for detailed specifications.

## 🤝 Contributing

This is currently a private project in active development. 

## 📝 License

Private - All rights reserved

## 🔗 Links

- [Nuxt Documentation](https://nuxt.com/docs)
- [NuxtHub Documentation](https://hub.nuxt.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Element Plus Documentation](https://element-plus.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Note**: This project is in active development. The architecture and features may change as we progress through the development phases.
