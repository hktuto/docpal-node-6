import { db } from 'hub:db'
import { companies, companyMembers } from 'hub:db:schema'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth/getCurrentUser'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const companyId = getRouterParam(event, 'companyId')!

  // Check if user is owner
  const [membership] = await db
    .select()
    .from(companyMembers)
    .where(
      and(
        eq(companyMembers.companyId, companyId),
        eq(companyMembers.userId, user.id)
      )
    )
    .limit(1)

  if (!membership || membership.role !== 'owner') {
    throw createError({
      statusCode: 403,
      message: 'Only the company owner can delete the company',
    })
  }

  // Delete company (cascade will handle members, apps, tables, etc.)
  await db
    .delete(companies)
    .where(eq(companies.id, companyId))

  return successResponse({
    message: 'Company deleted successfully',
  })
})

