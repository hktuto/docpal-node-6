import { eventHandler, readBody, createError, getRouterParam } from 'h3'
import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'
import { auditTableOperation } from '~~/server/utils/audit'
import { successResponse } from '~~/server/utils/response'

/**
 * Update table metadata (scoped to workspace)
 * Workspace context provided by middleware
 */
export default eventHandler(async (event) => {
  const workspace = event.context.workspace
  const tableSlug = getRouterParam(event, 'tableSlug')
  const body = await readBody<{ name?: string; description?: string; slug?: string }>(event)

  if (!workspace) {
    throw createError({ statusCode: 500, message: 'Workspace context not found. Middleware error.' })
  }

  if (!tableSlug) {
    throw createError({ statusCode: 400, message: 'Table slug is required' })
  }

  // Get existing table with proper scoping
  const existingTable = await db
    .select()
    .from(schema.dataTables)
    .where(and(
      eq(schema.dataTables.workspaceId, workspace.id),
      eq(schema.dataTables.slug, tableSlug)
    ))
    .limit(1)
    .then(rows => rows[0])

  if (!existingTable) {
    throw createError({ statusCode: 404, message: 'Table not found' })
  }

  // Build update object
  const updateData: any = {
    updatedAt: new Date(),
  }

  if (body.name !== undefined) {
    updateData.name = body.name
  }

  if (body.description !== undefined) {
    updateData.description = body.description
  }

  if (body.slug !== undefined) {
    // Validate new slug doesn't conflict within the same workspace
    const slugExists = await db
      .select()
      .from(schema.dataTables)
      .where(and(
        eq(schema.dataTables.workspaceId, workspace.id),
        eq(schema.dataTables.slug, body.slug)
      ))
      .limit(1)
      .then(rows => rows[0])

    if (slugExists && slugExists.id !== existingTable.id) {
      throw createError({ 
        statusCode: 409, 
        message: 'A table with this slug already exists in this workspace' 
      })
    }

    updateData.slug = body.slug
  }

  // Update table metadata
  const [updatedTable] = await db
    .update(schema.dataTables)
    .set(updateData)
    .where(eq(schema.dataTables.id, existingTable.id))
    .returning()

  // Fetch columns
  const columns = await db
    .select()
    .from(schema.dataTableColumns)
    .where(eq(schema.dataTableColumns.dataTableId, updatedTable!.id))
    .orderBy(schema.dataTableColumns.order)

  // Audit log table update
  await auditTableOperation(event, 'update', existingTable.id, existingTable.companyId, event.context.user.id, {
    before: {
      name: existingTable.name,
      slug: existingTable.slug,
      description: existingTable.description,
    },
    after: {
      name: updatedTable.name,
      slug: updatedTable.slug,
      description: updatedTable.description,
    },
  })

  return successResponse({
    ...updatedTable,
    columns,
  }, { message: 'Table updated successfully' })
})

