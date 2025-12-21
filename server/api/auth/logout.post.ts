import { deleteSession } from '~~/server/utils/auth/session'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  // Get token from cookie
  const token = getCookie(event, 'session_token')

  if (token) {
    // Delete session from database
    await deleteSession(token)
  }

  // Clear cookie
  deleteCookie(event, 'session_token')

  return successResponse({ message: 'Logged out successfully' })
})

