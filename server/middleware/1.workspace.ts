import { db } from 'hub:db'
import { workspaces } from 'hub:db:schema'
import { eq, and } from 'drizzle-orm'

/**
 * Workspace Context Middleware
 * 
 * Runs on workspace-specific routes to:
 * 1. Extract workspaceSlug from URL
 * 2. Load workspace data (scoped to user's company)
 * 3. Attach to event.context
 * 
 * Only runs for routes matching: /api/workspaces/:workspaceSlug/*
 * Requires auth middleware (00.auth.ts) to set user context
 */
export default defineEventHandler(async (event) => {
  const path = event.path

  // Only run for workspace-specific routes
  const workspaceRouteMatch = path.match(/^\/api\/workspaces\/([^\/]+)/)
  if (!workspaceRouteMatch) {
    return // Not a workspace route, skip
  }

  const workspaceSlug = workspaceRouteMatch[1]

  // Get user from context (set by auth middleware)
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required',
    })
  }

  if (!user.company) {
    throw createError({
      statusCode: 400,
      message: 'No company selected. Please select a company first.',
    })
  }

  const companyId = user.company.id

  // Load workspace data (scoped to company)
  const workspace = await db
    .select()
    .from(workspaces)
    .where(and(
      eq(workspaces.companyId, companyId),
      eq(workspaces.slug, workspaceSlug)
    ))
    .limit(1)
    .then(rows => rows[0])

  if (!workspace) {
    throw createError({
      statusCode: 404,
      message: `Workspace '${workspaceSlug}' not found in your company.`,
    })
  }

  // Attach to event context
  event.context.workspace = workspace
  event.context.workspaceId = workspace.id
})

