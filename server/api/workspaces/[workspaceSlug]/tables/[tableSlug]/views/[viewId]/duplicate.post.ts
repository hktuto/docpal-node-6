import { db } from 'hub:db'
import { dataTableViews, dataTables } from 'hub:db:schema'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { requireCompany } from '~~/server/utils/auth/getCurrentUser'
import { successResponse } from '~~/server/utils/response'
import { generateUUID } from '~~/server/utils/uuid'

/**
 * Duplicate an existing view
 */
export default defineEventHandler(async (event) => {
  const user = requireCompany(event)
  const workspace = event.context.workspace
  const tableSlug = getRouterParam(event, 'tableSlug')
  const viewId = getRouterParam(event, 'viewId')

  if (!workspace) {
    throw createError({ statusCode: 500, message: 'Workspace context not found' })
  }

  if (!tableSlug || !viewId) {
    throw createError({ statusCode: 400, message: 'Table slug and view ID are required' })
  }

  const body = await readBody(event)
  const { name } = body

  try {
    // Get table
    const [table] = await db
      .select()
      .from(dataTables)
      .where(and(
        eq(dataTables.workspaceId, workspace.id),
        eq(dataTables.slug, tableSlug)
      ))
      .limit(1)

    if (!table) {
      throw createError({ statusCode: 404, message: 'Table not found' })
    }

    // Get source view
    const [sourceView] = await db
      .select()
      .from(dataTableViews)
      .where(and(
        eq(dataTableViews.id, viewId),
        eq(dataTableViews.dataTableId, table.id)
      ))
      .limit(1)

    if (!sourceView) {
      throw createError({ statusCode: 404, message: 'View not found' })
    }

    // Create duplicate
    const duplicateName = name || `${sourceView.name} (Copy)`
    const slug = `${duplicateName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${nanoid(6)}`

    const [duplicateView] = await db
      .insert(dataTableViews)
      .values({
        id: generateUUID(),
        dataTableId: table.id,
        name: duplicateName,
        slug,
        description: sourceView.description,
        viewType: sourceView.viewType,
        isDefault: false, // Duplicate is never default
        isShared: false, // Duplicate starts as personal
        isPublic: false,
        filters: sourceView.filters,
        sort: sourceView.sort,
        visibleColumns: sourceView.visibleColumns,
        columnWidths: sourceView.columnWidths,
        viewConfig: sourceView.viewConfig,
        pageSize: sourceView.pageSize,
        createdBy: user.id
      })
      .returning()

    return successResponse(duplicateView)
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error duplicating view:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to duplicate view'
    })
  }
})

