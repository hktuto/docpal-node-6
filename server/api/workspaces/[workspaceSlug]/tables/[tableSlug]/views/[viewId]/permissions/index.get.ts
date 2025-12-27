import { db } from 'hub:db'
import { viewPermissions, dataTableViews, dataTables, users } from 'hub:db:schema'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth/getCurrentUser'
import { successResponse } from '~~/server/utils/response'

/**
 * Get all permissions for a view
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

    // Check if user has access
    const isCreator = view.createdBy === user.id
    const isShared = view.isShared

    if (!isCreator && !isShared) {
      throw createError({
        statusCode: 403,
        message: 'You do not have permission to view this'
      })
    }

    // Get permissions with user details
    const permissions = await db
      .select({
        id: viewPermissions.id,
        userId: viewPermissions.userId,
        role: viewPermissions.role,
        permissionType: viewPermissions.permissionType,
        createdAt: viewPermissions.createdAt,
        // Join user details if userId exists
        userName: users.name,
        userEmail: users.email
      })
      .from(viewPermissions)
      .leftJoin(users, eq(viewPermissions.userId, users.id))
      .where(eq(viewPermissions.viewId, viewId))

    return successResponse(permissions)
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error fetching view permissions:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch view permissions'
    })
  }
})

