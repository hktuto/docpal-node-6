#!/bin/bash
# PostgreSQL initialization script for ElectricSQL
# This runs automatically when PostgreSQL container starts for the first time

set -e

echo "🔌 Initializing PostgreSQL for ElectricSQL..."

# Wait for PostgreSQL to be fully ready
until pg_isready -U "$POSTGRES_USER"; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 1
done

echo "✓ PostgreSQL is ready"

# Enable logical replication
echo "Configuring logical replication..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Enable logical replication settings
    ALTER SYSTEM SET wal_level = logical;
    ALTER SYSTEM SET max_replication_slots = 10;
    ALTER SYSTEM SET max_wal_senders = 10;
    
    -- Reload configuration
    SELECT pg_reload_conf();
    
    -- Grant replication permission to user
    ALTER USER $POSTGRES_USER WITH REPLICATION;
EOSQL

echo "✓ Logical replication configured"

# Note: Publications need to be created after tables exist
# So we'll create a function to call later
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create a function to set up Electric publication
    CREATE OR REPLACE FUNCTION setup_electric_publication() 
    RETURNS void AS \$\$
    BEGIN
        -- Drop existing publication if it exists
        DROP PUBLICATION IF EXISTS electric_publication;
        
        -- Create publication for workspaces table
        -- Add more tables as needed
        CREATE PUBLICATION electric_publication FOR TABLE workspaces;
        
        RAISE NOTICE 'Electric publication created successfully';
    END;
    \$\$ LANGUAGE plpgsql;
EOSQL

echo "✓ Electric setup function created"
echo "✅ PostgreSQL initialized for ElectricSQL!"
echo ""
echo "Note: Run setup_electric_publication() after tables are created"

