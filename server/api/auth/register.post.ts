import { db } from 'hub:db'
import { users } from 'hub:db:schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '~~/server/utils/auth/password'
import { createSession } from '~~/server/utils/auth/session'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password, name } = body

  // Validate input
  if (!email || !password) {
    throw createError({
      statusCode: 400,
      message: 'Email and password are required',
    })
  }

  if (password.length < 8) {
    throw createError({
      statusCode: 400,
      message: 'Password must be at least 8 characters long',
    })
  }

  // Check if user already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1)

  if (existingUser.length > 0) {
    throw createError({
      statusCode: 400,
      message: 'User with this email already exists',
    })
  }

  // Hash password
  const passwordHash = await hashPassword(password)

  // Create user
  const [user] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      password: passwordHash,
      name: name || null,
    })
    .returning()

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

