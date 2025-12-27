/**
 * Relation Field Resolver
 * 
 * Enriches relation fields with display information.
 * Instead of returning just a UUID, returns an object with:
 * - relatedId: The UUID
 * - displayFieldValue: The value to display (e.g., "Acme Corp")
 * - displayField: The field name being displayed (e.g., "company_name")
 * 
 * Example:
 *   Before: { company: "019d1234-..." }
 *   After:  { company: { relatedId: "019d1234-...", displayFieldValue: "Acme Corp", displayField: "company_name" } }
 */

import { db } from 'hub:db'
import { dataTables } from 'hub:db:schema'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export interface RelationFieldConfig {
  targetTable: string      // Target table slug (e.g., "companies")
  displayField: string     // Field to display (e.g., "company_name")
  allowMultiple?: boolean  // Whether multiple relations are allowed
}

export interface RelationFieldValue {
  relatedId: string
  displayFieldValue: any
  displayField: string
}

/**
 * Resolve a single relation field value
 */
export async function resolveRelationField(
  columnConfig: RelationFieldConfig,
  relationId: string | null
): Promise<RelationFieldValue | null> {
  try {
    // If no relation is set, return null
    if (!relationId) {
      return null
    }
    
    const { targetTable, displayField } = columnConfig
    
    // 1. Find the target table's physical name
    const [table] = await db
      .select()
      .from(dataTables)
      .where(eq(dataTables.slug, targetTable))
      .limit(1)
    
    if (!table) {
      console.warn(`Relation: Target table "${targetTable}" not found`)
      return {
        relatedId: relationId,
        displayFieldValue: null,
        displayField
      }
    }
    
    // 2. Query the target table for the display field
    const physicalTableName = table.tableName
    
    // Build safe SQL query
    const query = `
      SELECT "${displayField}" as value
      FROM "${physicalTableName}"
      WHERE id = '${relationId}'
      LIMIT 1
    `
    
    const result = await db.execute(sql.raw(query))
    
    // 3. Return enriched relation object
    if (result && result.length > 0) {
      return {
        relatedId: relationId,
        displayFieldValue: result[0].value,
        displayField
      }
    }
    
    // Related record not found, but still return the ID
    return {
      relatedId: relationId,
      displayFieldValue: null,
      displayField
    }
  } catch (error) {
    console.error('Error resolving relation field:', error)
    // On error, return basic info so we don't lose the relation ID
    return relationId ? {
      relatedId: relationId,
      displayFieldValue: null,
      displayField: columnConfig.displayField
    } : null
  }
}

/**
 * Resolve all relation fields in a row
 */
export async function resolveRelationFieldsForRow(
  row: Record<string, any>,
  relationColumns: any[]
): Promise<Record<string, any>> {
  const resolvedRow = { ...row }
  
  for (const relationColumn of relationColumns) {
    const relationId = row[relationColumn.name]
    
    // Skip if no value
    if (!relationId) {
      resolvedRow[relationColumn.name] = null
      continue
    }
    
    // Handle JSONB stored values (extract the actual UUID)
    let actualRelationId = relationId
    if (typeof relationId === 'object' && relationId !== null) {
      // If it's already an object, it might have been processed or is JSONB
      // Try to extract the UUID
      actualRelationId = relationId.relatedId || relationId
    } else if (typeof relationId === 'string') {
      // Plain UUID string, use as-is
      actualRelationId = relationId
    }
    
    const resolvedValue = await resolveRelationField(
      relationColumn.config,
      actualRelationId
    )
    
    resolvedRow[relationColumn.name] = resolvedValue
  }
  
  return resolvedRow
}

/**
 * Resolve relation fields for multiple rows
 */
export async function resolveRelationFieldsForRows(
  rows: Record<string, any>[],
  columns: any[]
): Promise<Record<string, any>[]> {
  // Find all relation columns
  const relationColumns = columns.filter(c => c.type === 'relation')
  
  if (relationColumns.length === 0) {
    return rows
  }
  
  console.log(`🔗 Resolving ${relationColumns.length} relation fields for ${rows.length} rows...`)
  
  // Resolve relations for each row
  const resolvedRows = []
  for (const row of rows) {
    const resolvedRow = await resolveRelationFieldsForRow(
      row,
      relationColumns
    )
    resolvedRows.push(resolvedRow)
  }
  
  console.log(`✅ Resolved relation fields`)
  
  return resolvedRows
}

