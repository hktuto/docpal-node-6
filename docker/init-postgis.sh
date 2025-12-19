#!/bin/bash
set -e

# Install PostGIS on ARM64 Alpine PostgreSQL
echo "📦 Installing PostGIS for ARM64..."

# Install PostGIS packages (works on both ARM64 and x86)
apk add --no-cache \
    postgis \
    postgis-utils

# Enable PostGIS extensions
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE EXTENSION IF NOT EXISTS postgis_topology;
EOSQL

echo "✅ PostGIS installed successfully"

