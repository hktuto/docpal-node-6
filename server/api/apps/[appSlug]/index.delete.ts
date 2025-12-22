import { db } from 'hub:db'
import { apps } from 'hub:db:schema'
import { eq } from 'drizzle-orm'
import { auditAppOperation } from '~~/server/utils/audit'
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
  
  // Audit log app deletion (before deletion)
  await auditAppOperation(event, 'delete', app.id, app.companyId, event.context.user.id, {
    before: {
      name: app.name,
      slug: app.slug,
      icon: app.icon,
      description: app.description,
      menu: app.menu,
    },
  })
  
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

