import { eventHandler, getRouterParam, createError, getQuery } from 'h3'
import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'

/**
 * Get a specific view by ID or slug
 * Returns view with full column data and optionally filtered/sorted data
 */
export default eventHandler(async (event) => {
  const workspace = event.context.workspace
  const tableSlug = getRouterParam(event, 'tableSlug')
  const viewIdOrSlug = getRouterParam(event, 'viewId')

  if (!workspace) {
    throw createError({ statusCode: 500, message: 'Workspace context not found. Middleware error.' })
  }

  if (!tableSlug || !viewIdOrSlug) {
    throw createError({ statusCode: 400, message: 'Table slug and view ID are required' })
  }

  // Get table metadata
  const table = await db
    .select()
    .from(schema.dataTables)
    .where(and(
      eq(schema.dataTables.workspaceId, workspace.id),
      eq(schema.dataTables.slug, tableSlug)
    ))
    .limit(1).then(rows => rows[0])

  if (!table) {
    throw createError({ statusCode: 404, message: 'Table not found' })
  }

  // Get view by ID or slug
  const view = await db
    .select()
    .from(schema.dataTableViews)
    .where(and(
      eq(schema.dataTableViews.dataTableId, table.id),
      viewIdOrSlug.includes('-') 
        ? eq(schema.dataTableViews.slug, viewIdOrSlug)
        : eq(schema.dataTableViews.id, viewIdOrSlug)
    ))
    .limit(1).then(rows => rows[0])

  if (!view) {
    throw createError({ statusCode: 404, message: 'View not found' })
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
    .filter(Boolean) // Remove any columns that no longer exist

  // Enrich view with full column data
  const enrichedView = {
    ...view,
    columns: visibleColumns, // Full column objects in correct order
    allColumns: allColumns, // All table columns (for reference)
  }

  return successResponse(enrichedView)
})

