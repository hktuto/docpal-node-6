import { eventHandler, createError, getRouterParam } from 'h3'
import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { validateTableName } from '~~/server/utils/dynamicTable'
import { messageResponse } from '~~/server/utils/response'

/**
 * Delete a row from a dynamic table
 * App context provided by middleware
 */
export default eventHandler(async (event) => {
  const app = event.context.app
  const tableSlug = getRouterParam(event, 'tableSlug')
  const rowId = getRouterParam(event, 'rowId')

  if (!app) {
    throw createError({ statusCode: 500, message: 'App context not found. Middleware error.' })
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
      eq(schema.dataTables.appId, app.id),
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

  // Execute raw DELETE query
  const deleteSQL = `DELETE FROM "${validatedTableName}" WHERE id = '${rowId}'::uuid RETURNING *`

  const result = await db.execute(sql.raw(deleteSQL))

  if (result.length === 0) {
    throw createError({ statusCode: 404, message: 'Row not found' })
  }

  return messageResponse(result[0], 'Row deleted successfully')
})

