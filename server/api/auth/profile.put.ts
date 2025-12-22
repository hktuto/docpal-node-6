import { db } from 'hub:db'
import { users } from 'hub:db:schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth/getCurrentUser'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const { name, avatar } = body

  // Prepare update data
  const updateData: any = {
    updatedAt: new Date(),
  }

  if (name !== undefined) {
    updateData.name = name || null
  }

  if (avatar !== undefined) {
    updateData.avatar = avatar || null
  }

  // Update user
  const [updatedUser] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, user.id))
    .returning()

  return successResponse({
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      avatar: updatedUser.avatar,
      emailVerifiedAt: updatedUser.emailVerifiedAt,
    },
  })
})

