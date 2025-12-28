import { eventHandler, createError, getRouterParam, getQuery } from 'h3'
import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { validateTableName } from '~~/server/utils/dynamicTable'
import { paginatedResponse } from '~~/server/utils/response'


/**
 * List rows from a dynamic table with pagination
 * App context provided by middleware
 */
export default eventHandler(async (event) => {
  const workspace = event.context.workspace
  const tableSlug = getRouterParam(event, 'tableSlug')
  const query = getQuery(event)
  
  // Pagination params
  const limit = query.limit ? parseInt(query.limit as string, 10) : 50
  const offset = query.offset ? parseInt(query.offset as string, 10) : 0

  if (!workspace) {
    throw createError({ statusCode: 500, message: 'Workspace context not found. Middleware error.' })
  }

  if (!tableSlug) {
    throw createError({ statusCode: 400, message: 'Table slug is required' })
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

  // Get table columns to check for lookup fields
  const columns = await db
    .select()
    .from(schema.dataTableColumns)
    .where(eq(schema.dataTableColumns.dataTableId, table.id))
    .orderBy(schema.dataTableColumns.order)

  // Execute raw SELECT query
  const selectSQL = `SELECT * FROM "${validatedTableName}" ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
  let rows:any[] = await db.execute(sql.raw(selectSQL))

  // Resolve computed fields in order:
  // 1. Relation fields (enrich with display information)
  rows = await resolveRelationFieldsForRows(rows as any[], columns)

  // 2. Lookup fields (pull data from relations)
  rows = await resolveLookupFieldsForRows(rows as any[], columns, validatedTableName)

  // 3. Rollup fields (aggregate data from related tables)
  rows = await resolveRollupFieldsForRows(rows as any[], columns)

  // 4. Formula fields (calculate values from current row, may use lookup/rollup results)
  rows = resolveFormulaFieldsForRows(rows as any[], columns)

  // Get total count
  const countSQL = `SELECT COUNT(*) as count FROM "${validatedTableName}"`
  const countResult = await db.execute(sql.raw(countSQL))
  const total = parseInt((countResult[0] as any).count, 10)

  return paginatedResponse(rows, total, limit, offset)
})

