import { db } from 'hub:db'
import { apps } from 'hub:db:schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const body = await readBody(event)
  
  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'App slug is required'
    })
  }
  
  // Update app
  const [app] = await db
    .update(apps)
    .set({
      name: body.name,
      icon: body.icon,
      description: body.description,
      updatedAt: new Date(),
    })
    .where(eq(apps.slug, slug))
    .returning()
  
  if (!app) {
    throw createError({
      statusCode: 404,
      message: 'App not found'
    })
  }
  
  return app
})

