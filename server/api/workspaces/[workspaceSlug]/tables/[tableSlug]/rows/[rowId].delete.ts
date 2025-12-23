import { eventHandler, createError, getRouterParam } from 'h3'
import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { validateTableName } from '~~/server/utils/dynamicTable'
import { auditRowOperation } from '~~/server/utils/audit'
import { messageResponse } from '~~/server/utils/response'

/**
 * Delete a row from a dynamic table
 * App context provided by middleware
 */
export default eventHandler(async (event) => {
  const workspace = event.context.workspace
  const tableSlug = getRouterParam(event, 'tableSlug')
  const rowId = getRouterParam(event, 'rowId')

  if (!workspace) {
    throw createError({ statusCode: 500, message: 'Workspace context not found. Middleware error.' })
  }

  if (!tableSlug) {
    throw createError({ statusCode: 400, message: 'Table slug is required' })
  }

  if (!rowId) {
    throw createError({ statusCode: 400, message: 'Row ID is required' })
  }

  // Get table metadata with proper scoping
  const table = await db
    .select()
    .from(schema.dataTables)
    .where(and(
      eq(schema.dataTables.workspaceId, workspace.id),
      eq(schema.dataTables.slug, tableSlug)
    ))
    .limit(1).then(rows => rows[0])

  if (!table) {
    throw createError({ statusCode: 404, message: 'Table not found' })
  }

  // Validate table name
  if (!validateTableName(table.tableName)) {
    throw createError({ statusCode: 500, message: "Invalid table name" })
  }
  const validatedTableName = table.tableName

  // Get existing row for audit log (before deletion)
  const beforeRowSQL = `SELECT * FROM "${validatedTableName}" WHERE id = '${rowId}'::uuid`
  const beforeResult = await db.execute(sql.raw(beforeRowSQL))
  const beforeRow = beforeResult[0]

  if (!beforeRow) {
    throw createError({ statusCode: 404, message: 'Row not found' })
  }

  // Audit log row deletion (before deletion)
  await auditRowOperation(event, 'delete', rowId, table.id, table.companyId, event.context.user.id, {
    before: beforeRow,
  })

  // Execute raw DELETE query
  const deleteSQL = `DELETE FROM "${validatedTableName}" WHERE id = '${rowId}'::uuid RETURNING *`

  const result = await db.execute(sql.raw(deleteSQL))

  return messageResponse(result[0], 'Row deleted successfully')
})

