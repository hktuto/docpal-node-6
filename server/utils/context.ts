import type { H3Event } from 'h3'
import type { Company, Workspace } from '#shared/types/db'


/**
 * Get current company ID from event context
 * 
 * @throws Error if company context not found
 */
export function requireCompanyId(event: H3Event): string {
  const companyId = event.context.companyId

  if (!companyId) {
    throw createError({
      statusCode: 500,
      message: 'Company context not found. Middleware error.',
    })
  }

  return companyId
}

/**
 * Get current workspace from event context
 * Workspace is set by 1.workspace.ts middleware (only on /api/workspaces/:slug/* routes)
 * 
 * @throws Error if workspace context not found
 */
export function requireWorkspace(event: H3Event): Workspace {
  const workspace = event.context.workspace

  if (!workspace) {
    throw createError({
      statusCode: 500,
      message: 'Workspace context not found. Middleware error.',
    })
  }

  return workspace
}

/**
 * Get current workspace ID from event context
 * 
 * @throws Error if workspace context not found
 */
export function requireWorkspaceId(event: H3Event): string {
  const workspaceId = event.context.workspaceId

  if (!workspaceId) {
    throw createError({
      statusCode: 500,
      message: 'Workspace context not found. Middleware error.',
    })
  }

  return workspaceId
}

