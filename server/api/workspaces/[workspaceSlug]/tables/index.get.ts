import { eventHandler, createError, getRouterParam } from 'h3'
import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'

/**
 * Get all tables in a workspace
 */
export default eventHandler(async (event) => {
  const workspaceSlug = getRouterParam(event, 'workspaceSlug')

  if (!workspaceSlug) {
    throw createError({ statusCode: 400, message: 'Workspace slug is required' })
  }

  // Get workspace
  const workspace = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.slug, workspaceSlug))
    .limit(1)
    .then(rows => rows[0])

  if (!workspace) {
    throw createError({ statusCode: 404, message: 'Workspace not found' })
  }

  // Get all tables in workspace
  const tables = await db
    .select()
    .from(schema.dataTables)
    .where(eq(schema.dataTables.workspaceId, workspace.id))
    .orderBy(schema.dataTables.createdAt)

  return successResponse(tables)
})
