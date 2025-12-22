import { eventHandler, readBody, createError, getRouterParam } from 'h3'
import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'

/**
 * Reorder columns in a specific view
 * Receives ordered array of column IDs and updates the view's visibleColumns
 */
export default eventHandler(async (event) => {
  const app = event.context.app
  const tableSlug = getRouterParam(event, 'tableSlug')
  const body = await readBody<{ 
    viewId: string
    columnIds: string[] 
  }>(event)

  if (!app) {
    throw createError({ statusCode: 500, message: 'App context not found. Middleware error.' })
  }

  if (!tableSlug) {
    throw createError({ statusCode: 400, message: 'Table slug is required' })
  }

  if (!body.viewId) {
    throw createError({ statusCode: 400, message: 'viewId is required' })
  }

  if (!body.columnIds || !Array.isArray(body.columnIds) || body.columnIds.length === 0) {
    throw createError({ statusCode: 400, message: 'columnIds array is required' })
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

  // Get the view
  const view = await db
    .select()
    .from(schema.dataTableViews)
    .where(and(
      eq(schema.dataTableViews.id, body.viewId),
      eq(schema.dataTableViews.dataTableId, table.id)
    ))
    .limit(1)
    .then(rows => rows[0])

  if (!view) {
    throw createError({ statusCode: 404, message: 'View not found' })
  }

  try {
    // Update view's visibleColumns with the new order
    await db
      .update(schema.dataTableViews)
      .set({ 
        visibleColumns: body.columnIds,
        updatedAt: new Date()
      })
      .where(eq(schema.dataTableViews.id, body.viewId))

    console.log(`✅ Reordered ${body.columnIds.length} columns in view: ${view.name}`)

    return successResponse({ 
      message: 'Column order updated successfully',
      columnCount: body.columnIds.length 
    })
  } catch (error) {
    console.error('❌ Failed to reorder columns:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to reorder columns'
    })
  }
})

