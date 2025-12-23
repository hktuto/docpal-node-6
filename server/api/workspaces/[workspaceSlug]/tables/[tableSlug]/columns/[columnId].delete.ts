import { eventHandler, createError, getRouterParam } from 'h3'
import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'
import { dropForeignKey } from '~~/server/utils/relationHelpers'

/**
 * Delete a column
 */
export default eventHandler(async (event) => {
  const workspaceSlug = getRouterParam(event, 'workspaceSlug')
  const tableSlug = getRouterParam(event, 'tableSlug')
  const columnId = getRouterParam(event, 'columnId')

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

  // Get column
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
    // If it's a relation, drop the foreign key first
    if (column.type === 'relation') {
      await dropForeignKey(table.tableName, column.name)
    }

    // Delete from physical table (unless it's a computed field)
    if (column.type !== 'lookup' && column.type !== 'formula') {
      await db.execute(`
        ALTER TABLE "${table.tableName}"
        DROP COLUMN "${column.name}"
      `)
    }

    // Delete from metadata
    await db
      .delete(schema.dataTableColumns)
      .where(eq(schema.dataTableColumns.id, columnId))

    console.log(`✅ Deleted column: ${column.name} from table: ${table.name}`)

    return successResponse({
      message: 'Column deleted successfully'
    })
  } catch (error) {
    console.error('❌ Failed to delete column:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to delete column'
    })
  }
})
