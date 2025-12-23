import { eventHandler, createError, getRouterParam, getQuery } from 'h3'
import { db, schema } from 'hub:db'
import { eq, and, sql } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'

/**
 * Search records for relation picker
 */
export default eventHandler(async (event) => {
  const workspaceSlug = getRouterParam(event, 'workspaceSlug')
  const tableSlug = getRouterParam(event, 'tableSlug')
  const query = getQuery(event)
  
  const searchQuery = query.q as string || ''
  const displayField = query.field as string || 'id'
  const limit = parseInt(query.limit as string || '50')

  if (!workspaceSlug || !tableSlug) {
    throw createError({ statusCode: 400, message: 'Workspace slug and table slug are required' })
  }

  // Get workspace
  const workspace = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.slug, workspaceSlug))
    .limit(1)
    .then(rows => rows[0])

  if (!workspace) {
    throw createError({ statusCode: 404, message: 'Workspace not found' })
  }

  // Get table
  const table = await db
    .select()
    .from(schema.dataTables)
    .where(and(
      eq(schema.dataTables.workspaceId, workspace.id),
      eq(schema.dataTables.slug, tableSlug)
    ))
    .limit(1)
    .then(rows => rows[0])

  if (!table) {
    throw createError({ statusCode: 404, message: 'Table not found' })
  }

  try {
    // Build search query using sql.raw()
    let query = `SELECT id, "${displayField}" FROM "${table.tableName}"`
    
    if (searchQuery && searchQuery.trim()) {
      // Escape single quotes for SQL injection prevention
      const escapedSearch = searchQuery.replace(/'/g, "''")
      query += ` WHERE "${displayField}"::text ILIKE '%${escapedSearch}%'`
    }
    
    query += ` ORDER BY "${displayField}" LIMIT ${limit}`
    
    const result = await db.execute(sql.raw(query))
    
    console.log('🔍 Search result structure:', {
      hasRows: 'rows' in result,
      resultType: typeof result,
      resultKeys: Object.keys(result),
      result: result
    })
    
    // Return the rows array - could be result.rows or result itself
    const rows = Array.isArray(result) ? result : result.rows || []
    
    return successResponse(rows)
  } catch (error) {
    console.error('❌ Failed to search records:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to search records'
    })
  }
})

