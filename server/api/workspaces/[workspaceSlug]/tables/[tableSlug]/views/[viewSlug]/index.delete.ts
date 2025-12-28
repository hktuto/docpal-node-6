import { db } from 'hub:db'
import { dataTableViews, dataTables, workspaces } from 'hub:db:schema'
import { eq, and } from 'drizzle-orm'
import { requireCompany } from '~~/server/utils/auth/getCurrentUser'
import { successResponse } from '~~/server/utils/response'

/**
 * Delete a view
 * Only creator or company admin can delete
 * Also removes view from workspace menu if present
 */
export default defineEventHandler(async (event) => {
  const user = requireCompany(event)
  const workspace = event.context.workspace
  const tableSlug = getRouterParam(event, 'tableSlug')
  const viewSlug = getRouterParam(event, 'viewSlug')

  if (!workspace) {
    throw createError({ statusCode: 500, message: 'Workspace context not found' })
  }

  if (!tableSlug || !viewSlug) {
    throw createError({ statusCode: 400, message: 'Table slug and view slug are required' })
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

    // Get view by slug
    const [view] = await db
      .select()
      .from(dataTableViews)
      .where(and(
        eq(dataTableViews.slug, viewSlug),
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

    // Remove view from workspace menu if present
    const currentMenu = workspace.menu as any[] || []

    
    const updatedMenu = removeViewFromMenu(JSON.parse(JSON.stringify(currentMenu)), view.id)
    
    // Update workspace menu if changed
    if (JSON.stringify(updatedMenu) !== JSON.stringify(currentMenu)) {
      console.log('updating menu', updatedMenu)
      await db
        .update(workspaces)
        .set({ menu: updatedMenu })
        .where(eq(workspaces.id, workspace.id))
    }

    // Delete view (cascade will delete permissions and preferences)
    await db
      .delete(dataTableViews)
      .where(eq(dataTableViews.id, view.id))

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

function removeViewFromMenu(view: any[], removeTargetId: string): any[] {

  return view.reduce((acc: any[], item: any) => {
    if (item.type === 'view' && item.viewId === removeTargetId) {
      console.log('found view to remove', item)
      return acc
    }
    if (item.children) {
      item.children = removeViewFromMenu(item.children, removeTargetId)
    }
    acc.push(item)
    return acc
  }, [])
}

