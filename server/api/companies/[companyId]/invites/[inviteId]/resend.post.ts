import { db } from 'hub:db'
import { companyInvites, companyMembers, companies, users } from 'hub:db:schema'
import { eq, and, isNull, gte } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth/getCurrentUser'
import { sendInviteEmail } from '~~/server/utils/email'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const companyId = getRouterParam(event, 'companyId')!
  const inviteId = getRouterParam(event, 'inviteId')!

  // Check if user is admin or owner
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

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    throw createError({
      statusCode: 403,
      message: 'You do not have permission to resend invites',
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

  const now = new Date()

  // Get the invite
  const [invite] = await db
    .select()
    .from(companyInvites)
    .where(
      and(
        eq(companyInvites.id, inviteId),
        eq(companyInvites.companyId, companyId),
        isNull(companyInvites.acceptedAt),
        gte(companyInvites.expiresAt, now)
      )
    )
    .limit(1)

  if (!invite) {
    throw createError({
      statusCode: 404,
      message: 'Invite not found, already accepted, or expired',
    })
  }

  // Get the user who originally sent the invite (or use current user if unavailable)
  const [inviter] = await db
    .select()
    .from(users)
    .where(eq(users.id, invite.invitedBy))
    .limit(1)

  const inviterName = inviter?.name || inviter?.email || user.name || user.email

  // Resend invite email
  try {
    await sendInviteEmail(invite.email, company.name, invite.inviteCode, inviterName)
  } catch (error) {
    console.error('Error resending invite email:', error)
    // Don't fail the request if email fails in dev mode
    if (process.env.NODE_ENV === 'production') {
      throw createError({
        statusCode: 500,
        message: 'Failed to resend invite email',
      })
    }
  }

  return successResponse({
    message: 'Invite email resent successfully',
  })
})

