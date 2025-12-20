import { eventHandler, createError, getRouterParam } from 'h3'
import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'

/**
 * Get table metadata by slug (scoped to app)
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

  // Get table with proper scoping (appId + slug)
  const table = await db
    .select()
    .from(schema.dataTables)
    .where(and(
      eq(schema.dataTables.appId, app.id),
      eq(schema.dataTables.slug, tableSlug)
    ))
    .limit(1).then(rows => rows[0])

  if (!table) {
    throw createError({ statusCode: 404, message: 'Table not found' })
  }

  // Get columns
  const columns = await db
    .select()
    .from(schema.dataTableColumns)
    .where(eq(schema.dataTableColumns.dataTableId, table.id))
    .orderBy(schema.dataTableColumns.order)
    
  return successResponse({
    ...table,
    columns,
  })
})

