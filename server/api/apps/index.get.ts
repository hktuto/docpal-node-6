import { db } from 'hub:db'
import { apps } from 'hub:db:schema'
import { eq } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'

/**
 * List all apps in the current company
 * Company is determined by middleware from cookie/session
 */
export default defineEventHandler(async (event) => {
  const companyId = event.context.companyId

  if (!companyId) {
    throw createError({
      statusCode: 500,
      message: 'Company context not found. Middleware error.',
    })
  }

  // Get apps scoped to company
  const allApps = await db
    .select()
    .from(apps)
    .where(eq(apps.companyId, companyId))
    .orderBy(apps.createdAt)

  return successResponse(allApps)
})

