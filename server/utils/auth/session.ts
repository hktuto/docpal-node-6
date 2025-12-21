import { db } from 'hub:db'
import { sessions } from 'hub:db:schema'
import { eq, and, gte } from 'drizzle-orm'
import { generateToken } from './token'

const SESSION_EXPIRY_DAYS = 30

/**
 * Create a new session for a user
 */
export async function createSession(userId: string, companyId?: string) {
  const token = generateToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS)

  const [session] = await db.insert(sessions).values({
    userId,
    companyId: companyId || null,
    token,
    expiresAt,
  }).returning()

  return session
}

/**
 * Get session by token and validate expiration
 */
export async function getSessionByToken(token: string) {
  const now = new Date()
  
  const [session] = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.token, token),
        gte(sessions.expiresAt, now)
      )
    )
    .limit(1)

  return session || null
}

/**
 * Update session's company
 */
export async function updateSessionCompany(sessionId: string, companyId: string) {
  const [session] = await db
    .update(sessions)
    .set({ companyId })
    .where(eq(sessions.id, sessionId))
    .returning()

  return session
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(token: string) {
  await db
    .delete(sessions)
    .where(eq(sessions.token, token))
}

/**
 * Delete all expired sessions (cleanup)
 */
export async function deleteExpiredSessions() {
  const now = new Date()
  
  await db
    .delete(sessions)
    .where(gte(now, sessions.expiresAt))
}

/**
 * Delete all sessions for a user (logout all devices)
 */
export async function deleteUserSessions(userId: string) {
  await db
    .delete(sessions)
    .where(eq(sessions.userId, userId))
}

