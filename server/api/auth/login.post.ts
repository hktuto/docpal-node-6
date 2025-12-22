import { db } from 'hub:db'
import { users, companies, companyMembers } from 'hub:db:schema'
import { eq } from 'drizzle-orm'
import { verifyPassword } from '~~/server/utils/auth/password'
import { createSession } from '~~/server/utils/auth/session'
import { auditUserOperation } from '~~/server/utils/audit'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password } = body

  // Validate input
  if (!email || !password) {
    throw createError({
      statusCode: 400,
      message: 'Email and password are required',
    })
  }

  // Find user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Invalid email or password',
    })
  }

  // Verify password
  const isValid = await verifyPassword(password, user.password)

  if (!isValid) {
    throw createError({
      statusCode: 401,
      message: 'Invalid email or password',
    })
  }

  // Update last login
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id))

  // Get user's companies
  const userCompanies = await db
    .select({
      company: companies,
      member: companyMembers,
    })
    .from(companyMembers)
    .innerJoin(companies, eq(companyMembers.companyId, companies.id))
    .where(eq(companyMembers.userId, user.id))

  // If user has exactly 1 company, auto-apply it to the session
  // If user has multiple companies, let them choose (don't set default)
  // If user has no companies, session will have no company and user needs to create/join one
  const defaultCompany = userCompanies.length === 1 ? userCompanies[0].company.id : undefined

  // Create session with default company if user has exactly one
  const session = await createSession(user.id, defaultCompany)

  // Set session cookie
  setCookie(event, 'session_token', session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  // Audit log login (after successful session creation)
  await auditUserOperation(event, 'login', user.id, defaultCompany)

  return successResponse({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
    },
    session: {
      token: session.token,
      expiresAt: session.expiresAt,
      companyId: session.companyId,
    },
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

