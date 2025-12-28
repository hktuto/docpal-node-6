import { eventHandler, readBody, createError, getRouterParam } from 'h3'
import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'

/**
 * Update a data table view
 */
export default eventHandler(async (event) => {
  const workspace = event.context.workspace
  const tableSlug = getRouterParam(event, 'tableSlug')
  const viewSlug = getRouterParam(event, 'viewSlug')
  const body = await readBody<{
    name?: string
    slug?: string
    viewType?: string
    description?: string
    isDefault?: boolean
    isPublic?: boolean
    pageSize?: number
    visibleColumns?: string[]
    columnWidths?: Record<string, number>
    filters?: any
    sort?: any
    viewConfig?: any
  }>(event)

  if (!workspace) {
    throw createError({ statusCode: 500, message: 'Workspace context not found. Middleware error.' })
  }

  if (!tableSlug) {
    throw createError({ statusCode: 400, message: 'Table slug is required' })
  }

  if (!viewSlug) {
    throw createError({ statusCode: 400, message: 'View slug is required' })
  }

  // Get table metadata
  const table = await db
    .select()
    .from(schema.dataTables)
    .where(and(
      eq(schema.dataTables.workspaceId, workspace.id),
      eq(schema.dataTables.slug, tableSlug)
    ))
    .limit(1)
    .then(rows => rows[0])

  if (!table) {
    throw createError({ statusCode: 404, message: 'Table not found' })
  }

  // Get existing view by slug
  const existingView = await db
    .select()
    .from(schema.dataTableViews)
    .where(and(
      eq(schema.dataTableViews.dataTableId, table.id),
      eq(schema.dataTableViews.slug, viewSlug)
    ))
    .limit(1)
    .then(rows => rows[0])

  if (!existingView) {
    throw createError({ statusCode: 404, message: 'View not found' })
  }

  try {
    const updates: any = {
      updatedAt: new Date()
    }

    // Update fields if provided
    if (body.name !== undefined) updates.name = body.name
    if (body.slug !== undefined) updates.slug = body.slug
    if (body.viewType !== undefined) updates.viewType = body.viewType
    if (body.description !== undefined) updates.description = body.description
    if (body.isDefault !== undefined) updates.isDefault = body.isDefault
    if (body.isPublic !== undefined) updates.isPublic = body.isPublic
    if (body.pageSize !== undefined) updates.pageSize = body.pageSize
    if (body.columnWidths !== undefined) updates.columnWidths = body.columnWidths
    if (body.filters !== undefined) updates.filters = body.filters
    if (body.sort !== undefined) updates.sort = body.sort
    if (body.viewConfig !== undefined) updates.viewConfig = body.viewConfig
    if (body.visibleColumns !== undefined) updates.visibleColumns = body.visibleColumns
    // Update view
    const [updatedView] = await db
      .update(schema.dataTableViews)
      .set(updates)
      .where(eq(schema.dataTableViews.id, existingView.id))
      .returning()

    console.log(`✅ Updated view "${existingView.name}" for table: ${table.name}`)

    // Fetch all columns for enrichment
    const allColumns = await db
      .select()
      .from(schema.dataTableColumns)
      .where(eq(schema.dataTableColumns.dataTableId, table.id))
      .orderBy(schema.dataTableColumns.order)

    // Enrich visibleColumns with full column data
    const columnMap = new Map(allColumns.map(col => [col.id, col]))
    const visibleColumnIds = (updatedView.visibleColumns as string[]) || []
    const enrichedColumns = visibleColumnIds
      .map(id => columnMap.get(id))
      .filter(Boolean)

    return successResponse({
      ...updatedView,
      columns: enrichedColumns
    })
  } catch (error: any) {
    console.error('❌ Failed to update view:', error)

    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to update view'
    })
  }
})

