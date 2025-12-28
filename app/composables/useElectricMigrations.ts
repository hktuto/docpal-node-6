/**
 * useElectricMigrations Composable
 * 
 * Manages client-side database migrations by tracking Drizzle migration versions.
 * When a new migration is detected, drops and recreates all tables with fresh schemas.
 * 
 * This ensures PGlite schemas stay in sync with PostgreSQL after migrations.
 */

import { getElectricSchemas } from '~/config/electric-schemas'

const STORAGE_KEY = 'electric_migration_version'
const MIGRATING_EVENT = 'electric:migration:start'
const COMPLETE_EVENT = 'electric:migration:complete'

export const useElectricMigrations = () => {
  const isMigrating = ref(false)

  /**
   * Check if migration is needed and run it
   */
  const checkAndMigrate = async (): Promise<boolean> => {
    try {
      // 1. Get local version
      const localVersion = localStorage.getItem(STORAGE_KEY)
      
      // 2. Get server version
      const response = await $fetch('/api/electric/version')
      const serverVersion = response.data.version
      
      if (!serverVersion || serverVersion === 'unknown') {
        console.warn('[Electric Migration] Could not determine server version')
        return false
      }

      console.log('[Electric Migration] Version check:', {
        local: localVersion || 'none',
        server: serverVersion,
      })

      // 3. Check if migration needed
      if (localVersion && localVersion !== serverVersion) {
        console.log('[Electric Migration] Migration required:', {
          from: localVersion,
          to: serverVersion,
        })
        
        // 4. Run migration
        await runMigration(serverVersion)
        
        return true // Migrated
      }

      // First run - store version
      if (!localVersion) {
        localStorage.setItem(STORAGE_KEY, serverVersion)
        console.log('[Electric Migration] Initialized version:', serverVersion)
      }

      return false // No migration needed
    } catch (error) {
      console.error('[Electric Migration] Check failed:', error)
      return false
    }
  }

  /**
   * Run migration process
   */
  const runMigration = async (newVersion: string) => {
    isMigrating.value = true
    window.dispatchEvent(new CustomEvent(MIGRATING_EVENT))

    try {
      console.log('[Electric Migration] Starting migration to:', newVersion)

      // 1. Get database instance
      const { getDB } = useSecureElectricSync()
      const db = await getDB()

      // 2. List of tables to recreate
      const tables = [
        'users',
        'companies',
        'workspaces',
        'data_tables',
        'data_table_columns',
      ]

      // 3. Drop all tables
      console.log('[Electric Migration] Dropping tables...')
      for (const table of tables) {
        try {
          await db.exec(`DROP TABLE IF EXISTS "${table}" CASCADE`)
          console.log(`[Electric Migration] Dropped: ${table}`)
        } catch (err) {
          console.warn(`[Electric Migration] Failed to drop ${table}:`, err)
        }
      }

      // 4. Clear cached schemas (force refetch)
      // Reset the cache in electric-schemas.ts
      const schemasModule = await import('~/config/electric-schemas')
      if (schemasModule.clearSchemasCache) {
        schemasModule.clearSchemasCache()
      }

      // 5. Fetch fresh schemas
      console.log('[Electric Migration] Fetching fresh schemas...')
      const schemas = await getElectricSchemas()

      // 6. Recreate tables
      console.log('[Electric Migration] Recreating tables...')
      for (const [table, schema] of Object.entries(schemas)) {
        try {
          await db.exec(schema)
          console.log(`[Electric Migration] Created: ${table}`)
        } catch (err) {
          console.error(`[Electric Migration] Failed to create ${table}:`, err)
          throw err
        }
      }

      // 7. Update stored version
      localStorage.setItem(STORAGE_KEY, newVersion)
      console.log('[Electric Migration] ✅ Migration complete!')

      // Note: Data will be resynced automatically when composables reinitialize

    } catch (error) {
      console.error('[Electric Migration] Migration failed:', error)
      throw error
    } finally {
      isMigrating.value = false
      window.dispatchEvent(new CustomEvent(COMPLETE_EVENT))
    }
  }

  /**
   * Force a migration (for testing/debugging)
   */
  const forceMigration = async () => {
    const response = await $fetch('/api/electric/version')
    const serverVersion = response.data.version
    
    if (serverVersion && serverVersion !== 'unknown') {
      await runMigration(serverVersion)
    }
  }

  /**
   * Reset migration state (clear version)
   */
  const resetMigrationState = () => {
    localStorage.removeItem(STORAGE_KEY)
    console.log('[Electric Migration] Reset migration state')
  }

  /**
   * Get current local version
   */
  const getCurrentVersion = () => {
    return localStorage.getItem(STORAGE_KEY)
  }

  return {
    isMigrating: readonly(isMigrating),
    checkAndMigrate,
    runMigration,
    forceMigration,
    resetMigrationState,
    getCurrentVersion,
  }
}

