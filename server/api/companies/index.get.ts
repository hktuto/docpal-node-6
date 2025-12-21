import { db } from 'hub:db'
import { companies, companyMembers } from 'hub:db:schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth/getCurrentUser'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Get all companies where user is a member
  const userCompanies = await db
    .select({
      company: companies,
      member: companyMembers,
    })
    .from(companyMembers)
    .innerJoin(companies, eq(companyMembers.companyId, companies.id))
    .where(eq(companyMembers.userId, user.id))

  return successResponse({
    companies: userCompanies.map(({ company, member }) => ({
      id: company.id,
      name: company.name,
      slug: company.slug,
      description: company.description,
      logo: company.logo,
      role: member.role,
      createdAt: company.createdAt,
    })),
  })
})

