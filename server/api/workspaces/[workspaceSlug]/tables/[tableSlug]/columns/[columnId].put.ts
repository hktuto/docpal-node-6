import { eventHandler, readBody, createError, getRouterParam } from 'h3'
import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'
import { sql } from 'drizzle-orm'
import { getPostgresType } from '~~/server/utils/fieldTypes'

/**
 * Check if type conversion is safe
 */
function isSafeTypeConversion(fromType: string, toType: string): boolean {
  // Same type is always safe
  if (fromType === toType) return true

  // Safe conversions
  const safeConversions: Record<string, string[]> = {
    'text': ['long_text', 'email', 'phone', 'url'], // text can become longer text or validated text
    'number': ['currency', 'percent', 'rating'], // number with different display
    'date': ['datetime'], // date can add time
    'boolean': ['switch'], // same underlying type
    'switch': ['boolean'],
    'email': ['text', 'long_text'],
    'phone': ['text', 'long_text'],
    'url': ['text', 'long_text'],
    'currency': ['number'],
    'percent': ['number'],
    'rating': ['number'],
  }

  return safeConversions[fromType]?.includes(toType) || false
}

// PostgreSQL type mapping now handled by fieldTypes registry

/**
 * Update an existing column
 */
export default eventHandler(async (event) => {
  const workspace = event.context.workspace
  const tableSlug = getRouterParam(event, 'tableSlug')
  const columnId = getRouterParam(event, 'columnId')
  const body = await readBody<{
    label?: string
    type?: string
    required?: boolean
    config?: any
  }>(event)

  if (!workspace) {
    throw createError({ statusCode: 500, message: 'Workspace context not found. Middleware error.' })
  }

  if (!tableSlug) {
    throw createError({ statusCode: 400, message: 'Table slug is required' })
  }

  if (!columnId) {
    throw createError({ statusCode: 400, message: 'Column ID is required' })
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

  // Get existing column
  const existingColumn = await db
    .select()
    .from(schema.dataTableColumns)
    .where(and(
      eq(schema.dataTableColumns.id, columnId),
      eq(schema.dataTableColumns.dataTableId, table.id)
    ))
    .limit(1)
    .then(rows => rows[0])

  if (!existingColumn) {
    throw createError({ statusCode: 404, message: 'Column not found' })
  }

  // Check if column is protected (system columns)
  const protectedColumns = ['id', 'created_at', 'updated_at', 'created_by']
  if (protectedColumns.includes(existingColumn.name)) {
    throw createError({
      statusCode: 403,
      message: `Cannot modify system column "${existingColumn.name}"`
    })
  }

  try {
    const updates: any = {
      updatedAt: new Date()
    }

    let needsAlterTable = false
    let alterStatements: string[] = []

    // Update label (metadata only)
    if (body.label !== undefined && body.label !== existingColumn.label) {
      updates.label = body.label
    }

    // Update config (metadata only)
    if (body.config !== undefined) {
      updates.config = { ...existingColumn.config, ...body.config }
    }

    // Check type change
    if (body.type !== undefined && body.type !== existingColumn.type) {
      // Validate type conversion
      if (!isSafeTypeConversion(existingColumn.type, body.type)) {
        throw createError({
          statusCode: 400,
          message: `Cannot convert column type from "${existingColumn.type}" to "${body.type}". This conversion may result in data loss.`
        })
      }

      updates.type = body.type
      needsAlterTable = true

      const newPgType = getPostgresType(body.type, body.config || existingColumn.config)
      alterStatements.push(
        `ALTER TABLE "${table.tableName}" ALTER COLUMN "${existingColumn.name}" TYPE ${newPgType} USING "${existingColumn.name}"::${newPgType}`
      )
    }

    // Check required change
    if (body.required !== undefined && body.required !== existingColumn.required) {
      if (body.required && !existingColumn.required) {
        // Making column required - check for NULL values
        const hasNulls = await db.execute(
          sql.raw(`SELECT COUNT(*) as count FROM "${table.tableName}" WHERE "${existingColumn.name}" IS NULL`)
        )
        
        const count = (hasNulls.rows[0] as any)?.count || 0
        if (parseInt(count) > 0) {
          throw createError({
            statusCode: 409,
            message: `Cannot make column required. ${count} rows have NULL values. Please fill in values first.`
          })
        }

        needsAlterTable = true
        alterStatements.push(
          `ALTER TABLE "${table.tableName}" ALTER COLUMN "${existingColumn.name}" SET NOT NULL`
        )
      } else if (!body.required && existingColumn.required) {
        // Making column nullable - usually safe
        needsAlterTable = true
        alterStatements.push(
          `ALTER TABLE "${table.tableName}" ALTER COLUMN "${existingColumn.name}" DROP NOT NULL`
        )
      }

      updates.required = body.required
    }

    // Update metadata
    await db
      .update(schema.dataTableColumns)
      .set(updates)
      .where(eq(schema.dataTableColumns.id, columnId))

    // Execute ALTER TABLE statements if needed
    if (needsAlterTable) {
      for (const statement of alterStatements) {
        console.log(`🔧 Executing: ${statement}`)
        await db.execute(sql.raw(statement))
      }
    }

    // Get updated column
    const updatedColumn = await db
      .select()
      .from(schema.dataTableColumns)
      .where(eq(schema.dataTableColumns.id, columnId))
      .limit(1)
      .then(rows => rows[0])

    console.log(`✅ Updated column "${existingColumn.name}" in table: ${table.name}`)

    return successResponse(updatedColumn, 'Column updated successfully')
  } catch (error: any) {
    console.error('❌ Failed to update column:', error)

    // Specific error handling
    if (error.statusCode) {
      throw error // Re-throw our custom errors
    }

    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to update column'
    })
  }
})

