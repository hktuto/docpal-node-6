# Environment Setup Instructions

Since `.env` files are ignored by git, you need to create them manually.

## Create .env file

Create a `.env` file in the project root with the following content:

```bash
# Copy this content to .env file

# Electric SQL Sync Service (Server-side only)
# URL for the Electric sync service (used by proxy endpoint)
# NOT exposed to client - only used by server
# Default: http://localhost:30000
ELECTRIC_URL=http://localhost:30000

# Database (NuxtHub will use this automatically)
# DATABASE_URL=postgresql://docpal:docpal_dev@localhost:5432/docpal

# OpenAI API Key (for AI features)
# OPENAI_API_KEY=sk-...

# Session Secret (for authentication)
# SESSION_SECRET=your-secret-key-here

# MinIO / S3 Configuration (for file storage)
# MINIO_ENDPOINT=http://localhost:9000
# MINIO_ACCESS_KEY=minioadmin
# MINIO_SECRET_KEY=minioadmin
```

## Quick Setup

```bash
# Copy this command to create .env file
cat > .env << 'EOF'
ELECTRIC_URL=http://localhost:30000
EOF
```

## Verify

After creating the `.env` file, you can verify it's being read:

```bash
# Start dev server
pnpm dev

# The Electric URL from .env will be used automatically
# Check the POC page debug panel to confirm
```

## Production

For production, set these as environment variables in your hosting platform:
- Vercel: Add to Environment Variables in project settings
- Docker: Add to docker-compose.yml or .env file
- AWS/GCP: Add to container environment or secrets manager

