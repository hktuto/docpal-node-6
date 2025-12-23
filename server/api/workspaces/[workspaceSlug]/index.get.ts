import { successResponse } from '~~/server/utils/response'

/**
 * Get workspace by slug (scoped to company)
 * 
 * Workspace data is already loaded and validated by middleware.
 * This handler just returns it!
 */
export default defineEventHandler(async (event) => {
  // Workspace context is set by 1.workspace.ts middleware
  const workspace = event.context.workspace
  
  if (!workspace) {
    throw createError({
      statusCode: 500,
      message: 'Workspace context not found. Middleware error.',
    })
  }
  
  return successResponse(workspace)
})

