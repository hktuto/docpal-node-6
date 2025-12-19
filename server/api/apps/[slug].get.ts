import { db } from 'hub:db'
import { apps } from 'hub:db:schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  
  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'App slug is required'
    })
  }
  
  const [app] = await db.select().from(apps).where(eq(apps.slug, slug))
  
  if (!app) {
    throw createError({
      statusCode: 404,
      message: 'App not found'
    })
  }
  
  return app
})

