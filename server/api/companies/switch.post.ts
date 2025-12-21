import { db } from 'hub:db'
import { companies, companyMembers } from 'hub:db:schema'
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

  // Check if user is a member of this company and get company details
  const [companyResult] = await db
    .select({
      company: companies,
      member: companyMembers,
    })
    .from(companyMembers)
    .innerJoin(companies, eq(companyMembers.companyId, companies.id))
    .where(
      and(
        eq(companyMembers.companyId, companyId),
        eq(companyMembers.userId, user.id)
      )
    )
    .limit(1)

  if (!companyResult) {
    throw createError({
      statusCode: 403,
      message: 'You are not a member of this company',
    })
  }

  const { company, member } = companyResult

  // Update session
  await updateSessionCompany(user.session.id, companyId)

  return successResponse({
    message: 'Company switched successfully',
    company: {
      id: company.id,
      name: company.name,
      slug: company.slug,
      description: company.description,
      logo: company.logo,
      role: member.role,
      createdAt: company.createdAt,
    },
  })
})

