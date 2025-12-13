# Quick Start Guide
Date: 2025-12-12

## Prerequisites

- **Node.js**: v20+ (LTS recommended)
- **pnpm**: v8+ (`npm install -g pnpm`)
- **Docker**: v24+ and Docker Compose v2+
- **Git**: Latest version

## Initial Setup

### 1. Clone and Install Dependencies

```bash
# Navigate to project directory
cd /Users/seantsang/Documents/work/docpal-node-6

# Install dependencies
pnpm install
```

### 2. Start Docker Services

```bash
# Start PostgreSQL and MinIO
docker-compose -f docker-compose.dev.yml up -d

# Verify services are running
docker-compose -f docker-compose.dev.yml ps
```

Expected output:
- PostgreSQL running on `localhost:5432`
- MinIO running on `localhost:9000` (API) and `localhost:9001` (Console)

### 3. Configure Environment Variables

Create `.env` file in project root:

```bash
# Database
DATABASE_URL=postgresql://docpal:docpal_dev@localhost:5432/docpal

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=docpal-files
MINIO_USE_SSL=false

# App
NODE_ENV=development
```

### 4. Run Database Migrations

```bash
# This will be available after we set up the ORM
pnpm db:migrate

# Or seed initial data
pnpm db:seed
```

### 5. Start Development Server

```bash
# Start Nuxt dev server
pnpm dev

# Or from root
pnpm -F @docpal/admin dev
```

The app should be available at `http://localhost:3000`

## Development Workflow

### Daily Development

```bash
# 1. Start Docker services (if not running)
docker-compose -f docker-compose.dev.yml up -d

# 2. Start dev server
pnpm dev

# 3. Make changes and see hot reload
```

### Database Management

```bash
# Connect to PostgreSQL
docker exec -it docpal-node-6-postgres-1 psql -U docpal -d docpal

# View logs
docker-compose -f docker-compose.dev.yml logs postgres

# Reset database (WARNING: deletes all data)
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

### MinIO Management

- **Console**: http://localhost:9001
- **Login**: `minioadmin` / `minioadmin`
- **API**: http://localhost:9000

### Stopping Services

```bash
# Stop Docker services
docker-compose -f docker-compose.dev.yml down

# Stop Docker services and remove volumes (clean reset)
docker-compose -f docker-compose.dev.yml down -v
```

## Project Structure

```
docpal-node-6/
├── packages/
│   └── admin/              # Nuxt 4 admin app
│       ├── app/            # Nuxt app directory
│       ├── server/         # Server routes & API
│       ├── components/     # Vue components
│       └── composables/    # Vue composables
├── docs/                   # Documentation
├── docker-compose.dev.yml  # Docker services config
└── package.json           # Root package.json
```

## Common Tasks

### Add a New Dependency

```bash
# Add to admin package
cd packages/admin
pnpm add <package-name>

# Or from root
pnpm -F @docpal/admin add <package-name>
```

### Run Database Migrations

```bash
# Generate migration (after schema changes)
pnpm db:migrate:generate

# Run migrations
pnpm db:migrate

# Rollback last migration
pnpm db:migrate:rollback
```

### Type Checking

```bash
# Check TypeScript types
pnpm type-check

# Or in admin package
cd packages/admin
pnpm type-check
```

### Build for Production

```bash
# Build admin app
pnpm build

# Preview production build
pnpm preview
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3000  # Nuxt
lsof -i :5432  # PostgreSQL
lsof -i :9000  # MinIO

# Kill process or change port in config
```

### Docker Services Won't Start

```bash
# Check Docker is running
docker ps

# View logs
docker-compose -f docker-compose.dev.yml logs

# Reset Docker services
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

### Database Connection Issues

```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check connection string in .env
# Test connection
docker exec -it docpal-node-6-postgres-1 psql -U docpal -d docpal
```

### Module Not Found Errors

```bash
# Reinstall dependencies
rm -rf node_modules packages/*/node_modules
pnpm install
```

## Next Steps

1. ✅ Complete setup (this guide)
2. ⏭️ Set up database schema (Phase 1.2)
3. ⏭️ Create API endpoints (Phase 1.3-1.6)
4. ⏭️ Build UI (Phase 2)

## Useful Commands Reference

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Build for production
pnpm preview                # Preview production build

# Docker
docker-compose -f docker-compose.dev.yml up -d    # Start services
docker-compose -f docker-compose.dev.yml down     # Stop services
docker-compose -f docker-compose.dev.yml logs     # View logs
docker-compose -f docker-compose.dev.yml ps       # Check status

# Database (after ORM setup)
pnpm db:migrate             # Run migrations
pnpm db:seed                # Seed data
pnpm db:studio              # Open DB GUI (if available)
```

## Getting Help

- Check `docs/Development-Plan-POC.md` for detailed development phases
- Review `docs/BRD-Review.md` for requirements clarifications
- See `docs/Technical-Decisions.md` for architecture decisions

