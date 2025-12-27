import { db } from 'hub:db'
import { magicLinks } from 'hub:db:schema'
import { eq, and, gte, isNull } from 'drizzle-orm'
import { generateToken } from './token'
import { generateUUID } from '~~/server/utils/uuid'

const MAGIC_LINK_EXPIRY_HOURS = 1

export type MagicLinkType = 'login' | 'invite' | 'verify_email'

/**
 * Create a new magic link
 */
export async function createMagicLink(email: string, type: MagicLinkType) {
  const token = generateToken()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + MAGIC_LINK_EXPIRY_HOURS)

  const [magicLink] = await db.insert(magicLinks).values({
    id: generateUUID(),
    email,
    token,
    type,
    expiresAt,
  }).returning()

  return magicLink
}

/**
 * Verify a magic link token
 */
export async function verifyMagicLink(token: string, type?: MagicLinkType) {
  const now = new Date()
  
  const conditions = [
    eq(magicLinks.token, token),
    gte(magicLinks.expiresAt, now),
    isNull(magicLinks.usedAt)
  ]

  if (type) {
    conditions.push(eq(magicLinks.type, type))
  }

  const [magicLink] = await db
    .select()
    .from(magicLinks)
    .where(and(...conditions))
    .limit(1)

  if (!magicLink) {
    return null
  }

  // Mark as used
  await db
    .update(magicLinks)
    .set({ usedAt: now })
    .where(eq(magicLinks.id, magicLink.id))

  return magicLink
}

/**
 * Delete expired magic links (cleanup)
 */
export async function deleteExpiredMagicLinks() {
  const now = new Date()
  
  await db
    .delete(magicLinks)
    .where(gte(now, magicLinks.expiresAt))
}

