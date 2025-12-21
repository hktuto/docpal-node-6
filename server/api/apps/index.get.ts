import { db } from 'hub:db'
import { apps } from 'hub:db:schema'
import { eq } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'
import { requireCompany } from '~~/server/utils/auth/getCurrentUser'

/**
 * List all apps in the current company
 */
export default defineEventHandler(async (event) => {
  const user = requireCompany(event)
  const companyId = user.company.id

  // Get apps scoped to company
  const allApps = await db
    .select()
    .from(apps)
    .where(eq(apps.companyId, companyId))
    .orderBy(apps.createdAt)

  return successResponse(allApps)
})

