import { eventHandler, getRouterParam, createError, getQuery } from 'h3'
import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'
import { validateViewAccess } from '~~/server/utils/viewAccess'

/**
 * Get a specific view by slug
 * Returns view with full column data
 * 
 * ✅ Supports public views (no auth required)
 * ✅ Supports shared views (workspace members)
 * ✅ Supports private views (creator only)
 */
export default eventHandler(async (event) => {
  const workspace = event.context.workspace
  const tableSlug = getRouterParam(event, 'tableSlug')
  const viewSlug = getRouterParam(event, 'viewSlug')

  if (!workspace) {
    throw createError({ statusCode: 500, message: 'Workspace context not found. Middleware error.' })
  }

  if (!tableSlug || !viewSlug) {
    throw createError({ statusCode: 400, message: 'Table slug and view slug are required' })
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

  // Get view by slug
  const viewData = await db
    .select()
    .from(schema.dataTableViews)
    .where(and(
      eq(schema.dataTableViews.dataTableId, table.id),
      eq(schema.dataTableViews.slug, viewSlug)
    ))
    .limit(1).then(rows => rows[0])

  if (!viewData) {
    throw createError({ statusCode: 404, message: 'View not found' })
  }

  // Validate access (supports public views!)
  const accessResult = await validateViewAccess(event, viewData.id, {
    requireEdit: false,
    allowPublic: true
  })
  
  const view = accessResult.view

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
    accessType: accessResult.accessType // Include access type
  }

  return successResponse(enrichedView)
})

