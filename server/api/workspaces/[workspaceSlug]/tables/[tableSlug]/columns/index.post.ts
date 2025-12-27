import { eventHandler, readBody, createError, getRouterParam } from 'h3'
import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'
import { getFieldType } from '~~/server/utils/fieldTypes'
import { createForeignKey } from '~~/server/utils/relationHelpers'
import { generateSlug } from '#shared/utils/slug'
import { generateUUID } from '~~/server/utils/uuid'

/**
 * Create a new column in a table
 */
export default eventHandler(async (event) => {
  const workspaceSlug = getRouterParam(event, 'workspaceSlug')
  const tableSlug = getRouterParam(event, 'tableSlug')
  const body = await readBody(event)

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
    const { name, label, type, required, config } = body

    if (!name || !label || !type) {
      throw createError({ statusCode: 400, message: 'Name, label, and type are required' })
    }

    // Get field type definition
    const fieldType = getFieldType(type)
    if (!fieldType) {
      throw createError({ statusCode: 400, message: `Invalid field type: ${type}` })
    }

    // Validate config
    if (fieldType.validate) {
      const validation = fieldType.validate(null, config)
      if (!validation.valid) {
        throw createError({ statusCode: 400, message: validation.error || 'Invalid field configuration' })
      }
    }

    // Get highest order
    const existingColumns = await db
      .select()
      .from(schema.dataTableColumns)
      .where(eq(schema.dataTableColumns.dataTableId, table.id))

    const maxOrder = existingColumns.reduce((max, col) => Math.max(max, col.order), 0)

    // Create column metadata
    const [newColumn] = await db
      .insert(schema.dataTableColumns)
      .values({
        id: generateUUID(),
        dataTableId: table.id,
        name,
        label,
        type,
        required: required || false,
        order: maxOrder + 1,
        config: config || {},
        createdBy: event.context.user?.id
      })
      .returning()

    // Add physical column to table
    const pgType = fieldType.pgType(config)
    
    if (type === 'relation') {
      // For relations, add UUID column first
      await db.execute(`
        ALTER TABLE "${table.tableName}"
        ADD COLUMN "${name}" UUID
      `)

      // Get target table
      const targetTable = await db
        .select()
        .from(schema.dataTables)
        .where(and(
          eq(schema.dataTables.workspaceId, workspace.id),
          eq(schema.dataTables.slug, config.targetTable)
        ))
        .limit(1)
        .then(rows => rows[0])

      if (!targetTable) {
        throw createError({ statusCode: 404, message: 'Target table not found' })
      }

      // Create foreign key constraint
      await createForeignKey(
        table.tableName,
        name,
        targetTable.tableName,
        config.cascadeDelete || 'set_null'
      )
    } else if (type === 'lookup' || type === 'formula') {
      // Lookups and formulas don't add physical columns
      // They are computed on read
    } else {
      // Add regular column
      const nullConstraint = required ? 'NOT NULL' : ''
      await db.execute(`
        ALTER TABLE "${table.tableName}"
        ADD COLUMN "${name}" ${pgType} ${nullConstraint}
      `)
    }

    console.log(`✅ Created column: ${name} (${type}) in table: ${table.name}`)

    return successResponse(newColumn)
  } catch (error) {
    console.error('❌ Failed to create column:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to create column'
    })
  }
})
