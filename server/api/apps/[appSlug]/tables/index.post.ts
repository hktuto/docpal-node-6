import { eventHandler, readBody, createError } from 'h3'
import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'
import { generateUniqueSlug } from '#shared/utils/slug'
import { successResponse } from '~~/server/utils/response'
import { generatePhysicalTableName } from '~~/server/utils/dynamicTable'
import { createPhysicalTable } from '~~/server/utils/tableOperations'
import type { TableColumnDef } from '#shared/types/db'

// Helper to generate a human-friendly label from a column name
function generateLabel(name: string): string {
  return name
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\b\w/g, char => char.toUpperCase()) // Capitalize first letter of each word
}

/**
 * Create a new dynamic table in an app
 * App and company context provided by middleware
 */
export default eventHandler(async (event) => {
  const app = event.context.app
  const companyId = event.context.companyId
  const body = await readBody<{
    name: string
    description?: string
    columns: TableColumnDef[]
  }>(event)

  if (!app || !companyId) {
    throw createError({
      statusCode: 500,
      message: 'App/Company context not found. Middleware error.'
    })
  }

  if (!body.name) {
    throw createError({
      statusCode: 400,
      message: 'Table name is required'
    })
  }

  if (!body.columns || body.columns.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'At least one column is required'
    })
  }

  // Generate slug for table (unique per app)
  // Get existing table slugs in this app
  const existingTables = await db
    .select({ slug: schema.dataTables.slug })
    .from(schema.dataTables)
    .where(eq(schema.dataTables.appId, app.id))

  const existingSlugs = existingTables.map(t => t.slug)
  const slug = generateUniqueSlug(body.name, existingSlugs)

  // Generate a temporary table ID for physical table name
  const tempTableId = crypto.randomUUID()
  const physicalTableName = generatePhysicalTableName(companyId, tempTableId)

  try {
    // Step 1: Create physical PostgreSQL table
    await createPhysicalTable(physicalTableName, body.columns)

    // Step 2: Create metadata entry
    const [newTable] = await db
      .insert(schema.dataTables)
      .values({
        id: tempTableId,
        name: body.name,
        slug,
        tableName: physicalTableName,
        appId: app.id,
        companyId,
        schema: body.columns,
      })
      .returning()

    // Step 3: Create column entries (for easier querying)
    if (body.columns.length > 0) {
      await db.insert(schema.dataTableColumns).values(
        body.columns.map((col, index) => ({
          dataTableId: newTable.id,
          name: col.name,
          label: col.label || generateLabel(col.name), // Auto-generate label if not provided
          type: col.type,
          required: col.required ?? false,
          order: col.order ?? index,
          config: col.config || null,
        }))
      )
    }

    console.log(`✅ Created table: ${body.name} (${physicalTableName})`)

    return successResponse(newTable, { message: 'Table created successfully' })
  } catch (error) {
    console.error('❌ Failed to create table:', error)
    
    // If physical table was created but metadata failed, we should clean up
    // For now, just log the error
    
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to create table'
    })
  }
})

