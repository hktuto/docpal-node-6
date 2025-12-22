import { eventHandler, createError, getRouterParam } from 'h3'
import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'
import { sql } from 'drizzle-orm'

/**
 * Delete a column from a data table
 */
export default eventHandler(async (event) => {
  const app = event.context.app
  const tableSlug = getRouterParam(event, 'tableSlug')
  const columnId = getRouterParam(event, 'columnId')

  if (!app) {
    throw createError({ statusCode: 500, message: 'App context not found. Middleware error.' })
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
      eq(schema.dataTables.appId, app.id),
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
      message: `Cannot delete system column "${existingColumn.name}"`
    })
  }

  try {
    // Drop column from physical table
    const dropStatement = `ALTER TABLE "${table.tableName}" DROP COLUMN "${existingColumn.name}"`
    console.log(`🔧 Executing: ${dropStatement}`)
    await db.execute(sql.raw(dropStatement))

    // Remove from metadata
    await db
      .delete(schema.dataTableColumns)
      .where(eq(schema.dataTableColumns.id, columnId))

    // Remove from all views' visibleColumns
    const views = await db
      .select()
      .from(schema.dataTableViews)
      .where(eq(schema.dataTableViews.dataTableId, table.id))

    for (const view of views) {
      const visibleColumns = (view.visibleColumns as string[]) || []
      const filteredColumns = visibleColumns.filter(id => id !== columnId)
      
      if (filteredColumns.length !== visibleColumns.length) {
        await db
          .update(schema.dataTableViews)
          .set({ 
            visibleColumns: filteredColumns,
            updatedAt: new Date()
          })
          .where(eq(schema.dataTableViews.id, view.id))
      }
    }

    console.log(`✅ Deleted column "${existingColumn.name}" from table: ${table.name}`)

    return successResponse(
      { 
        columnId,
        columnName: existingColumn.name 
      }, 
      'Column deleted successfully'
    )
  } catch (error: any) {
    console.error('❌ Failed to delete column:', error)

    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to delete column'
    })
  }
})

