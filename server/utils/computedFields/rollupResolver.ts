/**
 * Rollup/Aggregation Field Resolver
 * 
 * Resolves rollup fields by aggregating data from related tables.
 * A rollup field performs aggregations (COUNT, SUM, AVG, MIN, MAX) on related records.
 * 
 * Example:
 *   Company_Stats has "company" (relation to Companies)
 *   Company_Stats has "total_contacts" (rollup: COUNT contacts where company = this.company)
 *   Company_Stats has "total_deal_value" (rollup: SUM deals.deal_value where company = this.company)
 */

import { db } from 'hub:db'
import { dataTables } from 'hub:db:schema'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export interface RollupFieldConfig {
  sourceTable: string        // Table to aggregate from (e.g., "contacts")
  filterBy: {                // Filter condition
    field: string            // Field to filter on (e.g., "company")
    matchesValue: string     // Value to match (e.g., "{{company}}" - template variable)
    and?: {                  // Optional additional filter
      field: string
      equals: string
    }
  }
  aggregation: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX'
  aggregationField?: string  // Field to aggregate (required for SUM, AVG, MIN, MAX)
}

/**
 * Replace template variables in filter values
 * e.g., "{{company}}" becomes the actual company UUID from rowData
 */
function replaceTemplateVariables(value: string, rowData: Record<string, any>): any {
  if (typeof value !== 'string') return value
  
  // Check if it's a template variable: {{fieldName}}
  const match = value.match(/^\{\{(.+)\}\}$/)
  if (match) {
    const fieldName = match[1].trim()
    const fieldValue = rowData[fieldName]
    
    // If the field value is an enriched relation object, extract the relatedId
    if (typeof fieldValue === 'object' && fieldValue !== null && 'relatedId' in fieldValue) {
      return fieldValue.relatedId
    }
    
    return fieldValue
  }
  
  return value
}

/**
 * Build SQL WHERE clause from filter config
 * Handles JSONB columns by casting them properly
 */
function buildFilterClause(
  filterConfig: RollupFieldConfig['filterBy'],
  rowData: Record<string, any>
): string {
  const conditions: string[] = []
  
  // Main filter condition
  const fieldName = filterConfig.field
  const matchValue = replaceTemplateVariables(filterConfig.matchesValue, rowData)
  
  if (matchValue === null || matchValue === undefined) {
    // If the filter value is null, we can't match anything
    return '1 = 0' // Always false
  }
  
  // For JSONB columns (like relation fields), we need to cast to text and remove quotes
  // JSONB stores strings as "value" so we use ->> to extract as text
  conditions.push(`("${fieldName}"::text = '"${matchValue}"' OR "${fieldName}" #>> '{}' = '${matchValue}')`)
  
  // Additional AND condition
  if (filterConfig.and) {
    const andField = filterConfig.and.field
    const andValue = filterConfig.and.equals
    // Same JSONB handling for AND condition
    conditions.push(`("${andField}"::text = '"${andValue}"' OR "${andField}" #>> '{}' = '${andValue}')`)
  }
  
  return conditions.join(' AND ')
}

/**
 * Resolve a single rollup field value
 */
export async function resolveRollupField(
  columnConfig: RollupFieldConfig,
  rowData: Record<string, any>
): Promise<any> {
  try {
    const {
      sourceTable,
      filterBy,
      aggregation,
      aggregationField
    } = columnConfig
    
    // 1. Find the source table's physical name
    const [targetTable] = await db
      .select()
      .from(dataTables)
      .where(eq(dataTables.slug, sourceTable))
      .limit(1)
    
    if (!targetTable) {
      console.warn(`Rollup: Source table "${sourceTable}" not found`)
      return null
    }
    
    const physicalTableName = targetTable.tableName
    
    // 2. Build filter WHERE clause
    const whereClause = buildFilterClause(filterBy, rowData)
    
    // 3. Build aggregation query
    // Handle JSONB columns by casting them to appropriate types
    // For JSONB fields, we use #>> '{}' operator to extract the value as text
    let aggregationSQL: string
    
    switch (aggregation) {
      case 'COUNT':
        aggregationSQL = 'COUNT(*)'
        break
      
      case 'SUM':
        if (!aggregationField) {
          console.warn('Rollup: SUM requires aggregationField')
          return null
        }
        // For JSONB numeric fields (like currency), cast to numeric
        // #>> '{}' extracts JSONB as text, then cast to numeric
        aggregationSQL = 'SUM(("' + aggregationField + `" #>> '{}')::numeric)`
        break
      
      case 'AVG':
        if (!aggregationField) {
          console.warn('Rollup: AVG requires aggregationField')
          return null
        }
        // For JSONB numeric fields, cast to numeric
        aggregationSQL = 'AVG(("' + aggregationField + `" #>> '{}')::numeric)`
        break
      
      case 'MIN':
        if (!aggregationField) {
          console.warn('Rollup: MIN requires aggregationField')
          return null
        }
        // For MIN, extract as text first (works for dates and numbers)
        aggregationSQL = 'MIN("' + aggregationField + `" #>> '{}')`
        break
      
      case 'MAX':
        if (!aggregationField) {
          console.warn('Rollup: MAX requires aggregationField')
          return null
        }
        // For MAX, extract as text first (works for dates and numbers)
        aggregationSQL = 'MAX("' + aggregationField + `" #>> '{}')`
        break
      
      default:
        console.warn(`Rollup: Unknown aggregation type "${aggregation}"`)
        return null
    }
    
    // 4. Execute query
    const query = `
      SELECT ${aggregationSQL} as value
      FROM "${physicalTableName}"
      WHERE ${whereClause}
    `
    
    const result = await db.execute(sql.raw(query))
    
    // 5. Return the aggregated value
    if (result && result.length > 0) {
      const value = result[0].value
      
      // Convert to appropriate type
      if (value === null || value === undefined) {
        return aggregation === 'COUNT' ? 0 : null
      }
      
      if (aggregation === 'COUNT') {
        return parseInt(String(value), 10)
      }
      
      if (aggregation === 'SUM' || aggregation === 'AVG') {
        return parseFloat(String(value))
      }
      
      return value
    }
    
    return aggregation === 'COUNT' ? 0 : null
  } catch (error) {
    console.error('Error resolving rollup field:', error)
    return null
  }
}

/**
 * Resolve all rollup fields in a row
 */
export async function resolveRollupFieldsForRow(
  row: Record<string, any>,
  rollupColumns: any[]
): Promise<Record<string, any>> {
  const resolvedRow = { ...row }
  
  for (const rollupColumn of rollupColumns) {
    const value = await resolveRollupField(
      rollupColumn.config,
      row
    )
    resolvedRow[rollupColumn.name] = value
  }
  
  return resolvedRow
}

/**
 * Resolve rollup fields for multiple rows
 */
export async function resolveRollupFieldsForRows(
  rows: Record<string, any>[],
  columns: any[]
): Promise<Record<string, any>[]> {
  // Find all rollup columns
  const rollupColumns = columns.filter(c => c.type === 'rollup')
  
  if (rollupColumns.length === 0) {
    return rows
  }
  
  console.log(`📊 Resolving ${rollupColumns.length} rollup fields for ${rows.length} rows...`)
  
  // Resolve rollups for each row
  const resolvedRows = []
  for (const row of rows) {
    const resolvedRow = await resolveRollupFieldsForRow(
      row,
      rollupColumns
    )
    resolvedRows.push(resolvedRow)
  }
  
  console.log(`✅ Resolved rollup fields`)
  
  return resolvedRows
}

