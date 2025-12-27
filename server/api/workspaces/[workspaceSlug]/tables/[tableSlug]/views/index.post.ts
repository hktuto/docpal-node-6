import { db } from 'hub:db'
import { dataTableViews, dataTables, dataTableColumns } from 'hub:db:schema'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { requireCompany } from '~~/server/utils/auth/getCurrentUser'
import { successResponse } from '~~/server/utils/response'
import { validateFilters, validateSorts } from '~~/server/utils/viewQueryBuilder'
import { generateUUID } from '~~/server/utils/uuid'

/**
 * Create a new view for a table
 */
export default defineEventHandler(async (event) => {
  const user = requireCompany(event)
  const workspace = event.context.workspace
  const tableSlug = getRouterParam(event, 'tableSlug')

  if (!workspace) {
    throw createError({ statusCode: 500, message: 'Workspace context not found' })
  }

  if (!tableSlug) {
    throw createError({ statusCode: 400, message: 'Table slug is required' })
  }

  const body = await readBody(event)
  const {
    name,
    description,
    viewType = 'grid',
    isDefault = false,
    isShared = false,
    isPublic = false,
    filters,
    sort,
    visibleColumns,
    columnWidths,
    viewConfig,
    pageSize = 50
  } = body

  if (!name) {
    throw createError({ statusCode: 400, message: 'View name is required' })
  }

  try {
    // Get table
    const [table] = await db
      .select()
      .from(dataTables)
      .where(and(
        eq(dataTables.workspaceId, workspace.id),
        eq(dataTables.slug, tableSlug)
      ))
      .limit(1)

    if (!table) {
      throw createError({ statusCode: 404, message: 'Table not found' })
    }

    // Validate filters if provided
    if (filters) {
      const validation = validateFilters(filters)
      if (!validation.valid) {
        throw createError({
          statusCode: 400,
          message: `Invalid filters: ${validation.errors.join(', ')}`
        })
      }
    }

    // Validate sort if provided
    if (sort) {
      const validation = validateSorts(sort)
      if (!validation.valid) {
        throw createError({
          statusCode: 400,
          message: `Invalid sort configuration: ${validation.errors.join(', ')}`
        })
      }
    }

    // Generate slug
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${nanoid(6)}`

    // If this is set as default, unset other defaults
    if (isDefault) {
      await db
        .update(dataTableViews)
        .set({ isDefault: false })
        .where(eq(dataTableViews.dataTableId, table.id))
    }

    // Create view
    const [view] = await db
      .insert(dataTableViews)
      .values({
        id: generateUUID(),
        dataTableId: table.id,
        name,
        slug,
        description,
        viewType,
        isDefault,
        isShared,
        isPublic,
        filters,
        sort,
        visibleColumns,
        columnWidths,
        viewConfig,
        pageSize,
        createdBy: user.id
      })
      .returning()

    return successResponse(view)
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error creating view:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to create view'
    })
  }
})

