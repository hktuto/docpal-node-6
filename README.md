# DocPal

A low-code platform built with Nuxt + NuxtHub for creating dynamic data tables, views, dashboards, and automation workflows.

## Tech Stack

- **Frontend**: Nuxt 4 + Element Plus
- **Backend**: NuxtHub (Nuxt Server)
- **Database**: PostgreSQL 16 + PostGIS + Drizzle ORM
- **Storage**: MinIO (S3-compatible)
- **Styling**: SCSS + CSS Variables

## Quick Start

```bash
# Install dependencies
pnpm install

# Start Docker (PostgreSQL + MinIO + PostGIS)
pnpm docker:up

# Generate and run database migrations
pnpm db:generate
pnpm db:migrate

# Start development server
pnpm dev
```

Or use the all-in-one setup command:

```bash
pnpm setup && pnpm dev
```

## Available Commands

### Development
```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm preview      # Preview production build
```

### Docker
```bash
pnpm docker:up       # Start containers (auto-enables PostGIS)
pnpm docker:down     # Stop containers
pnpm docker:logs     # View container logs
pnpm docker:restart  # Restart containers
```

### Database
```bash
pnpm db:generate  # Generate migrations from schema changes
pnpm db:migrate   # Apply migrations
pnpm db:drop      # Drop all tables (destructive!)
pnpm db:sql       # Open SQL console
```

### Setup
```bash
pnpm setup           # Full setup: Docker + DB + PostGIS
pnpm postgis:enable  # Enable PostGIS extensions (auto-run on docker:up)
```

## Project Structure

```
.
├── app/                    # Nuxt frontend
│   ├── components/         # Vue components
│   ├── composables/        # Vue composables
│   ├── layouts/            # Page layouts
│   ├── pages/              # Route pages
│   └── assets/             # Static assets & styles
├── server/                 # Nuxt backend
│   ├── api/                # API endpoints
│   ├── db/schema/          # Drizzle ORM schemas
│   └── utils/              # Server utilities
├── shared/                 # Shared code (frontend + backend)
│   ├── types/              # TypeScript types
│   └── utils/              # Shared utilities
├── docs/                   # Documentation
│   ├── DEVELOPMENT_PLAN.md
│   ├── ARCHITECTURE.md
│   └── DEVELOPMENT_PROCESS/  # Daily session logs
│       └── YYYY-MM-DD.md
└── docker/                 # Docker configs
    └── init-postgis.sql
```

## Features (Phase 1 - Backend Complete ✅)

### Frontend (UI)
- ✅ App management with slug-based routing
- ✅ Dynamic menu system with drag-and-drop
- ✅ Nested folders with expand/collapse
- ✅ Resizable sidebar (el-splitter)
- ✅ App context provider/inject pattern
- ✅ CSS variable system for theming
- ✅ PostGIS for geolocation support

### Backend (API) - Completed 2025-12-20
- ✅ Dynamic table creation with custom schemas
- ✅ Physical PostgreSQL table generation
- ✅ Full app CRUD operations
- ✅ Full table CRUD operations
- ✅ Full row CRUD operations (Create, Read, Update, Delete)
- ✅ Multi-tenant context middleware (company + app scoping)
- ✅ Type-safe event context with IntelliSense
- ✅ Auto-label generation from column names
- ✅ AI-powered column type suggestions (with Ollama integration)
- ✅ Comprehensive test coverage (15 API endpoints + middleware tests)

### Next Up
- ⏳ Column management (add/remove/reorder)
- ⏳ Views with filtering and sorting
- ⏳ Frontend UI for table/row management

## Database Schema

### Core Metadata Tables
- `users` - User accounts (UUID, email, name, avatar)
- `companies` - Company/organization management
- `apps` - Applications with dynamic menus (JSONB)
- `data_tables` - Dynamic table metadata (schema, app_id, company_id)
- `data_table_columns` - Column definitions (name, label, type, config)

### Dynamic Tables (Created at Runtime)
Dynamic tables are created at runtime with company-prefixed naming:
- **Format**: `dt_[companyId]_[tableId]`
- **Example**: `dt_000000000000_8f3a4b2c1d9e4f5a`
- **System Columns**: `id` (UUID), `created_at`, `updated_at`, `created_by`
- **User Columns**: Defined via API with types (text, number, date, email, switch, etc.)

## Documentation

- **[Development Plan](docs/DEVELOPMENT_PLAN.md)** - Detailed roadmap and architecture
- **[Architecture](docs/ARCHITECTURE.md)** - System design and decisions  
- **[Middleware Guide](docs/MIDDLEWARE_GUIDE.md)** - Server middleware and context system
- **[Testing Middleware](docs/TESTING_MIDDLEWARE.md)** - How to test middleware
- **[AI Integration Setup](docs/AI_INTEGRATION_SETUP.md)** - How to configure AI-powered column type suggestions
- **[Development Process](docs/DEVELOPMENT_PROCESS/)** - Daily session logs tracking development history
  - [2025-12-19](docs/DEVELOPMENT_PROCESS/2025-12-19.md) - Foundation & Menu System
  - [2025-12-20](docs/DEVELOPMENT_PROCESS/2025-12-20.md) - Dynamic Tables & Middleware

## Environment Variables

Create a `.env` file (see `.env.example`):

```env
# Database (matches docker-compose.dev.yml)
DATABASE_URL=postgresql://docpal:docpal_dev@localhost:5432/docpal

# MinIO (matches docker-compose.dev.yml)
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false

# AI/LLM (Optional - for column type suggestions)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:7b
```

See **[AI Integration Setup](docs/AI_INTEGRATION_SETUP.md)** for detailed instructions on configuring AI features, or **[Model Recommendations](docs/AI_MODEL_RECOMMENDATIONS.md)** for help choosing the best model.

## Development Workflow

1. **Make schema changes** in `server/db/schema/*.ts`
2. **Generate migration**: `pnpm db:generate`
3. **Apply migration**: `pnpm db:migrate`
4. **Verify** in PostgreSQL: `pnpm db:sql`

## Troubleshooting

### PostGIS not enabled
```bash
pnpm postgis:enable
```

### Reset database
```bash
pnpm docker:down
docker volume rm docpal-node-6_postgres_data
pnpm docker:up
```

### View logs
```bash
pnpm docker:logs
```

## License

Private project - All rights reserved

---

**Current Phase**: Phase 1 - POC (Dynamic Tables & Views)  
**Progress**: Foundation complete (~35%), Dynamic tables next  
**Last Updated**: December 20, 2025
