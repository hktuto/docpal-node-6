import { db } from 'hub:db'
import { workspaces, dataTables, dataTableColumns, dataTableViews, appTemplates } from 'hub:db:schema'
import { eq, sql } from 'drizzle-orm'
import type { AppTemplateDefinition, TemplateTableDefinition } from '#shared/types/db'
import { requireCompany } from '~~/server/utils/auth/getCurrentUser'
import { successResponse } from '~~/server/utils/response'
import { auditTemplateOperation } from '~~/server/utils/audit'
import { generateUUID } from '~~/server/utils/uuid'

export default defineEventHandler(async (event) => {
  const user = requireCompany(event)
  const workspaceSlug = getRouterParam(event, 'workspaceSlug')

  if (!workspaceSlug) {
    throw createError({
      statusCode: 400,
      message: 'Workspace slug is required'
    })
  }

  const body = await readBody(event)
  const {
    name,
    description,
    icon,
    coverImage,
    category,
    tags = [],
    visibility = 'personal', // 'personal', 'company', 'public'
    includeSampleData = false,
    includeViews = true
  } = body

  if (!name) {
    throw createError({
      statusCode: 400,
      message: 'Template name is required'
    })
  }

  try {
    // Get workspace
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.slug, workspaceSlug))
      .limit(1)

    if (!workspace) {
      throw createError({
        statusCode: 404,
        message: 'Workspace not found'
      })
    }

    // Check permission (must be in the workspace's company)
    if (workspace.companyId !== user.company.id) {
      throw createError({
        statusCode: 403,
        message: 'You do not have permission to access this workspace'
      })
    }

    // Get all tables in workspace
    const tables = await db
      .select()
      .from(dataTables)
      .where(eq(dataTables.workspaceId, workspace.id))

    if (tables.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'Cannot create template from empty workspace'
      })
    }

    // Build template definition
    const templateDefinition: AppTemplateDefinition = {
      menu: workspace.menu || [],  // Include workspace menu structure
      tables: []
    }

    for (const table of tables) {
      // Get columns
      const columns = await db
        .select()
        .from(dataTableColumns)
        .where(eq(dataTableColumns.dataTableId, table.id))
        .orderBy(dataTableColumns.order)

      const tableDefinition: TemplateTableDefinition = {
        name: table.name,
        slug: table.slug,
        description: table.description || undefined,
        columns: columns.map(col => ({
          name: col.name,
          label: col.label,
          type: col.type,
          required: col.required,
          order: col.order,
          config: col.config || undefined
        }))
      }

      // Include views if requested
      if (includeViews) {
        const views = await db
          .select()
          .from(dataTableViews)
          .where(eq(dataTableViews.dataTableId, table.id))

        if (views.length > 0) {
          tableDefinition.views = views.map(view => ({
            name: view.name,
            viewType: view.viewType,
            filterJson: view.filterJson,
            sortJson: view.sortJson,
            visibleColumns: view.visibleColumns || undefined
          }))
        }
      }

      // Include sample data if requested
      if (includeSampleData) {
        try {
          const sampleData = await db.execute(
            sql.raw(`SELECT * FROM ${table.tableName} LIMIT 10`)
          )
          tableDefinition.sampleData = sampleData as any[]
        } catch (error) {
          console.warn(`Could not fetch sample data for table ${table.name}:`, error)
          // Continue without sample data
        }
      }

      templateDefinition.tables.push(tableDefinition)
    }

    // Create template
    const [template] = await db
      .insert(appTemplates)
      .values({
        id: generateUUID(),
        name,
        description,
        icon: icon || workspace.icon,
        coverImage,
        category,
        tags,
        createdFromAppId: workspace.id,
        createdBy: user.id,
        companyId: visibility === 'personal' ? user.company.id : (visibility === 'company' ? user.company.id : null),
        visibility,
        isFeatured: false,
        templateDefinition,
        includesSampleData: includeSampleData,
        includesViews: includeViews,
        usageCount: 0
      })
      .returning()

    // Log audit
    await auditTemplateOperation(
      event,
      'create',
      template.id,
      user.id,
      user.company.id,
      {
        after: {
          templateName: name,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          tableCount: tables.length,
          visibility
        }
      }
    )

    return successResponse(template)
  } catch (error: any) {
    if (error.statusCode) throw error
    
    console.error('Error creating template:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to create template'
    })
  }
})

