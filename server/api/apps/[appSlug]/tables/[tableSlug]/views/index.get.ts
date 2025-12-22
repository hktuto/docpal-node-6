import { eventHandler, getRouterParam, createError } from 'h3'
import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'

/**
 * Get all views for a table
 * Returns views with full column data (not just IDs)
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

  // Get table metadata
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

  // Get all views for this table
  const views = await db
    .select()
    .from(schema.dataTableViews)
    .where(eq(schema.dataTableViews.dataTableId, table.id))
    .orderBy(schema.dataTableViews.createdAt)

  // Get all columns for this table
  const allColumns = await db
    .select()
    .from(schema.dataTableColumns)
    .where(eq(schema.dataTableColumns.dataTableId, table.id))
    .orderBy(schema.dataTableColumns.order)

  // Create a column lookup map
  const columnMap = new Map(allColumns.map(col => [col.id, col]))

  // Enrich views with full column data
  const enrichedViews = views.map(view => {
    const visibleColumnIds = (view.visibleColumns as string[]) || []
    const visibleColumns = visibleColumnIds
      .map(id => columnMap.get(id))
      .filter(Boolean) // Remove any columns that no longer exist

    return {
      ...view,
      columns: visibleColumns, // Full column objects
    }
  })

  return successResponse(enrichedViews)
})

