import { db } from 'hub:db'
import { workspaces } from 'hub:db:schema'
import { eq } from 'drizzle-orm'
import { auditWorkspaceOperation } from '~~/server/utils/audit'
import { messageResponse } from '~~/server/utils/response'

/**
 * Delete workspace by slug (scoped to company)
 */
export default defineEventHandler(async (event) => {
  const workspace = event.context.workspace // Already loaded by middleware!
  
  if (!workspace) {
    throw createError({
      statusCode: 500,
      message: 'Workspace context not found. Middleware error.',
    })
  }
  
  // Audit log workspace deletion (before deletion)
  await auditWorkspaceOperation(event, 'delete', workspace.id, workspace.companyId, event.context.user.id, {
    before: {
      name: workspace.name,
      slug: workspace.slug,
      icon: workspace.icon,
      description: workspace.description,
      menu: workspace.menu,
    },
  })
  
  // Delete workspace (using ID from context)
  const [deletedWorkspace] = await db
    .delete(workspaces)
    .where(eq(workspaces.id, workspace.id))
    .returning()
  
  if (!deletedWorkspace) {
    throw createError({
      statusCode: 500,
      message: 'Failed to delete workspace'
    })
  }
  
  return messageResponse(deletedWorkspace, 'Workspace deleted successfully')
})

