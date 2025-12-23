import { db } from 'hub:db'
import { workspaces } from 'hub:db:schema'
import { eq } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'
import { requireCompany } from '~~/server/utils/auth/getCurrentUser'

/**
 * List all workspaces in the current company
 */
export default defineEventHandler(async (event) => {
  const user = requireCompany(event)
  const companyId = user.company.id

  // Get workspaces scoped to company
  const allWorkspaces = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.companyId, companyId))
    .orderBy(workspaces.createdAt)

  return successResponse(allWorkspaces)
})

