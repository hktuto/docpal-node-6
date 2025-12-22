import { db } from 'hub:db'
import { companyInvites, companyMembers, users } from 'hub:db:schema'
import { eq, and, isNull, gte } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth/getCurrentUser'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const companyId = getRouterParam(event, 'companyId')!

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
      message: 'You do not have permission to view invites',
    })
  }

  const now = new Date()

  // Get pending invites (not accepted and not expired)
  const invites = await db
    .select({
      id: companyInvites.id,
      email: companyInvites.email,
      role: companyInvites.role,
      inviteCode: companyInvites.inviteCode,
      expiresAt: companyInvites.expiresAt,
      createdAt: companyInvites.createdAt,
      invitedBy: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(companyInvites)
    .innerJoin(users, eq(companyInvites.invitedBy, users.id))
    .where(
      and(
        eq(companyInvites.companyId, companyId),
        isNull(companyInvites.acceptedAt),
        gte(companyInvites.expiresAt, now)
      )
    )
    .orderBy(companyInvites.createdAt)

  return successResponse({
    invites: invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      inviteCode: invite.inviteCode,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
      invitedBy: invite.invitedBy,
    })),
  })
})

