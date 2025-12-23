import { db } from 'hub:db'
import { sql } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'

/**
 * Database Reset Endpoint - DEVELOPMENT ONLY
 * 
 * ⚠️ WARNING: This will drop all tables and recreate them!
 * Only available in development mode.
 * 
 * Usage: POST /api/db-reset
 */
export default defineEventHandler(async (event) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    throw createError({
      statusCode: 403,
      message: 'Database reset is not allowed in production',
    })
  }

  try {
    console.log('🗑️  Starting database reset...')

    // Drop all tables in reverse order (respect foreign keys)
    // Also drop _hub_migrations to reset migration tracking
    const tables = [
      'audit_logs',
      'company_invites',
      'company_members',
      'magic_links',
      'sessions',
      'data_table_views',
      'data_table_columns',
      'data_tables',
      "apps",
      'workspaces',
      'companies',
      'users',
      '_hub_migrations', // Drop migration tracking to allow fresh migrations
    ]

    for (const table of tables) {
      console.log(`  Dropping table: ${table}`)
      await db.execute(sql.raw(`DROP TABLE IF EXISTS "${table}" CASCADE`))
    }

    console.log('✅ All tables dropped')
    console.log('ℹ️  Run migrations to recreate tables: pnpm db:migrate')

    return successResponse({
      droppedTables: tables,
      message: 'Database reset successful. Run migrations to recreate tables.',
    })
  } catch (error: any) {
    console.error('Database reset error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to reset database',
      message: error.message,
    })
  }
})

