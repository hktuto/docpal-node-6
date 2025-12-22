import { deleteSession, getSessionByToken } from '~~/server/utils/auth/session'
import { auditUserOperation } from '~~/server/utils/audit'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  // Get token from cookie
  const token = getCookie(event, 'session_token')

  let userId: string | undefined
  let companyId: string | undefined

  // Get session info before deleting for audit log
  if (token) {
    const session = await getSessionByToken(token)
    if (session) {
      userId = session.userId
      companyId = session.companyId || undefined
    }
  }

  if (token) {
    // Delete session from database
    await deleteSession(token)
  }

  // Audit log logout (after session deletion)
  if (userId) {
    await auditUserOperation(event, 'logout', userId, companyId)
  }

  // Clear cookie
  deleteCookie(event, 'session_token')

  return successResponse({ message: 'Logged out successfully' })
})

