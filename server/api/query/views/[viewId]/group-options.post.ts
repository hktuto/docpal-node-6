import { eventHandler, createError, getRouterParam, readBody } from 'h3'
import { db, schema } from 'hub:db'
import { successResponse } from '~~/server/utils/response'
import { validateViewAccess } from '~~/server/utils/viewAccess'
import { generateGroupOptions } from '~~/server/utils/generateGroupOptions'
import type { FilterGroup } from '#shared/types/db'

/**
 * Get grouping options for a column with counts
 * 
 * POST /api/query/views/:viewId/group-options
 * Body: {
 *   columnName: string,                     // Required: Column to group by
 *   filters?: FilterGroup | null,           // Override view's default filters
 *   additionalFilters?: FilterGroup | null, // AND on top of filters
 *   maxOptions?: number,                    // Limit returned options (default: 50)
 *   includeEmpty?: boolean,                 // Include null/empty group (default: true)
 *   minCount?: number,                      // Only return groups with >= N items (default: 1)
 *   includeAggregates?: boolean,            // Calculate aggregates per group (default: false)
 *   aggregateFields?: Array<{field: string, function: 'SUM'|'AVG'|'MIN'|'MAX'}> // Fields to aggregate
 * }
 * 
 * Returns group options with counts (and optionally aggregates) respecting all filters
 * 
 * ✅ Supports public views (no auth required)
 * ✅ Works with any column type (select, relation, text, number, date, etc.)
 * ✅ Respects filters to ensure counts match actual data
 * ✅ Supports aggregations (SUM, AVG, MIN, MAX) per group
 */
export default eventHandler(async (event) => {
  const viewId = getRouterParam(event, 'viewId')
  
  if (!viewId) {
    throw createError({ statusCode: 400, message: 'View ID is required' })
  }

  // Validate access (supports public views!)
  await validateViewAccess(event, viewId, {
    requireEdit: false,
    allowPublic: true
  })

  // Parse request body
  const body = await readBody(event)
  const {
    columnName,
    filters = null,
    additionalFilters = null,
    maxOptions = 50,
    includeEmpty = true,
    minCount = 1,
    includeAggregates = false,
    aggregateFields = []
  } = body

  if (!columnName) {
    throw createError({ statusCode: 400, message: 'columnName is required' })
  }

  try {
    // Generate group options using utility
    const result = await generateGroupOptions(db, schema, viewId, {
      columnName,
      filters,
      additionalFilters,
      maxOptions,
      includeEmpty,
      minCount,
      includeAggregates,
      aggregateFields
    })

    return successResponse(result)
  } catch (error) {
    console.error('Error generating group options:', error)
    throw createError({ 
      statusCode: 500, 
      message: error instanceof Error ? error.message : 'Failed to generate group options' 
    })
  }
})

