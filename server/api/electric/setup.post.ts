/**
 * Electric Setup Endpoint
 * 
 * Creates the Electric publication for tables that need to be synced.
 * Run this after migrations to set up Electric sync.
 * 
 * POST /api/electric/setup
 */

import { db } from 'hub:db'
import { sql } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  console.log('[Electric Setup] Starting...')

  try {
    // 1. Drop existing publication if it exists
    await db.execute(sql`DROP PUBLICATION IF EXISTS electric_publication`)
    console.log('[Electric Setup] Dropped existing publication')

    // 2. Create publication for workspaces table
    // Note: Add more tables here as needed
    await db.execute(sql`CREATE PUBLICATION electric_publication FOR TABLE workspaces`)
    console.log('[Electric Setup] Created publication for workspaces')

    // 3. Grant replication permission (if not already set)
    try {
      await db.execute(sql`ALTER USER docpal WITH REPLICATION`)
      console.log('[Electric Setup] Granted replication permission')
    } catch (error) {
      // Might already have permission or insufficient privileges
      console.log('[Electric Setup] Replication permission already set or unable to grant')
    }

    // 4. Verify publication was created
    const result = await db.execute(sql`
      SELECT pubname, pubtable 
      FROM pg_publication_tables 
      WHERE pubname = 'electric_publication'
    `)

    console.log('[Electric Setup] ✅ Complete! Tables in publication:', result.rows)

    return successResponse({
      message: 'Electric publication created successfully',
      tables: result.rows,
    })

  } catch (error) {
    console.error('[Electric Setup] ❌ Error:', error)
    throw createError({
      statusCode: 500,
      message: `Failed to setup Electric: ${(error as Error).message}`
    })
  }
})

