import { db } from 'hub:db'
import { apps } from 'hub:db:schema'
import { eq } from 'drizzle-orm'
import { messageResponse } from '~~/server/utils/response'

/**
 * Delete app by slug (scoped to company)
 */
export default defineEventHandler(async (event) => {
  const app = event.context.app // Already loaded by middleware!
  
  if (!app) {
    throw createError({
      statusCode: 500,
      message: 'App context not found. Middleware error.',
    })
  }
  
  // Delete app (using ID from context)
  const [deletedApp] = await db
    .delete(apps)
    .where(eq(apps.id, app.id))
    .returning()
  
  if (!deletedApp) {
    throw createError({
      statusCode: 500,
      message: 'Failed to delete app'
    })
  }
  
  return messageResponse(deletedApp, 'App deleted successfully')
})

