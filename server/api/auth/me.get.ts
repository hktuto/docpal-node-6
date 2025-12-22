import { getCurrentUserFromEvent } from '~~/server/utils/auth/getCurrentUser'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUserFromEvent(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated',
    })
  }

  // Get full user data from database to include timestamps
  const { db } = await import('hub:db')
  const { users } = await import('hub:db:schema')
  const { eq } = await import('drizzle-orm')
  
  const [fullUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  return successResponse({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: fullUser?.lastLoginAt || null,
      createdAt: fullUser?.createdAt || null,
    },
    company: user.company || null,
  })
})

