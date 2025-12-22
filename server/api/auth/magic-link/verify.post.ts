import { db } from 'hub:db'
import { users } from 'hub:db:schema'
import { eq } from 'drizzle-orm'
import { verifyMagicLink } from '~~/server/utils/auth/magicLink'
import { createSession } from '~~/server/utils/auth/session'
import { auditUserOperation } from '~~/server/utils/audit'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { token } = body

  // Validate input
  if (!token) {
    throw createError({
      statusCode: 400,
      message: 'Token is required',
    })
  }

  // Verify magic link
  const magicLink = await verifyMagicLink(token, 'login')

  if (!magicLink) {
    throw createError({
      statusCode: 400,
      message: 'Invalid or expired magic link',
    })
  }

  // Find user by email
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, magicLink.email))
    .limit(1)

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found',
    })
  }

  // Update last login
  await db
    .update(users)
    .set({ 
      lastLoginAt: new Date(),
      emailVerifiedAt: user.emailVerifiedAt || new Date(), // Auto-verify on magic link login
    })
    .where(eq(users.id, user.id))

  // Create session
  const session = await createSession(user.id)

  // Set session cookie
  setCookie(event, 'session_token', session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  // Audit log login (magic link login)
  await auditUserOperation(event, 'login', user.id, session.companyId || undefined)

  return successResponse({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      emailVerifiedAt: user.emailVerifiedAt,
    },
    session: {
      token: session.token,
      expiresAt: session.expiresAt,
    },
  })
})

