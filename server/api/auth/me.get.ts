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

  return successResponse({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      emailVerifiedAt: user.emailVerifiedAt,
    },
    company: user.company || null,
  })
})

