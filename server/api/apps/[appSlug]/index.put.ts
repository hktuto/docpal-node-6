import { db } from 'hub:db'
import { apps } from 'hub:db:schema'
import { eq } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'

/**
 * Update app by slug (scoped to company)
 */
export default defineEventHandler(async (event) => {
  const app = event.context.app // Already loaded by middleware!
  const body = await readBody(event)
  
  if (!app) {
    throw createError({
      statusCode: 500,
      message: 'App context not found. Middleware error.',
    })
  }
  
  console.log('🔧 API [appSlug]/index.put.ts received body:', JSON.stringify(body))
  
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
  
  // Update app (using ID from context)
  const [updatedApp] = await db
    .update(apps)
    .set(updateData)
    .where(eq(apps.id, app.id))
    .returning()
  
  if (!updatedApp) {
    throw createError({
      statusCode: 500,
      message: 'Failed to update app'
    })
  }
  
  console.log('✅ API updated app:', JSON.stringify(updatedApp))
  
  return successResponse(updatedApp, { message: 'App updated successfully' })
})

