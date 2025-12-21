import { db } from 'hub:db'
import { users, sessions, companies, companyMembers } from 'hub:db:schema'
import { eq, and, gte } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { getCookie, getHeader } from 'h3'

export interface CurrentUser {
  id: string
  email: string
  name: string | null
  avatar: string | null
  emailVerifiedAt: Date | null
  session: {
    id: string
    token: string
    companyId: string | null
    expiresAt: Date
  }
  company?: {
    id: string
    name: string
    slug: string
    role: string
  }
}

/**
 * Get current user from session token
 */
export async function getCurrentUser(sessionToken: string): Promise<CurrentUser | null> {
  const now = new Date()

  // Get session with user
  const result = await db
    .select({
      user: users,
      session: sessions,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.token, sessionToken),
        gte(sessions.expiresAt, now)
      )
    )
    .limit(1)

  if (!result.length) {
    return null
  }

  const { user, session } = result[0]

  const currentUser: CurrentUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    emailVerifiedAt: user.emailVerifiedAt,
    session: {
      id: session.id,
      token: session.token,
      companyId: session.companyId,
      expiresAt: session.expiresAt,
    },
  }

  // If session has a company, get company details and user's role
  if (session.companyId) {
    const companyResult = await db
      .select({
        company: companies,
        member: companyMembers,
      })
      .from(companies)
      .innerJoin(companyMembers, eq(companies.id, companyMembers.companyId))
      .where(
        and(
          eq(companies.id, session.companyId),
          eq(companyMembers.userId, user.id)
        )
      )
      .limit(1)

    if (companyResult.length) {
      const { company, member } = companyResult[0]
      currentUser.company = {
        id: company.id,
        name: company.name,
        slug: company.slug,
        role: member.role,
      }
    }
  }

  return currentUser
}

/**
 * Get current user from H3Event
 * NOTE: This now uses event.context.user set by auth middleware
 * Falls back to manual token lookup if middleware hasn't run
 */
export async function getCurrentUserFromEvent(event: H3Event): Promise<CurrentUser | null> {
  // Check if middleware already attached user
  if (event.context.user) {
    return event.context.user
  }

  // Fallback: manually get token (for edge cases where middleware didn't run)
  const cookieToken = getCookie(event, 'session_token')
  const authHeader = getHeader(event, 'Authorization')
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const token = cookieToken || headerToken

  if (!token) {
    return null
  }

  return getCurrentUser(token)
}

/**
 * Require authentication - throws error if not authenticated
 * Uses event.context.user from middleware
 */
export function requireAuth(event: H3Event): CurrentUser {
  const user = event.context.user
  
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - Please log in',
    })
  }

  return user
}

/**
 * Require company context - throws error if user not in a company
 * Uses event.context.user from middleware
 */
export function requireCompany(event: H3Event): CurrentUser & { company: NonNullable<CurrentUser['company']> } {
  const user = requireAuth(event)
  
  if (!user.company) {
    throw createError({
      statusCode: 400,
      message: 'No company selected - Please select or create a company',
    })
  }

  return user as CurrentUser & { company: NonNullable<CurrentUser['company']> }
}

