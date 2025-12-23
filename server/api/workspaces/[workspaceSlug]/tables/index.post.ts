import { eventHandler, readBody, createError } from 'h3'
import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'
import { generateUniqueSlug } from '#shared/utils/slug'
import { auditTableOperation } from '~~/server/utils/audit'
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
 * Generate default columns for a new table
 * System columns (id, created_at, updated_at) are automatically added by createPhysicalTable
 * We add a default "name" column as the first user-facing field
 */
function generateDefaultColumns(): TableColumnDef[] {
  return [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      order: 0,
      config: {
        placeholder: 'Enter name...',
      }
    }
  ]
}

/**
 * Create a new dynamic table in a workspace
 * Workspace context provided by middleware, company from user session
 * 
 * Now simplified: only requires table name and optional description
 * Default columns are auto-generated
 */
export default eventHandler(async (event) => {
  const workspace = event.context.workspace
  const user = event.context.user
  const body = await readBody<{
    name: string
    description?: string
    columns?: TableColumnDef[] // Now optional
  }>(event)

  if (!workspace || !user?.company) {
    throw createError({
      statusCode: 500,
      message: 'Workspace/Company context not found. Middleware error.'
    })
  }

  const companyId = user.company.id

  if (!body.name) {
    throw createError({
      statusCode: 400,
      message: 'Table name is required'
    })
  }

  // Use provided columns or generate defaults
  const columns = body.columns && body.columns.length > 0 
    ? body.columns 
    : generateDefaultColumns()

  // Generate slug for table (unique per workspace)
  // Get existing table slugs in this workspace
  const existingTables = await db
    .select({ slug: schema.dataTables.slug })
    .from(schema.dataTables)
    .where(eq(schema.dataTables.workspaceId, workspace.id))

  const existingSlugs = existingTables.map(t => t.slug)
  const slug = generateUniqueSlug(body.name, existingSlugs)

  // Generate a temporary table ID for physical table name
  const tempTableId = crypto.randomUUID()
  const physicalTableName = generatePhysicalTableName(companyId, tempTableId)

  try {
    // Step 1: Create physical PostgreSQL table
    await createPhysicalTable(physicalTableName, columns)

    // Step 2: Create metadata entry
    const [newTable] = await db
      .insert(schema.dataTables)
      .values({
        id: tempTableId,
        name: body.name,
        slug,
        tableName: physicalTableName,
        workspaceId: workspace.id,
        companyId,
        description: body.description,
      })
      .returning()

    // Step 3: Create column entries (for easier querying)
    let columnIds: string[] = []
    if (columns.length > 0) {
      const createdColumns = await db.insert(schema.dataTableColumns).values(
        columns.map((col, index) => ({
          dataTableId: newTable.id,
          name: col.name,
          label: col.label || generateLabel(col.name), // Auto-generate label if not provided
          type: col.type,
          required: col.required ?? false,
          order: col.order ?? index,
          config: col.config || null,
        }))
      ).returning()
      
      columnIds = createdColumns.map(col => col.id)
    }

    // Step 4: Create default table view
    await db.insert(schema.dataTableViews).values({
      dataTableId: newTable.id,
      name: 'All Records',
      slug: 'all-records',
      type: 'table',
      isDefault: true,
      visibleColumns: columnIds, // Show all columns by default
      sort: [], // No default sorting
      filters: { operator: 'AND', conditions: [] }, // No filters
      viewConfig: {
        rowHeight: 'default',
        showRowNumbers: true,
      },
      createdBy: user.id,
    })

    console.log(`✅ Created table: ${body.name} (${physicalTableName}) with default view`)

    // Audit log table creation
    await auditTableOperation(event, 'create', newTable.id, companyId, user.id, {
      after: {
        name: newTable.name,
        slug: newTable.slug,
        description: newTable.description,
        columns: columns,
      },
    })

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

