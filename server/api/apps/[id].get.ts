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

  const [app] = await db
    .select()
    .from(apps)
    .where(eq(apps.id, appId))
    .limit(1)

  if (!app) {
    throw createError({
      statusCode: 404,
      statusMessage: 'App not found'
    })
  }

  return app
})

