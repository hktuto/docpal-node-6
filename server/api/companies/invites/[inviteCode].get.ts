import { db } from 'hub:db'
import { companyInvites, companies } from 'hub:db:schema'
import { eq, and, gte, isNull } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const inviteCode = getRouterParam(event, 'inviteCode')!

  const now = new Date()

  // Find valid invite with company info
  const result = await db
    .select({
      invite: companyInvites,
      company: companies,
    })
    .from(companyInvites)
    .innerJoin(companies, eq(companyInvites.companyId, companies.id))
    .where(
      and(
        eq(companyInvites.inviteCode, inviteCode),
        gte(companyInvites.expiresAt, now),
        isNull(companyInvites.acceptedAt)
      )
    )
    .limit(1)

  if (!result.length) {
    throw createError({
      statusCode: 404,
      message: 'Invitation not found or has expired',
    })
  }

  const { invite, company } = result[0]

  return successResponse({
    email: invite.email,
    companyName: company.name,
    role: invite.role,
  })
})

