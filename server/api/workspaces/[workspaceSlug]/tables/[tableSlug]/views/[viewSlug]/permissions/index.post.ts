import { db } from 'hub:db'
import { viewPermissions, dataTableViews, dataTables } from 'hub:db:schema'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth/getCurrentUser'
import { successResponse } from '~~/server/utils/response'
import { generateUUID } from '~~/server/utils/uuid'

/**
 * Add permission to a view
 * Only view creator or admin can add permissions
 */
export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
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
  const { userId, role, permissionType } = body

  if (!permissionType) {
    throw createError({ statusCode: 400, message: 'Permission type is required' })
  }

  if (!userId && !role) {
    throw createError({
      statusCode: 400,
      message: 'Either userId or role must be specified'
    })
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
        message: 'Only the view creator can add permissions'
      })
    }

    // Create permission
    const [permission] = await db
      .insert(viewPermissions)
      .values({
        id: generateUUID(),
        viewId,
        userId: userId || null,
        role: role || null,
        permissionType
      })
      .returning()

    return successResponse(permission)
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error adding view permission:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to add view permission'
    })
  }
})

