import { db } from 'hub:db'
import { apps } from 'hub:db:schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const body = await readBody(event)
  
  console.log('🔧 API [slug].put.ts received body:', JSON.stringify(body))
  
  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'App slug is required'
    })
  }
  
  // Build update object with only provided fields
  const updateData: any = {
    updatedAt: new Date(),
  }
  
  if (body.name !== undefined) updateData.name = body.name
  if (body.icon !== undefined) updateData.icon = body.icon
  if (body.description !== undefined) updateData.description = body.description
  if (body.menu !== undefined) {
    console.log('📋 API menu field:', JSON.stringify(body.menu))
    updateData.menu = body.menu
  }
  
  console.log('💾 API updateData to be saved:', JSON.stringify(updateData))
  
  // Update app
  const [app] = await db
    .update(apps)
    .set(updateData)
    .where(eq(apps.slug, slug))
    .returning()
  
  if (!app) {
    throw createError({
      statusCode: 404,
      message: 'App not found'
    })
  }
  
  console.log('✅ API updated app:', JSON.stringify(app))
  
  return app
})

