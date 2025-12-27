import { db } from 'hub:db'
import { dataTableViews, dataTables } from 'hub:db:schema'
import { eq, and } from 'drizzle-orm'
import { requireCompany } from '~~/server/utils/auth/getCurrentUser'
import { successResponse } from '~~/server/utils/response'

/**
 * Delete a view
 * Only creator or company admin can delete
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

    // Check permissions
    const isCreator = view.createdBy === user.id
    const isAdmin = user.company.role === 'admin'

    if (!isCreator && !isAdmin) {
      throw createError({
        statusCode: 403,
        message: 'You do not have permission to delete this view'
      })
    }

    // Cannot delete default view
    if (view.isDefault) {
      throw createError({
        statusCode: 400,
        message: 'Cannot delete the default view. Set another view as default first.'
      })
    }

    // Delete view (cascade will delete permissions and preferences)
    await db
      .delete(dataTableViews)
      .where(eq(dataTableViews.id, viewId))

    return successResponse({
      message: 'View deleted successfully'
    })
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error deleting view:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete view'
    })
  }
})

