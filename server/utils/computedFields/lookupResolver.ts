/**
 * Lookup Field Resolver
 * 
 * Resolves lookup fields by fetching data from related records.
 * A lookup field pulls a value from a related record through a relation field.
 * 
 * Example:
 *   Contact has "company" (relation) → Companies table
 *   Contact has "company_industry" (lookup from company.industry)
 *   When Contact.company = "Acme Corp UUID"
 *   Then Contact.company_industry = "Technology" (auto-populated)
 */

import { db } from 'hub:db'
import { dataTableColumns, dataTables } from 'hub:db:schema'
import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export interface LookupFieldConfig {
  relationField: string  // The relation field name (e.g., "company")
  targetField: string    // The field to lookup in the related table (e.g., "industry")
}

/**
 * Resolve a single lookup field value
 */
export async function resolveLookupField(
  columnConfig: LookupFieldConfig,
  rowData: Record<string, any>,
  allColumns: any[],
  tableName: string
): Promise<any> {
  try {
    // 1. Get the relation field value (UUID of related record)
    // Note: After relation enrichment, this might be an object { relatedId, displayFieldValue, displayField }
    const relationFieldName = columnConfig.relationField
    const relationValue = rowData[relationFieldName]
    const relationId = typeof relationValue === 'object' && relationValue !== null
      ? relationValue.relatedId
      : relationValue
    
    // If no relation is set, return null
    if (!relationId) {
      return null
    }
    
    // 2. Find the relation column to get target table info
    const relationColumn = allColumns.find(c => c.name === relationFieldName)
    if (!relationColumn || relationColumn.type !== 'relation') {
      console.warn(`Lookup: Relation field "${relationFieldName}" not found or not a relation type`)
      return null
    }
    
    // 3. Get target table slug from relation config
    const targetTableSlug = relationColumn.config?.targetTable
    if (!targetTableSlug) {
      console.warn(`Lookup: No targetTable in relation config for "${relationFieldName}"`)
      return null
    }
    
    // 4. Find the target table's physical name
    const [targetTable] = await db
      .select()
      .from(dataTables)
      .where(eq(dataTables.slug, targetTableSlug))
      .limit(1)
    
    if (!targetTable) {
      console.warn(`Lookup: Target table "${targetTableSlug}" not found`)
      return null
    }
    
    // 5. Query the target table for the specific field
    const targetFieldName = columnConfig.targetField
    const physicalTableName = targetTable.tableName
    
    // Build safe SQL query (relationId is a UUID from database, already validated)
    const query = sql.raw(`
      SELECT "${targetFieldName}" as value
      FROM "${physicalTableName}"
      WHERE id = '${relationId}'
      LIMIT 1
    `)
    
    const result = await db.execute(query)
    
    // 6. Return the looked-up value
    if (result && result.length > 0) {
      return result[0].value
    }
    
    return null
  } catch (error) {
    console.error(`Error resolving lookup field:`, error)
    return null
  }
}

/**
 * Resolve all lookup fields in a row
 */
export async function resolveLookupFieldsForRow(
  row: Record<string, any>,
  lookupColumns: any[],
  allColumns: any[],
  tableName: string
): Promise<Record<string, any>> {
  const resolvedRow = { ...row }
  
  for (const lookupColumn of lookupColumns) {
    const value = await resolveLookupField(
      lookupColumn.config,
      row,
      allColumns,
      tableName
    )
    resolvedRow[lookupColumn.name] = value
  }
  
  return resolvedRow
}

/**
 * Resolve lookup fields for multiple rows
 */
export async function resolveLookupFieldsForRows(
  rows: Record<string, any>[],
  columns: any[],
  tableName: string
): Promise<Record<string, any>[]> {
  // Find all lookup columns
  const lookupColumns = columns.filter(c => c.type === 'lookup')
  
  if (lookupColumns.length === 0) {
    return rows
  }
  
  console.log(`🔍 Resolving ${lookupColumns.length} lookup fields for ${rows.length} rows...`)
  
  // Resolve lookups for each row
  const resolvedRows = []
  for (const row of rows) {
    const resolvedRow = await resolveLookupFieldsForRow(
      row,
      lookupColumns,
      columns,
      tableName
    )
    resolvedRows.push(resolvedRow)
  }
  
  console.log(`✅ Resolved lookup fields`)
  
  return resolvedRows
}

