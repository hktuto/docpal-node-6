import { eventHandler, createError } from 'h3'
import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'

/**
 * List all tables in an app (scoped to company)
 */
export default eventHandler(async (event) => {
  const app = event.context.app // Already loaded by middleware!

  if (!app) {
    throw createError({
      statusCode: 500,
      message: 'App context not found. Middleware error.',
    })
  }

  // Get all tables for this app
  const tables = await db
    .select()
    .from(schema.dataTables)
    .where(eq(schema.dataTables.appId, app.id))
    .orderBy(schema.dataTables.createdAt)

  return successResponse(tables)
})

