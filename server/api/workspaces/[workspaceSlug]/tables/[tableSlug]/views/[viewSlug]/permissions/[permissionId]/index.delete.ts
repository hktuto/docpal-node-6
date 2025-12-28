import { db } from 'hub:db'
import { viewPermissions, dataTableViews, dataTables } from 'hub:db:schema'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth/getCurrentUser'
import { successResponse } from '~~/server/utils/response'

/**
 * Remove permission from a view
 * Only view creator can remove permissions
 */
export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const workspace = event.context.workspace
  const tableSlug = getRouterParam(event, 'tableSlug')
  const viewId = getRouterParam(event, 'viewId')
  const permissionId = getRouterParam(event, 'permissionId')

  if (!workspace) {
    throw createError({ statusCode: 500, message: 'Workspace context not found' })
  }

  if (!tableSlug || !viewId || !permissionId) {
    throw createError({ statusCode: 400, message: 'Table slug, view ID, and permission ID are required' })
  }

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

    // Get view
    const [view] = await db
      .select()
      .from(dataTableViews)
      .where(and(
        eq(dataTableViews.id, viewId),
        eq(dataTableViews.dataTableId, table.id)
      ))
      .limit(1)

    if (!view) {
      throw createError({ statusCode: 404, message: 'View not found' })
    }

    // Check if user is creator
    if (view.createdBy !== user.id) {
      throw createError({
        statusCode: 403,
        message: 'Only the view creator can remove permissions'
      })
    }

    // Delete permission
    await db
      .delete(viewPermissions)
      .where(and(
        eq(viewPermissions.id, permissionId),
        eq(viewPermissions.viewId, viewId)
      ))

    return successResponse({
      message: 'Permission removed successfully'
    })
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error removing view permission:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to remove view permission'
    })
  }
})

