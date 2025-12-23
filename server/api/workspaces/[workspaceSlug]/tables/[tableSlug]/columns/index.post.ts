import { eventHandler, readBody, createError, getRouterParam } from 'h3'
import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'
import { sql } from 'drizzle-orm'
import { getPostgresType, validateFieldValue } from '~~/server/utils/fieldTypes'

/**
 * SQL reserved keywords to avoid as column names
 */
const SQL_RESERVED_WORDS = new Set([
  'select', 'insert', 'update', 'delete', 'from', 'where', 'join', 'inner', 'outer',
  'left', 'right', 'on', 'as', 'table', 'column', 'index', 'key', 'primary', 'foreign',
  'constraint', 'default', 'null', 'not', 'and', 'or', 'in', 'between', 'like', 'order',
  'by', 'group', 'having', 'limit', 'offset', 'union', 'case', 'when', 'then', 'else',
  'end', 'exists', 'all', 'any', 'some', 'true', 'false', 'user', 'system', 'session'
])

// PostgreSQL type mapping now handled by fieldTypes registry

/**
 * Add a new column to a data table
 */
export default eventHandler(async (event) => {
  const workspace = event.context.workspace
  const tableSlug = getRouterParam(event, 'tableSlug')
  const body = await readBody<{
    name: string
    label: string
    type: string
    required?: boolean
    config?: any
    position?: number // Index where column should be inserted
  }>(event)

  if (!workspace) {
    throw createError({ statusCode: 500, message: 'Workspace context not found. Middleware error.' })
  }

  if (!tableSlug) {
    throw createError({ statusCode: 400, message: 'Table slug is required' })
  }

  // Validate required fields
  if (!body.name || !body.label || !body.type) {
    throw createError({ 
      statusCode: 400, 
      message: 'Column name, label, and type are required' 
    })
  }

  // Validate column name format
  const columnNameRegex = /^[a-z][a-z0-9_]*$/
  if (!columnNameRegex.test(body.name)) {
    throw createError({
      statusCode: 400,
      message: 'Column name must start with a letter and contain only lowercase letters, numbers, and underscores'
    })
  }

  // Check for reserved words
  if (SQL_RESERVED_WORDS.has(body.name.toLowerCase())) {
    throw createError({
      statusCode: 400,
      message: `"${body.name}" is a reserved SQL keyword and cannot be used as a column name`
    })
  }

  // Get table metadata
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

  // Check if column name already exists
  const existingColumn = await db
    .select()
    .from(schema.dataTableColumns)
    .where(and(
      eq(schema.dataTableColumns.dataTableId, table.id),
      eq(schema.dataTableColumns.name, body.name)
    ))
    .limit(1)
    .then(rows => rows[0])

  if (existingColumn) {
    throw createError({
      statusCode: 409,
      message: `Column "${body.name}" already exists in this table`
    })
  }

  try {
    // Get all existing columns to determine order
    const existingColumns = await db
      .select()
      .from(schema.dataTableColumns)
      .where(eq(schema.dataTableColumns.dataTableId, table.id))
      .orderBy(schema.dataTableColumns.order)

    // Calculate new column order (use position if provided, otherwise append to end)
    const newOrder = body.position !== undefined ? body.position : existingColumns.length

    // Get PostgreSQL type
    const pgType = getPostgresType(body.type, body.config)
    const nullable = !body.required
    const defaultValue = body.config?.defaultValue

    // Create column in metadata
    const [newColumn] = await db
      .insert(schema.dataTableColumns)
      .values({
        dataTableId: table.id,
        name: body.name,
        label: body.label,
        type: body.type,
        required: body.required || false,
        order: newOrder,
        config: body.config || {},
        createdBy: event.context.user?.id
      })
      .returning()

    // Build ALTER TABLE statement
    let alterStatement = `ALTER TABLE "${table.tableName}" ADD COLUMN "${body.name}" ${pgType}`
    
    if (!nullable) {
      if (defaultValue !== undefined) {
        alterStatement += ` DEFAULT '${defaultValue}'`
      }
      alterStatement += ' NOT NULL'
    } else if (defaultValue !== undefined) {
      alterStatement += ` DEFAULT '${defaultValue}'`
    }

    // Execute ALTER TABLE
    console.log(`🔧 Executing: ${alterStatement}`)
    await db.execute(sql.raw(alterStatement))

    // Update column orders if we inserted in the middle
    if (body.position && newOrder < existingColumns.length) {
      for (let i = newOrder; i < existingColumns.length; i++) {
        await db
          .update(schema.dataTableColumns)
          .set({ order: i + 1 })
          .where(eq(schema.dataTableColumns.id, existingColumns[i].id))
      }
    }

    console.log(`✅ Added column "${body.name}" to table: ${table.name}`)

    return successResponse(newColumn, 'Column added successfully')
  } catch (error: any) {
    console.error('❌ Failed to add column:', error)
    
    // Try to rollback metadata if physical table operation failed
    if (error.message?.includes('relation') || error.message?.includes('column')) {
      throw createError({
        statusCode: 500,
        message: `Failed to add column to physical table: ${error.message}`
      })
    }
    
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to add column'
    })
  }
})

