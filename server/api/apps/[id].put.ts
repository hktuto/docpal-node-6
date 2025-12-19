import { db } from 'hub:db'
import { apps } from 'hub:db:schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const appId = getRouterParam(event, 'id')
  const body = await readBody(event)
  
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

  // Update app
  const updateData: {
    name?: string
    description?: string | null
    icon?: string | null
    updatedAt?: Date
  } = {
    updatedAt: new Date()
  }

  if (body.name !== undefined) {
    updateData.name = body.name
  }
  if (body.description !== undefined) {
    updateData.description = body.description || null
  }
  if (body.icon !== undefined) {
    updateData.icon = body.icon || null
  }

  const [updatedApp] = await db
    .update(apps)
    .set(updateData)
    .where(eq(apps.id, appId))
    .returning()

  return updatedApp
})

