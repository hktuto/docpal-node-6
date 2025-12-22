import { eventHandler } from 'h3'
import { successResponse } from '~~/server/utils/response'
import { getAllFieldTypes, getFieldTypesByCategory } from '~~/server/utils/fieldTypes'

/**
 * Get all available field types
 * Can optionally filter by category
 */
export default eventHandler(async (event) => {
  const query = getQuery(event)
  const category = query.category as string | undefined
  
  const fieldTypes = category 
    ? getFieldTypesByCategory(category)
    : getAllFieldTypes()
  
  // Format for frontend consumption
  const formatted = fieldTypes.map(type => ({
    name: type.name,
    label: type.label,
    description: type.description,
    category: type.category,
    defaultConfig: type.defaultConfig,
    configSchema: type.configSchema,
    aiHints: type.aiHints
  }))
  
  return successResponse(formatted)
})

