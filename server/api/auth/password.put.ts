import { db } from 'hub:db'
import { users } from 'hub:db:schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth/getCurrentUser'
import { hashPassword, verifyPassword } from '~~/server/utils/auth/password'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const { currentPassword, newPassword } = body

  // Validate input
  if (!currentPassword || !newPassword) {
    throw createError({
      statusCode: 400,
      message: 'Current password and new password are required',
    })
  }

  if (newPassword.length < 8) {
    throw createError({
      statusCode: 400,
      message: 'New password must be at least 8 characters long',
    })
  }

  // Get current user with password
  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  if (!currentUser) {
    throw createError({
      statusCode: 404,
      message: 'User not found',
    })
  }

  // Verify current password
  const isValid = await verifyPassword(currentPassword, currentUser.password)

  if (!isValid) {
    throw createError({
      statusCode: 400,
      message: 'Current password is incorrect',
    })
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword)

  // Update password
  await db
    .update(users)
    .set({
      password: passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))

  return successResponse({
    message: 'Password updated successfully',
  })
})

