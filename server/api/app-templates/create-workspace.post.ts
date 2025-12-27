import { db } from 'hub:db'
import { workspaces, dataTables, dataTableColumns, dataTableViews, appTemplates } from 'hub:db:schema'
import { eq, sql, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import type { AppTemplateDefinition, MenuItem } from '#shared/types/db'
import { requireCompany } from '~~/server/utils/auth/getCurrentUser'
import { successResponse } from '~~/server/utils/response'
import { auditWorkspaceOperation } from '~~/server/utils/audit'
import { generatePhysicalTableName } from '~~/server/utils/dynamicTable'
import { generateUUID } from '~~/server/utils/uuid'

/**
 * Helper: Update menu items with actual table IDs after table creation
 */
function updateMenuWithTableIds(
  menu: MenuItem[],
  tableSlugToIdMap: Map<string, string>
): MenuItem[] {
  return menu.map(item => {
    const updated = { ...item }
    
    // If this is a table menu item, link it to the actual table
    if (item.type === 'table' && item.slug) {
      const tableId = tableSlugToIdMap.get(item.slug)
      if (tableId) {
        updated.itemId = tableId
      }
    }
    
    // Recursively update children
    if (item.children) {
      updated.children = updateMenuWithTableIds(item.children, tableSlugToIdMap)
    }
    
    return updated
  })
}

export default defineEventHandler(async (event) => {
  const user = requireCompany(event)
  const body = await readBody(event)
  
  const {
    templateId,
    name, // Workspace name
    slug: customSlug, // Optional custom slug
    description,
    includeSampleData // Override template default
  } = body

  if (!templateId) {
    throw createError({
      statusCode: 400,
      message: 'Template ID is required'
    })
  }

  if (!name) {
    throw createError({
      statusCode: 400,
      message: 'Workspace name is required'
    })
  }

  try {
    // Get template
    const [template] = await db
      .select()
      .from(appTemplates)
      .where(eq(appTemplates.id, templateId))
      .limit(1)

    if (!template) {
      throw createError({
        statusCode: 404,
        message: 'Template not found'
      })
    }

    // Check access
    const hasAccess = 
      template.visibility === 'system' ||
      template.visibility === 'public' ||
      (template.visibility === 'company' && template.companyId === user.company.id) ||
      (template.visibility === 'personal' && template.createdBy === user.id)

    if (!hasAccess) {
      throw createError({
        statusCode: 403,
        message: 'You do not have permission to use this template'
      })
    }

    // Create workspace
    // Use custom slug or generate from name (without random suffix since slugs are unique per company)
    let slug = customSlug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    
    // Check if slug already exists in this company
    const existingWorkspace = await db
      .select()
      .from(workspaces)
      .where(and(
        eq(workspaces.slug, slug),
        eq(workspaces.companyId, user.company.id)
      ))
      .limit(1)
    
    // If slug exists, add a suffix
    if (existingWorkspace.length > 0) {
      slug = `${slug}-${nanoid(6)}`
    }
    
    const [workspace] = await db
      .insert(workspaces)
      .values({
        id: generateUUID(),
        name,
        slug,
        description: description || template.description,
        icon: template.icon,
        companyId: user.company.id,
        menu: [] // Will be updated after tables are created
      })
      .returning()

    const templateDef = template.templateDefinition as AppTemplateDefinition
    const shouldIncludeSampleData = includeSampleData ?? template.includesSampleData
    
    console.log('📊 Sample Data Config:')
    console.log('  - includeSampleData (from request):', includeSampleData)
    console.log('  - template.includesSampleData:', template.includesSampleData)
    console.log('  - shouldIncludeSampleData (final):', shouldIncludeSampleData)

    // Map to store table slug -> table ID for menu linking
    const tableSlugToIdMap = new Map<string, string>()

    // Create tables from template
    for (const tableDef of templateDef.tables) {
      const tableSlug = tableDef.slug || `${tableDef.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${nanoid(6)}`
      
      // Create table record first to get the ID
      const [table] = await db
        .insert(dataTables)
        .values({
          id: generateUUID(),
          name: tableDef.name,
          slug: tableSlug,
          tableName: '', // Temporary, will update after generating physical name
          workspaceId: workspace.id,
          companyId: user.company.id,
          description: tableDef.description
        })
        .returning()

      // Generate physical table name using company ID and table ID
      const physicalTableName = generatePhysicalTableName(user.company.id, table.id)
      
      // Update table record with physical name
      await db
        .update(dataTables)
        .set({ tableName: physicalTableName })
        .where(eq(dataTables.id, table.id))

      // Store slug -> ID mapping for menu linking
      tableSlugToIdMap.set(tableSlug, table.id)

      // Create physical table
      const columnDefs = tableDef.columns.map(col => {
        let sqlType = 'TEXT'
        switch (col.type) {
          case 'number':
            sqlType = 'NUMERIC'
            break
          case 'date':
            sqlType = 'DATE'
            break
          case 'datetime':
            sqlType = 'TIMESTAMP'
            break
          case 'switch':
            sqlType = 'BOOLEAN'
            break
          case 'url':
          case 'email':
          case 'phone':
          case 'select':
          case 'multi-select':
          case 'rating':
          case 'currency':
          case 'location':
          case 'relation':
            sqlType = 'JSONB'
            break
        }
        
        const nullable = col.required ? 'NOT NULL' : 'NULL'
        return `"${col.name}" ${sqlType} ${nullable}`
      }).join(', ')

      await db.execute(sql.raw(`
        CREATE TABLE ${physicalTableName} (
          id UUID PRIMARY KEY,
          ${columnDefs},
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `))

      // Create columns and collect their IDs
      const createdColumnIds: string[] = []
      for (const col of tableDef.columns) {
        const [createdCol] = await db
          .insert(dataTableColumns)
          .values({
            id: generateUUID(),
            dataTableId: table.id,
            name: col.name,
            label: col.label || col.name,
            type: col.type,
            required: col.required || false,
            order: col.order || 0,
            config: col.config
          })
          .returning()
        
        createdColumnIds.push(createdCol.id)
      }
      
      // Create views if included in template
      let hasDefaultView = false
      if (template.includesViews && tableDef.views && tableDef.views.length > 0) {
        for (let i = 0; i < tableDef.views.length; i++) {
          const viewDef = tableDef.views[i]
          // First view is default if not specified
          const isDefault = (i === 0 && !hasDefaultView)
          if (isDefault) hasDefaultView = true
          
          await db
            .insert(dataTableViews)
            .values({
              id: generateUUID(),
              dataTableId: table.id,
              name: viewDef.name,
              viewType: viewDef.viewType || 'grid',
              isDefault: isDefault,
              filters: viewDef.filterJson || { operator: 'AND', conditions: [] },
              sort: viewDef.sortJson || [],
              visibleColumns: viewDef.visibleColumns || createdColumnIds, // Use actual column IDs
              createdBy: user.id
            })
        }
      }
      
      // If no default view was created, create one
      if (!hasDefaultView) {
        await db
          .insert(dataTableViews)
          .values({
            id: generateUUID(),
            dataTableId: table.id,
            name: 'All Records',
            slug: 'all-records',
            viewType: 'grid',
            isDefault: true,
            visibleColumns: createdColumnIds, // Use actual column IDs
            sort: [],
            filters: { operator: 'AND', conditions: [] },
            viewConfig: {
              rowHeight: 'default',
              showRowNumbers: true,
            },
            createdBy: user.id
          })
      }

      // Import sample data if included
      console.log(`🔍 Checking sample data for ${tableDef.name}:`)
      console.log(`  - shouldIncludeSampleData: ${shouldIncludeSampleData}`)
      console.log(`  - has sampleData: ${!!tableDef.sampleData}`)
      console.log(`  - sampleData length: ${tableDef.sampleData?.length || 0}`)
      
      if (shouldIncludeSampleData && tableDef.sampleData && tableDef.sampleData.length > 0) {
        console.log(`📊 Importing ${tableDef.sampleData.length} sample rows for ${tableDef.name}...`)
        
        for (const rowData of tableDef.sampleData) {
          // Use provided ID or generate a new one
          const rowId = rowData.id || generateUUID()
          
          // Only include columns that have values in the sample data (excluding id, it's handled separately)
          const columnNames = Object.keys(rowData).filter(key => 
            key !== 'id' && rowData[key] !== undefined
          )
          
          if (columnNames.length === 0) {
            console.warn(`⚠️  Skipping empty sample row for ${tableDef.name}`)
            continue
          }
          
          // Build SQL for insert
          const formattedValues = columnNames.map(colName => {
            const value = rowData[colName]
            
            // Find column definition to check type
            const colDef = tableDef.columns.find(c => c.name === colName)
            
            if (value === null) {
              return 'NULL'
            }
            
            // Handle JSONB columns (select, multi-select, url, email, phone, rating, currency, location, relation)
            if (colDef && ['select', 'multi-select', 'url', 'email', 'phone', 'rating', 'currency', 'location', 'relation'].includes(colDef.type)) {
              return `'${JSON.stringify(value)}'::jsonb`
            }
            
            // Handle boolean
            if (typeof value === 'boolean') {
              return value ? 'true' : 'false'
            }
            
            // Handle numbers
            if (typeof value === 'number') {
              return value.toString()
            }
            
            // Handle strings (escape single quotes)
            if (typeof value === 'string') {
              return `'${value.replace(/'/g, "''")}'`
            }
            
            // Default: stringify and wrap in quotes
            return `'${String(value).replace(/'/g, "''")}'`
          }).join(', ')
          
          const insertSQL = `
            INSERT INTO ${physicalTableName} (id, ${columnNames.join(', ')}, created_at, updated_at)
            VALUES ('${rowId}', ${formattedValues}, NOW(), NOW())
          `
          
          try {
            await db.execute(sql.raw(insertSQL))
            console.log(`  ✓ Inserted row with id: ${rowId}`)
          } catch (error) {
            console.error(`  ❌ Failed to insert sample row:`, error)
            console.error(`  SQL: ${insertSQL}`)
            // Continue with other rows even if one fails
          }
        }
        
        console.log(`✅ Completed sample data import for ${tableDef.name}`)
      }
    }

    // Update workspace menu with actual table IDs
    let updatedWorkspace = workspace
    if (templateDef.menu && templateDef.menu.length > 0) {
      console.log('📋 Template menu:', JSON.stringify(templateDef.menu, null, 2))
      console.log('🗺️  Table slug map:', Object.fromEntries(tableSlugToIdMap))
      
      const menuWithIds = updateMenuWithTableIds(templateDef.menu, tableSlugToIdMap)
      console.log('✅ Menu with IDs:', JSON.stringify(menuWithIds, null, 2))
      
      const [updated] = await db
        .update(workspaces)
        .set({ menu: menuWithIds })
        .where(eq(workspaces.id, workspace.id))
        .returning()
      
      console.log('💾 Updated workspace menu:', JSON.stringify(updated.menu, null, 2))
      updatedWorkspace = updated
    } else {
      console.log('⚠️  No menu in template definition')
    }

    // Increment usage count
    await db
      .update(appTemplates)
      .set({ usageCount: template.usageCount + 1 })
      .where(eq(appTemplates.id, templateId))

    // Log audit
    await auditWorkspaceOperation(
      event,
      'create',
      workspace.id,
      user.company.id,
      user.id,
      {
        after: {
          workspaceName: name,
          templateId,
          templateName: template.name,
          tableCount: templateDef.tables.length
        }
      }
    )

    return successResponse(updatedWorkspace)
  } catch (error: any) {
    if (error.statusCode) throw error
    
    console.error('Error creating workspace from template:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to create workspace from template'
    })
  }
})

