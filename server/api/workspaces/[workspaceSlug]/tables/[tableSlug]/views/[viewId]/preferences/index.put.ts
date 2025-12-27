import { db } from 'hub:db'
import { userViewPreferences, dataTableViews, dataTables } from 'hub:db:schema'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth/getCurrentUser'
import { successResponse } from '~~/server/utils/response'
import { generateUUID } from '~~/server/utils/uuid'

/**
 * Update user's preferences for a view
 * Creates if doesn't exist
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
  const { preferences } = body

  if (!preferences) {
    throw createError({ statusCode: 400, message: 'Preferences are required' })
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

    // Check if view exists
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

    // Check if preferences exist
    const [existing] = await db
      .select()
      .from(userViewPreferences)
      .where(and(
        eq(userViewPreferences.viewId, viewId),
        eq(userViewPreferences.userId, user.id)
      ))
      .limit(1)

    let result

    if (existing) {
      // Update existing preferences
      [result] = await db
        .update(userViewPreferences)
        .set({
          preferences,
          updatedAt: new Date()
        })
        .where(eq(userViewPreferences.id, existing.id))
        .returning()
    } else {
      // Create new preferences
      [result] = await db
        .insert(userViewPreferences)
        .values({
          id: generateUUID(),
          viewId,
          userId: user.id,
          preferences
        })
        .returning()
    }

    return successResponse(result)
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error updating view preferences:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update view preferences'
    })
  }
})

