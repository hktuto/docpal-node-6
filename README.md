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
│   ├── GEOLOCATION_GUIDE.md
│   └── SESSION_SUMMARY.md
└── docker/                 # Docker configs
    └── init-postgis.sql
```

## Features (Phase 1 - In Progress)

- ✅ App management with slug-based routing
- ✅ Dynamic menu system with drag-and-drop
- ✅ Nested folders with expand/collapse
- ✅ Resizable sidebar (el-splitter)
- ✅ App context provider/inject pattern
- ✅ CSS variable system for theming
- ✅ PostGIS for geolocation support
- ⏳ Dynamic table creation (next)
- ⏳ CRUD operations on dynamic data
- ⏳ Views with filtering and sorting

## Database Schema

Current tables:
- `users` - User accounts (UUID, email, name, avatar)
- `companies` - Company/organization management
- `apps` - Applications with dynamic menus (JSONB)

Dynamic tables will be created at runtime with company-prefixed naming:
- Format: `dt_[companyId]_[tableId]`
- Example: `dt_abc123def456_8f3a4b2c1d9e4f5a`

## Documentation

- [Development Plan](docs/DEVELOPMENT_PLAN.md) - Detailed roadmap and architecture
- [Architecture](docs/ARCHITECTURE.md) - System design and decisions
- [Geolocation Guide](docs/GEOLOCATION_GUIDE.md) - PostGIS implementation guide
- [Session Summary](docs/SESSION_SUMMARY.md) - Latest development session notes

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
```

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
