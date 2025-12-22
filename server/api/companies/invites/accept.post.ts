import { db } from 'hub:db'
import { companyInvites, companyMembers, users, companies } from 'hub:db:schema'
import { eq, and, gte, isNull } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth/getCurrentUser'
import { updateSessionCompany } from '~~/server/utils/auth/session'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const { inviteCode } = body

  // Validate input
  if (!inviteCode) {
    throw createError({
      statusCode: 400,
      message: 'Invite code is required',
    })
  }

  // Find invite
  const now = new Date()
  const [invite] = await db
    .select()
    .from(companyInvites)
    .where(
      and(
        eq(companyInvites.inviteCode, inviteCode),
        eq(companyInvites.email, user.email),
        gte(companyInvites.expiresAt, now),
        isNull(companyInvites.acceptedAt)
      )
    )
    .limit(1)

  if (!invite) {
    throw createError({
      statusCode: 400,
      message: 'Invalid or expired invite code',
    })
  }

  // Check if user is already a member
  const existingMembership = await db
    .select()
    .from(companyMembers)
    .where(
      and(
        eq(companyMembers.companyId, invite.companyId),
        eq(companyMembers.userId, user.id)
      )
    )
    .limit(1)
  console.log('existingMembership', existingMembership)
  if (existingMembership.length > 0) {
    throw createError({
      statusCode: 400,
      message: 'You are already a member of this company',
    })
  }
  console.log('invite', invite)
  // Add user to company
  const newMembership = await db
    .insert(companyMembers)
    .values({
      companyId: invite.companyId,
      userId: user.id,
      role: invite.role,
    })
  console.log('newMembership', newMembership)
  // Mark invite as accepted
  await db
    .update(companyInvites)
    .set({ acceptedAt: now })
    .where(eq(companyInvites.id, invite.id))

  // Switch session to new company
  const updatedSession = await updateSessionCompany(user.session.id, invite.companyId)
  console.log('updateSessionCompany', updatedSession)
  return successResponse({
    message: 'Invite accepted successfully',
    companyId: invite.companyId,
  })
})

