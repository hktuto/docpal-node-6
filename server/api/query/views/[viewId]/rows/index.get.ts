import { eventHandler, createError, getRouterParam, getQuery } from 'h3'
import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'
import { queryRowsByView } from '~~/server/utils/queryRowsByView'
import { successResponse } from '~~/server/utils/response'
import { validateViewAccess } from '~~/server/utils/viewAccess'

/**
 * Query rows by view ID
 * 
 * This endpoint applies view's filters, sorting, and column visibility.
 * Works for all view types (Table, Kanban, Calendar, Gallery, etc.)
 * 
 * ✅ Supports public views (no auth required)
 * ✅ Supports shared views (workspace members)
 * ✅ Supports private views (creator only)
 * 
 * GET /api/query/views/:viewId/rows?limit=50&offset=0
 */
export default eventHandler(async (event) => {
  const viewId = getRouterParam(event, 'viewId')
  const query = getQuery(event)

  if (!viewId) {
    throw createError({ statusCode: 400, message: 'View ID is required' })
  }

  // Validate access (supports public views!)
  const accessResult = await validateViewAccess(event, viewId, {
    requireEdit: false,
    allowPublic: true
  })

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
        },
        // Include access type for frontend (useful for UI decisions)
        accessType: accessResult.accessType
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

