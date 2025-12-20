import { eventHandler, createError, getRouterParam } from 'h3'
import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'
import { dropPhysicalTable } from '~~/server/utils/tableOperations'
import { messageResponse } from '~~/server/utils/response'

/**
 * Delete table and its physical PostgreSQL table (scoped to app)
 * App context provided by middleware
 */
export default eventHandler(async (event) => {
  const app = event.context.app
  const tableSlug = getRouterParam(event, 'tableSlug')

  if (!app) {
    throw createError({ statusCode: 500, message: 'App context not found. Middleware error.' })
  }

  if (!tableSlug) {
    throw createError({ statusCode: 400, message: 'Table slug is required' })
  }

  // Get existing table with proper scoping
  const existingTable = await db
    .select()
    .from(schema.dataTables)
    .where(and(
      eq(schema.dataTables.appId, app.id),
      eq(schema.dataTables.slug, tableSlug)
    ))
    .limit(1).then(rows => rows[0])

  if (!existingTable) {
    throw createError({ statusCode: 404, message: 'Table not found' })
  }

  // Drop the physical PostgreSQL table
  try {
    await dropPhysicalTable(existingTable.tableName)
  } catch (error) {
    console.error('Failed to drop physical table:', error)
    throw createError({ 
      statusCode: 500, 
      message: 'Failed to drop physical table' 
    })
  }

  // Delete metadata (columns will be cascade deleted)
  await db
    .delete(schema.dataTables)
    .where(eq(schema.dataTables.id, existingTable.id))
    .execute()

  return messageResponse(
    existingTable,
    `Table '${existingTable.name}' deleted successfully`
  )
})

