import { eventHandler, createError, getRouterParam } from 'h3'
import { db, schema } from 'hub:db'
import { eq, and, sql } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'

/**
 * Get a single record by ID
 */
export default eventHandler(async (event) => {
  const workspaceSlug = getRouterParam(event, 'workspaceSlug')
  const tableSlug = getRouterParam(event, 'tableSlug')
  const recordId = getRouterParam(event, 'recordId')

  if (!workspaceSlug || !tableSlug || !recordId) {
    throw createError({ statusCode: 400, message: 'Workspace slug, table slug, and record ID are required' })
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
    // Fetch record using sql.raw()
    // Escape single quotes for SQL injection prevention
    const escapedRecordId = recordId.replace(/'/g, "''")
    
    const result = await db.execute(
      sql.raw(`SELECT * FROM "${table.tableName}" WHERE id = '${escapedRecordId}' LIMIT 1`)
    )
    
    // Handle both array and object result structures
    const rows = Array.isArray(result) ? result : result.rows || []
    const record = rows[0]
    
    if (!record) {
      throw createError({ statusCode: 404, message: 'Record not found' })
    }
    
    return successResponse(record)
  } catch (error) {
    console.error('❌ Failed to fetch record:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to fetch record'
    })
  }
})

