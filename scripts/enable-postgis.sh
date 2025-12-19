#!/bin/bash

# Enable PostGIS extensions in existing database
echo "🗺️  Enabling PostGIS extensions..."

# Suppress output unless there's an error
docker exec docpal-postgres psql -U docpal -d docpal -c "CREATE EXTENSION IF NOT EXISTS postgis;" > /dev/null 2>&1
docker exec docpal-postgres psql -U docpal -d docpal -c "CREATE EXTENSION IF NOT EXISTS postgis_topology;" > /dev/null 2>&1

# Verify installation (quiet mode)
VERSION=$(docker exec docpal-postgres psql -U docpal -d docpal -t -c "SELECT PostGIS_Version();" 2>/dev/null | xargs)

if [ -n "$VERSION" ]; then
    echo "✅ PostGIS $VERSION enabled"
else
    echo "❌ PostGIS installation failed"
    exit 1
fi

