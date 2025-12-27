import { db } from 'hub:db'
import { dataTableViews, dataTables, workspaces, companyMembers } from 'hub:db:schema'
import { eq, and } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { requireAuth } from './auth/getCurrentUser'

/**
 * View Access Control Utilities
 * 
 * Handles public, shared, and private view access validation
 */

export interface ViewAccessResult {
  view: any
  table: any
  workspace: any
  hasAccess: boolean
  accessType: 'public' | 'shared' | 'private' | 'creator'
}

/**
 * Get view with full context (table, workspace)
 */
export async function getViewWithContext(viewId: string) {
  const [view] = await db
    .select({
      view: dataTableViews,
      table: dataTables,
      workspace: workspaces
    })
    .from(dataTableViews)
    .innerJoin(dataTables, eq(dataTableViews.dataTableId, dataTables.id))
    .innerJoin(workspaces, eq(dataTables.workspaceId, workspaces.id))
    .where(eq(dataTableViews.id, viewId))
    .limit(1)

  if (!view) {
    return null
  }

  return {
    ...view.view,
    table: view.table,
    workspace: view.workspace
  }
}

/**
 * Validate if user has access to a view
 * Returns access info or throws error
 */
export async function validateViewAccess(
  event: H3Event,
  viewId: string,
  options: {
    requireEdit?: boolean  // Requires edit permission
    allowPublic?: boolean  // Allow public access
  } = {}
): Promise<ViewAccessResult> {
  const { requireEdit = false, allowPublic = true } = options

  // Get view with context
  const view = await getViewWithContext(viewId)
  if (!view) {
    throw createError({ statusCode: 404, message: 'View not found' })
  }

  // PUBLIC ACCESS
  if (allowPublic && view.isPublic && !requireEdit) {
    return {
      view,
      table: view.table,
      workspace: view.workspace,
      hasAccess: true,
      accessType: 'public'
    }
  }

  // All other cases require authentication
  let user
  try {
    user = requireAuth(event)
  } catch (error) {
    throw createError({ 
      statusCode: 401, 
      message: 'Authentication required to access this view' 
    })
  }

  // CREATOR ACCESS (full control)
  if (view.createdBy === user.id) {
    return {
      view,
      table: view.table,
      workspace: view.workspace,
      hasAccess: true,
      accessType: 'creator'
    }
  }

  // SHARED ACCESS (requires workspace membership)
  if (view.isShared) {
    // Check if user is member of the workspace's company
    const [membership] = await db
      .select()
      .from(companyMembers)
      .where(and(
        eq(companyMembers.userId, user.id),
        eq(companyMembers.companyId, view.workspace.companyId)
      ))
      .limit(1)

    if (membership) {
      // Check if edit is required
      if (requireEdit) {
        // Only creator or company admin can edit
        const isAdmin = membership.role === 'admin'
        if (!isAdmin) {
          throw createError({ 
            statusCode: 403, 
            message: 'Only the view creator or company admin can edit this view' 
          })
        }
      }

      return {
        view,
        table: view.table,
        workspace: view.workspace,
        hasAccess: true,
        accessType: 'shared'
      }
    }
  }

  // PRIVATE ACCESS (creator only)
  if (!view.isShared && !view.isPublic) {
    throw createError({ 
      statusCode: 403, 
      message: 'This is a private view. Only the creator can access it.' 
    })
  }

  // No access
  throw createError({ 
    statusCode: 403, 
    message: 'You do not have permission to access this view' 
  })
}

/**
 * Check if view is publicly accessible
 */
export async function isViewPublic(viewId: string): Promise<boolean> {
  const [view] = await db
    .select({ isPublic: dataTableViews.isPublic })
    .from(dataTableViews)
    .where(eq(dataTableViews.id, viewId))
    .limit(1)

  return view?.isPublic || false
}

/**
 * Get public view info (no auth required)
 * Only returns basic info, no sensitive data
 */
export async function getPublicViewInfo(viewId: string) {
  const view = await getViewWithContext(viewId)

  if (!view || !view.isPublic) {
    throw createError({ 
      statusCode: 404, 
      message: 'Public view not found' 
    })
  }

  // Return sanitized public info
  return {
    id: view.id,
    name: view.name,
    description: view.description,
    viewType: view.viewType,
    filters: view.filters,
    sort: view.sort,
    visibleColumns: view.visibleColumns,
    columnWidths: view.columnWidths,
    viewConfig: view.viewConfig,
    // Do NOT expose: createdBy, table structure, workspace info
  }
}

