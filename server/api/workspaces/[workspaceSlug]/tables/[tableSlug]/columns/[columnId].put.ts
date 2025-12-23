import { eventHandler, readBody, createError, getRouterParam } from 'h3'
import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'
import { getFieldType } from '~~/server/utils/fieldTypes'

/**
 * Update an existing column
 */
export default eventHandler(async (event) => {
  const workspaceSlug = getRouterParam(event, 'workspaceSlug')
  const tableSlug = getRouterParam(event, 'tableSlug')
  const columnId = getRouterParam(event, 'columnId')
  const body = await readBody(event)

  if (!workspaceSlug || !tableSlug || !columnId) {
    throw createError({ statusCode: 400, message: 'Workspace slug, table slug, and column ID are required' })
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

  // Get existing column
  const column = await db
    .select()
    .from(schema.dataTableColumns)
    .where(and(
      eq(schema.dataTableColumns.id, columnId),
      eq(schema.dataTableColumns.dataTableId, table.id)
    ))
    .limit(1)
    .then(rows => rows[0])

  if (!column) {
    throw createError({ statusCode: 404, message: 'Column not found' })
  }

  try {
    const { label, type, required, config } = body

    // Validate field type
    if (type && type !== column.type) {
      throw createError({ statusCode: 400, message: 'Cannot change column type after creation' })
    }

    // Get field type definition
    const fieldType = getFieldType(column.type)
    if (!fieldType) {
      throw createError({ statusCode: 400, message: `Invalid field type: ${column.type}` })
    }

    // Validate config
    if (config && fieldType.validate) {
      const validation = fieldType.validate(null, config)
      if (!validation.valid) {
        throw createError({ statusCode: 400, message: validation.error || 'Invalid field configuration' })
      }
    }

    // Update column metadata
    const [updatedColumn] = await db
      .update(schema.dataTableColumns)
      .set({
        label: label || column.label,
        required: required !== undefined ? required : column.required,
        config: config || column.config,
        updatedAt: new Date()
      })
      .where(eq(schema.dataTableColumns.id, columnId))
      .returning()

    // Update physical column if needed
    if (required !== undefined && required !== column.required) {
      if (required) {
        // Add NOT NULL constraint
        await db.execute(`
          ALTER TABLE "${table.tableName}"
          ALTER COLUMN "${column.name}" SET NOT NULL
        `)
      } else {
        // Remove NOT NULL constraint
        await db.execute(`
          ALTER TABLE "${table.tableName}"
          ALTER COLUMN "${column.name}" DROP NOT NULL
        `)
      }
    }

    console.log(`✅ Updated column: ${column.name} in table: ${table.name}`)

    return successResponse(updatedColumn)
  } catch (error) {
    console.error('❌ Failed to update column:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to update column'
    })
  }
})
