import { db } from 'hub:db'
import { workspaces } from 'hub:db:schema'
import { eq } from 'drizzle-orm'
import { auditWorkspaceOperation } from '~~/server/utils/audit'
import { successResponse } from '~~/server/utils/response'

/**
 * Update workspace by slug (scoped to company)
 */
export default defineEventHandler(async (event) => {
  const workspace = event.context.workspace // Already loaded by middleware!
  const body = await readBody(event)
  
  if (!workspace) {
    throw createError({
      statusCode: 500,
      message: 'Workspace context not found. Middleware error.',
    })
  }
  
  console.log('🔧 API [workspaceSlug]/index.put.ts received body:', JSON.stringify(body))
  
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
  
  // Update workspace (using ID from context)
  const [updatedWorkspace] = await db
    .update(workspaces)
    .set(updateData)
    .where(eq(workspaces.id, workspace.id))
    .returning()
  
  if (!updatedWorkspace) {
    throw createError({
      statusCode: 500,
      message: 'Failed to update workspace'
    })
  }
  
  // Audit log workspace update
  await auditWorkspaceOperation(event, 'update', workspace.id, workspace.companyId, event.context.user.id, {
    before: {
      name: workspace.name,
      slug: workspace.slug,
      icon: workspace.icon,
      description: workspace.description,
      menu: workspace.menu,
    },
    after: {
      name: updatedWorkspace.name,
      slug: updatedWorkspace.slug,
      icon: updatedWorkspace.icon,
      description: updatedWorkspace.description,
      menu: updatedWorkspace.menu,
    },
  })
  
  console.log('✅ API updated workspace:', JSON.stringify(updatedWorkspace))
  
  return successResponse(updatedWorkspace, { message: 'Workspace updated successfully' })
})

