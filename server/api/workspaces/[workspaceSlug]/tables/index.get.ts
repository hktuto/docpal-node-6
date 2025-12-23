import { eventHandler, createError } from 'h3'
import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'

/**
 * List all tables in a workspace (scoped to company)
 */
export default eventHandler(async (event) => {
  const workspace = event.context.workspace // Already loaded by middleware!

  if (!workspace) {
    throw createError({
      statusCode: 500,
      message: 'Workspace context not found. Middleware error.',
    })
  }

  // Get all tables for this workspace
  const tables = await db
    .select()
    .from(schema.dataTables)
    .where(eq(schema.dataTables.workspaceId, workspace.id))
    .orderBy(schema.dataTables.createdAt)

  return successResponse(tables)
})

