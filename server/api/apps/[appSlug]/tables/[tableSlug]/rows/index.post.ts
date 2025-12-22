import { eventHandler, readBody, createError, getRouterParam } from 'h3'
import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { validateTableName, validateColumnName } from '~~/server/utils/dynamicTable'
import { auditRowOperation } from '~~/server/utils/audit'
import { successResponse } from '~~/server/utils/response'

/**
 * Create a new row in a dynamic table
 * App context provided by middleware
 */
export default eventHandler(async (event) => {
  const app = event.context.app
  const tableSlug = getRouterParam(event, 'tableSlug')
  const body = await readBody<Record<string, any>>(event)

  if (!app) {
    throw createError({ statusCode: 500, message: 'App context not found. Middleware error.' })
  }

  if (!tableSlug) {
    throw createError({ statusCode: 400, message: 'Table slug is required' })
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

  // Get column definitions
  const columns = await db
    .select()
    .from(schema.dataTableColumns)
    .where(eq(schema.dataTableColumns.dataTableId, table.id))
    

  // Validate required fields
  const missingFields = columns
    .filter(col => col.required && !(col.name in body))
    .map(col => col.name)

  if (missingFields.length > 0) {
    throw createError({ 
      statusCode: 400, 
      message: `Missing required fields: ${missingFields.join(', ')}` 
    })
  }

  // Build INSERT SQL dynamically
  if (!validateTableName(table.tableName)) {
    throw createError({ statusCode: 500, message: "Invalid table name" })
  }
  const validatedTableName = table.tableName
  const columnNames: string[] = []
  const columnValues: any[] = []

  for (const col of columns) {
    if (col.name in body) {
      if (!validateColumnName(col.name)) {
        throw createError({ statusCode: 500, message: `Invalid column name: ${col.name}` })
      }
      columnNames.push(col.name)
      columnValues.push(body[col.name])
    }
  }

  if (columnNames.length === 0) {
    throw createError({ statusCode: 400, message: 'No valid data provided' })
  }

  // Execute raw INSERT and return the created row
  // Escape and format values properly
  const formattedValues = columnValues.map(val => {
    if (val === null || val === undefined) return 'NULL'
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
    if (typeof val === 'number') return String(val)
    // Escape single quotes in strings
    return `'${String(val).replace(/'/g, "''")}'`
  }).join(', ')

  const insertSQL = `INSERT INTO "${validatedTableName}" (${columnNames.join(', ')}) VALUES (${formattedValues}) RETURNING *`

  const result = await db.execute(sql.raw(insertSQL))
  
  // Result format from Drizzle execute: array of row objects
  if (!result || result.length === 0) {
    throw createError({ statusCode: 500, message: 'Failed to insert row' })
  }

  const createdRow = result[0]
  const rowId = createdRow.id

  // Audit log row creation
  await auditRowOperation(event, 'create', rowId, table.id, table.companyId, event.context.user.id, {
    after: body,
  })

  return successResponse(createdRow, { message: 'Row created successfully' })
})

