import { db } from 'hub:db'
import { apps } from 'hub:db:schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const appId = getRouterParam(event, 'id')
  
  if (!appId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'App ID is required'
    })
  }

  // Check if app exists
  const [existingApp] = await db
    .select()
    .from(apps)
    .where(eq(apps.id, appId))
    .limit(1)

  if (!existingApp) {
    throw createError({
      statusCode: 404,
      statusMessage: 'App not found'
    })
  }

  // Delete app (cascade will handle related data if foreign keys are set up)
  await db
    .delete(apps)
    .where(eq(apps.id, appId))

  return {
    success: true,
    message: 'App deleted successfully'
  }
})

