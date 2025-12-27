import { successResponse } from '~~/server/utils/response'
import { seedAdvancedTemplate, getTemplateStats } from '~~/server/utils/seedTemplates'

/**
 * Seed Advanced CRM Template
 * 
 * Demonstrates all advanced field types:
 * - Relations (linking between tables)
 * - Lookups (getting values from related records)
 * - Rollups/Aggregations (COUNT, SUM, MAX, MIN, AVG)
 * - Formulas (calculated fields)
 * 
 * This creates a complete CRM with:
 * - Companies
 * - Contacts (with relation to Companies + lookup)
 * - Deals (with relations to Companies & Contacts + formulas)
 * - Activities (polymorphic relations)
 * - Company_Stats (aggregations/rollups)
 * 
 * Usage:
 * POST /api/seed-templates-advanced
 * 
 * Query params:
 * - update=true : Update if exists
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const shouldUpdate = query.update === 'true'

  try {
    console.log('📦 Seeding advanced CRM template...')
    
    // Seed template
    const result = await seedAdvancedTemplate({
      skipExisting: !shouldUpdate,
      updateExisting: shouldUpdate
    })

    // Get stats
    const stats = await getTemplateStats()

    return successResponse({
      seeded: {
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        total: result.templates.length
      },
      stats,
      template: result.templates[0] ? {
        id: result.templates[0].id,
        name: result.templates[0].name,
        tables: result.templates[0].templateDefinition?.tables?.length || 0,
        features: [
          'Relations',
          'Lookups',
          'Rollups/Aggregations',
          'Formulas',
          'Sample Data'
        ]
      } : null
    }, {
      message: result.created > 0
        ? 'Advanced CRM template seeded successfully'
        : 'Advanced template already exists'
    })
  } catch (error: any) {
    console.error('Advanced template seeding error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to seed advanced template'
    })
  }
})

