import { eventHandler, readBody, createError, getRouterParam } from 'h3'
import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { validateTableName, validateColumnName } from '~~/server/utils/dynamicTable'
import { auditRowOperation } from '~~/server/utils/audit'
import { successResponse } from '~~/server/utils/response'

/**
 * Update a row in a dynamic table
 * App context provided by middleware
 */
export default eventHandler(async (event) => {
  const workspace = event.context.workspace
  const tableSlug = getRouterParam(event, 'tableSlug')
  const rowId = getRouterParam(event, 'rowId')
  const body = await readBody<Record<string, any>>(event)

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

  // Get column definitions
  const columns = await db
    .select()
    .from(schema.dataTableColumns)
    .where(eq(schema.dataTableColumns.dataTableId, table.id))
    

  // Build UPDATE SQL dynamically
  if (!validateTableName(table.tableName)) {
    throw createError({ statusCode: 500, message: "Invalid table name" })
  }
  const validatedTableName = table.tableName
  const setClauses: string[] = []

  // Helper to check if column is stored as JSONB
  const isJSONBColumn = (columnType: string): boolean => {
    const jsonbTypes = [
      'text', 'richtext', 'url', 'email', 'phone',
      'select', 'multiSelect', 'user', 'relation',
      'currency', 'attachment', 'lookup', 'formula', 'rollup'
    ]
    return jsonbTypes.includes(columnType)
  }

  for (const col of columns) {
    if (col.name in body) {
      if (!validateColumnName(col.name)) {
        throw createError({ statusCode: 500, message: `Invalid column name: ${col.name}` })
      }
      const val = body[col.name]
      
      let formattedVal: string
      if (val === null || val === undefined) {
        formattedVal = 'NULL'
      } else if (isJSONBColumn(col.type)) {
        // For JSONB columns, wrap in JSON and cast to jsonb
        formattedVal = `'${JSON.stringify(val)}'::jsonb`
      } else if (typeof val === 'boolean') {
        formattedVal = val ? 'TRUE' : 'FALSE'
      } else if (typeof val === 'number') {
        formattedVal = String(val)
      } else {
        // Escape single quotes in strings (for native text columns)
        formattedVal = `'${String(val).replace(/'/g, "''")}'`
      }
      
      setClauses.push(`${col.name} = ${formattedVal}`)
    }
  }

  if (setClauses.length === 0) {
    throw createError({ statusCode: 400, message: 'No valid data provided' })
  }

  // Always update the updated_at timestamp
  setClauses.push(`updated_at = NOW()`)

  // Get existing row for audit log (before update)
  const beforeRowSQL = `SELECT * FROM "${validatedTableName}" WHERE id = '${rowId}'::uuid`
  const beforeResult = await db.execute(sql.raw(beforeRowSQL))
  const beforeRow = beforeResult[0] || null

  // Execute raw UPDATE
  const updateSQL = `UPDATE "${validatedTableName}" SET ${setClauses.join(', ')} WHERE id = '${rowId}'::uuid RETURNING *`

  const result = await db.execute(sql.raw(updateSQL))

  if (result.length === 0) {
    throw createError({ statusCode: 404, message: 'Row not found' })
  }

  const updatedRow = result[0]

  // Audit log row update
  if (beforeRow) {
    const changes: Record<string, any> = {}
    for (const col of columns) {
      if (col.name in body && beforeRow[col.name] !== updatedRow[col.name]) {
        changes[col.name] = {
          before: beforeRow[col.name],
          after: updatedRow[col.name],
        }
      }
    }
    
    if (Object.keys(changes).length > 0) {
      await auditRowOperation(event, 'update', rowId, table.id, table.companyId, event.context.user.id, {
        before: beforeRow,
        after: updatedRow,
      })
    }
  }

  return successResponse(updatedRow, { message: 'Row updated successfully' })
})

