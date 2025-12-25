import { eventHandler, createError, getRouterParam, getQuery } from 'h3'
import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'
import { queryRowsByView } from '~~/server/utils/queryRowsByView'
import { successResponse } from '~~/server/utils/response'
import { requireCompany } from '~~/server/utils/auth/getCurrentUser'

/**
 * Query rows by view ID
 * 
 * This endpoint applies view's filters, sorting, and column visibility.
 * Works for all view types (Table, Kanban, Calendar, Gallery, etc.)
 * 
 * Future: Add public sharing support with ?token=xyz
 * 
 * GET /api/query/views/:viewId/rows?limit=50&offset=0
 */
export default eventHandler(async (event) => {
  const viewId = getRouterParam(event, 'viewId')
  const query = getQuery(event)

  if (!viewId) {
    throw createError({ statusCode: 400, message: 'View ID is required' })
  }

  // Future: Check for public share token
  // const shareToken = query.token as string | undefined
  // if (shareToken) {
  //   // Validate share token and return public data
  //   return handlePublicAccess(viewId, shareToken, query)
  // }

  // Current: Basic authentication only
  // TODO: Phase 2.6 - Add proper table/view permissions (RBAC)
  const user = await requireCompany(event)

  // Parse pagination params
  const limit = query.limit ? parseInt(query.limit as string, 10) : 50
  const offset = query.offset ? parseInt(query.offset as string, 10) : 0

  // Query rows using shared utility
  try {
    const result = await queryRowsByView(db, schema, viewId, {
      limit,
      offset,
    })

    // Return paginated response with view metadata
    const hasMore = offset + limit < result.total
    return successResponse(
      result.rows,
      {
        pagination: {
          total: result.total,
          limit,
          offset,
          hasMore,
        },
        view: {
          id: result.view.id,
          name: result.view.name,
          type: result.view.type,
          columns: result.columns, // Include visible columns for frontend
        }
      }
    )
  } catch (error) {
    console.error('Error querying view rows:', error)
    throw createError({ 
      statusCode: 500, 
      message: error instanceof Error ? error.message : 'Failed to query view data' 
    })
  }
})

