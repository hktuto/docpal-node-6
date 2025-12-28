/**
 * Electric Migrations Plugin
 * 
 * Checks for database migrations on app load and runs them if needed.
 * This ensures the client's PGlite schema stays in sync with PostgreSQL.
 */

export default defineNuxtPlugin(async () => {
  const { checkAndMigrate } = useElectricMigrations()

  try {
    console.log('[Electric] Checking for migrations...')
    
    const didMigrate = await checkAndMigrate()

    if (didMigrate) {
      console.log('[Electric] Migration completed successfully')
      
      // Optional: Show a toast notification
      // useNotification().success('Database updated to latest version')
    } else {
      console.log('[Electric] No migration needed, schema up to date')
    }

  } catch (error) {
    console.error('[Electric] Migration check failed:', error)
    
    // Don't block app load - user can still use the app
    // Falls back to API calls if Electric sync fails
  }
})

