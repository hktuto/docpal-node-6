import { db } from 'hub:db'
import { companies, companyMembers } from 'hub:db:schema'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth/getCurrentUser'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const companyId = getRouterParam(event, 'companyId')!

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
      message: 'You do not have access to this company',
    })
  }

  // Get company details
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1)

  if (!company) {
    throw createError({
      statusCode: 404,
      message: 'Company not found',
    })
  }

  return successResponse({
    company: {
      id: company.id,
      name: company.name,
      slug: company.slug,
      description: company.description,
      logo: company.logo,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    },
    role: membership.role,
  })
})

