import { db } from 'hub:db'
import { companyMembers, companyInvites, companies, users } from 'hub:db:schema'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth/getCurrentUser'
import { auditFromEvent } from '~~/server/utils/audit'
import { generateInviteCode } from '~~/server/utils/auth/token'
import { sendInviteEmail } from '~~/server/utils/email'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const companyId = getRouterParam(event, 'companyId')!
  const body = await readBody(event)
  const { email, role } = body

  // Validate input
  if (!email || !role) {
    throw createError({
      statusCode: 400,
      message: 'Email and role are required',
    })
  }

  if (!['admin', 'member'].includes(role)) {
    throw createError({
      statusCode: 400,
      message: 'Role must be either "admin" or "member"',
    })
  }

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
      message: 'You do not have permission to invite members',
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

  // Check if user already exists and is a member
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1)

  if (existingUser.length > 0) {
    const existingMembership = await db
      .select()
      .from(companyMembers)
      .where(
        and(
          eq(companyMembers.companyId, companyId),
          eq(companyMembers.userId, existingUser[0].id)
        )
      )
      .limit(1)

    if (existingMembership.length > 0) {
      throw createError({
        statusCode: 400,
        message: 'User is already a member of this company',
      })
    }
  }

  // Generate invite code
  const inviteCode = generateInviteCode()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

  // Create invite
  const [invite] = await db
    .insert(companyInvites)
    .values({
      companyId,
      email: email.toLowerCase(),
      role,
      inviteCode,
      invitedBy: user.id,
      expiresAt,
    })
    .returning()

  // Send invite email
  try {
    await sendInviteEmail(email, company.name, inviteCode, user.name || user.email)
  } catch (error) {
    console.error('Error sending invite email:', error)
    // Don't fail the request if email fails in dev mode
    if (process.env.NODE_ENV === 'production') {
      throw createError({
        statusCode: 500,
        message: 'Failed to send invite email',
      })
    }
  }

  // Audit log invite
  await auditFromEvent(event, {
    companyId,
    userId: user.id,
    action: 'invite',
    entityType: 'user',
    entityId: invite.id,
    changes: {
      after: {
        email: invite.email,
        role: invite.role,
        inviteCode: invite.inviteCode,
        expiresAt: invite.expiresAt,
      },
    },
  })

  return successResponse({
    invite: {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      inviteCode: invite.inviteCode,
      expiresAt: invite.expiresAt,
    },
  })
})

