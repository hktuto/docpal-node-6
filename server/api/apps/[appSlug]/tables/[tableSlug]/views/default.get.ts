import { eventHandler, getRouterParam, createError } from 'h3'
import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'

/**
 * Get the default view for a table
 * Convenience endpoint to quickly fetch the default view
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

  // Get default view
  const view = await db
    .select()
    .from(schema.dataTableViews)
    .where(and(
      eq(schema.dataTableViews.dataTableId, table.id),
      eq(schema.dataTableViews.isDefault, true)
    ))
    .limit(1).then(rows => rows[0])

  if (!view) {
    throw createError({ statusCode: 404, message: 'Default view not found' })
  }

  // Get all columns for this table
  const allColumns = await db
    .select()
    .from(schema.dataTableColumns)
    .where(eq(schema.dataTableColumns.dataTableId, table.id))
    .orderBy(schema.dataTableColumns.order)

  // Create a column lookup map
  const columnMap = new Map(allColumns.map(col => [col.id, col]))

  // Get visible columns in the order specified by the view
  const visibleColumnIds = (view.visibleColumns as string[]) || []
  const visibleColumns = visibleColumnIds
    .map(id => columnMap.get(id))
    .filter(Boolean)

  // Enrich view with full column data
  const enrichedView = {
    ...view,
    columns: visibleColumns,
    allColumns: allColumns,
  }

  return successResponse(enrichedView)
})

