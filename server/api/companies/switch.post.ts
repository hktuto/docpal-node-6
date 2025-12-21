import { db } from 'hub:db'
import { companyMembers } from 'hub:db:schema'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth/getCurrentUser'
import { updateSessionCompany } from '~~/server/utils/auth/session'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const { companyId } = body

  // Validate input
  if (!companyId) {
    throw createError({
      statusCode: 400,
      message: 'Company ID is required',
    })
  }

  // Check if user is a member of this company
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

  if (!membership) {
    throw createError({
      statusCode: 403,
      message: 'You are not a member of this company',
    })
  }

  // Update session
  await updateSessionCompany(user.session.id, companyId)

  return successResponse({
    message: 'Company switched successfully',
    companyId,
  })
})

