import { eventHandler, createError, getRouterParam, readBody } from 'h3'
import { db, schema } from 'hub:db'
import { queryRowsByView } from '~~/server/utils/queryRowsByView'
import { successResponse } from '~~/server/utils/response'
import { validateViewAccess } from '~~/server/utils/viewAccess'
import { mergeFilters } from '~~/server/utils/mergeFilters'
import type { FilterGroup, SortConfig } from '#shared/types/db'

/**
 * Query rows by view ID with optional filter/sort overrides
 * 
 * POST /api/query/views/:viewId/rows
 * Body: {
 *   limit?: number,
 *   offset?: number,
 *   filters?: FilterGroup | null,           // Override view's default filters
 *   additionalFilters?: FilterGroup | null, // AND on top of filters
 *   sorts?: SortConfig[] | null             // Override view's default sorts
 * }
 * 
 * Filter Logic:
 * - Base: filters ?? view.filters
 * - Final: mergeFilters(Base, additionalFilters)
 * 
 * ✅ Supports public views (no auth required)
 * ✅ Supports temporary filters/sorts (not saved to view)
 * ✅ Supports additive filtering for groups/lanes
 */
export default eventHandler(async (event) => {
  const viewId = getRouterParam(event, 'viewId')
  
  if (!viewId) {
    throw createError({ statusCode: 400, message: 'View ID is required' })
  }

  // Validate access (supports public views!)
  const accessResult = await validateViewAccess(event, viewId, {
    requireEdit: false,
    allowPublic: true
  })

  // Parse request body
  const body = await readBody(event)
  const limit = body.limit || 50
  const offset = body.offset || 0
  const filtersOverride = body.filters || null
  const additionalFilters = body.additionalFilters || null
  const sortsOverride = body.sorts || null

  // Query rows using shared utility with overrides
  // queryRowsByView will handle merging filters internally
  try {
    const result = await queryRowsByView(db, schema, viewId, {
      limit,
      offset,
      filtersOverride,
      additionalFilters,
      sortsOverride
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
        accessType: accessResult.accessType,
        // Indicate if filters/sorts were overridden
        filtersApplied: filtersOverride || result.view.filters,
        sortsApplied: sortsOverride || result.view.sorts
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

