#!/bin/bash

# ElectricSQL Setup Script
# This script configures PostgreSQL for Electric sync

set -e

echo "🔌 Setting up ElectricSQL..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if PostgreSQL is running
echo "Checking PostgreSQL..."
if ! docker ps | grep -q docpal-postgres; then
    echo -e "${RED}❌ PostgreSQL is not running!${NC}"
    echo "Please start it with: pnpm docker:up"
    exit 1
fi
echo -e "${GREEN}✓${NC} PostgreSQL is running"

# Check if Electric is running
echo "Checking Electric service..."
if ! docker ps | grep -q docpal-electric; then
    echo -e "${YELLOW}⚠️  Electric service is not running!${NC}"
    echo "Please start it with: pnpm docker:up"
    exit 1
fi
echo -e "${GREEN}✓${NC} Electric service is running"

# Configure PostgreSQL for logical replication
echo ""
echo "Configuring PostgreSQL for logical replication..."
docker exec -i docpal-postgres psql -U docpal -d docpal << 'EOF'
-- Enable logical replication settings
ALTER SYSTEM SET wal_level = logical;
ALTER SYSTEM SET max_replication_slots = 10;
ALTER SYSTEM SET max_wal_senders = 10;

-- Reload configuration
SELECT pg_reload_conf();

-- Check settings
SELECT name, setting FROM pg_settings WHERE name IN ('wal_level', 'max_replication_slots', 'max_wal_senders');
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} PostgreSQL configured for logical replication"
else
    echo -e "${RED}❌ Failed to configure PostgreSQL${NC}"
    exit 1
fi

# Create publication for workspaces table
echo ""
echo "Creating Electric publication..."
docker exec -i docpal-postgres psql -U docpal -d docpal << 'EOF'
-- Drop existing publication if it exists
DROP PUBLICATION IF EXISTS electric_publication;

-- Create publication for workspaces
CREATE PUBLICATION electric_publication FOR TABLE workspaces;

-- Grant replication permission
ALTER USER docpal WITH REPLICATION;

-- Verify publication
SELECT * FROM pg_publication WHERE pubname = 'electric_publication';
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Publication created successfully"
else
    echo -e "${RED}❌ Failed to create publication${NC}"
    exit 1
fi

# Restart PostgreSQL to apply settings
echo ""
echo "Restarting PostgreSQL to apply settings..."
docker restart docpal-postgres

echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Wait for PostgreSQL to be healthy
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec docpal-postgres pg_isready -U docpal > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} PostgreSQL is ready"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ PostgreSQL failed to start${NC}"
    exit 1
fi

# Verify Electric can connect
echo ""
echo "Verifying Electric connection..."
sleep 3

# Check Electric logs for any errors
echo ""
echo "Recent Electric logs:"
docker logs docpal-electric --tail 20

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Start your Nuxt dev server: ${YELLOW}pnpm dev${NC}"
echo "  2. Open: ${YELLOW}http://localhost:3001/electric-poc${NC}"
echo "  3. Click 'Start Sync' to begin syncing"
echo "  4. Open the page in another tab to see live updates!"
echo ""
echo "Troubleshooting:"
echo "  - Check Electric logs: ${YELLOW}docker logs docpal-electric --follow${NC}"
echo "  - Check PostgreSQL logs: ${YELLOW}docker logs docpal-postgres --follow${NC}"
echo "  - Verify publication: ${YELLOW}docker exec -it docpal-postgres psql -U docpal -d docpal -c '\\dRp+'${NC}"
echo ""

