/**
 * Relation Helper Utilities
 * 
 * Functions for managing table relations (foreign keys, lookups, etc.)
 */

import { db, schema } from 'hub:db'
import { eq, and, like, or } from 'drizzle-orm'

/**
 * Get a related record by ID
 */
export async function getRelatedRecord(
  tableId: string,
  recordId: string,
  fields?: string[]
) {
  try {
    // Get table metadata
    const table = await db
      .select()
      .from(schema.dataTables)
      .where(eq(schema.dataTables.id, tableId))
      .limit(1)
      .then(rows => rows[0])
    
    if (!table) {
      throw new Error(`Table not found: ${tableId}`)
    }
    
    // Query the physical table
    const query = fields && fields.length > 0
      ? `SELECT ${fields.map(f => `"${f}"`).join(', ')} FROM "${table.tableName}" WHERE id = $1`
      : `SELECT * FROM "${table.tableName}" WHERE id = "${recordId}"`
    
    const result = await db.execute(query)
    
    return result.rows[0] || null
  } catch (error) {
    console.error('Error getting related record:', error)
    return null
  }
}

/**
 * Search related records for picker
 */
export async function searchRelatedRecords(
  tableId: string,
  searchQuery: string,
  displayField: string,
  limit: number = 50
) {
  try {
    // Get table metadata
    const table = await db
      .select()
      .from(schema.dataTables)
      .where(eq(schema.dataTables.id, tableId))
      .limit(1)
      .then(rows => rows[0])
    
    if (!table) {
      throw new Error(`Table not found: ${tableId}`)
    }
    
    // Build search query
    let query = `SELECT id, "${displayField}" FROM "${table.tableName}"`
    const params: any[] = []
    
    if (searchQuery && searchQuery.trim()) {
      query += ` WHERE "${displayField}"::text ILIKE $1`
      params.push(`%${searchQuery}%`)
    }
    
    query += ` ORDER BY "${displayField}" LIMIT ${limit}`
    
    const result = await db.execute(query, params)
    
    return result.rows
  } catch (error) {
    console.error('Error searching related records:', error)
    return []
  }
}

/**
 * Validate that a relation exists
 */
export async function validateRelation(
  tableId: string,
  recordId: string
): Promise<boolean> {
  try {
    const record = await getRelatedRecord(tableId, recordId, ['id'])
    return !!record
  } catch (error) {
    console.error('Error validating relation:', error)
    return false
  }
}

/**
 * Create foreign key constraint
 */
export async function createForeignKey(
  sourceTable: string,
  columnName: string,
  targetTable: string,
  onDelete: 'restrict' | 'cascade' | 'set_null'
) {
  try {
    const constraintName = `fk_${sourceTable}_${columnName}`
    
    // Map cascade option to SQL
    const deleteAction = onDelete === 'set_null' ? 'SET NULL' :
                        onDelete === 'cascade' ? 'CASCADE' : 'RESTRICT'
    
    // Create foreign key constraint
    await db.execute(`
      ALTER TABLE "${sourceTable}"
      ADD CONSTRAINT "${constraintName}"
      FOREIGN KEY ("${columnName}")
      REFERENCES "${targetTable}" (id)
      ON DELETE ${deleteAction}
    `)
    
    console.log(`✅ Created foreign key: ${constraintName}`)
  } catch (error) {
    console.error('Error creating foreign key:', error)
    throw new Error(`Failed to create foreign key: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Drop foreign key constraint
 */
export async function dropForeignKey(
  sourceTable: string,
  columnName: string
) {
  try {
    const constraintName = `fk_${sourceTable}_${columnName}`
    
    await db.execute(`
      ALTER TABLE "${sourceTable}"
      DROP CONSTRAINT IF EXISTS "${constraintName}"
    `)
    
    console.log(`✅ Dropped foreign key: ${constraintName}`)
  } catch (error) {
    console.error('Error dropping foreign key:', error)
    throw new Error(`Failed to drop foreign key: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get all records that reference a specific record (reverse lookup)
 */
export async function getReferencingRecords(
  targetTable: string,
  recordId: string
): Promise<Array<{ table: string; column: string; count: number }>> {
  try {
    // Query information_schema to find all foreign keys pointing to this table
    const result = await db.execute(`
      SELECT 
        tc.table_name,
        kcu.column_name,
        COUNT(*) as ref_count
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = $1
      GROUP BY tc.table_name, kcu.column_name
    `, [targetTable])
    
    // For each referencing table, count how many records reference this specific record
    const references = []
    
    for (const row of result.rows as any[]) {
      const countResult = await db.execute(
        `SELECT COUNT(*) as count FROM "${row.table_name}" WHERE "${row.column_name}" = $1`,
        [recordId]
      )
      
      const count = parseInt((countResult.rows[0] as any).count)
      
      if (count > 0) {
        references.push({
          table: row.table_name,
          column: row.column_name,
          count
        })
      }
    }
    
    return references
  } catch (error) {
    console.error('Error getting referencing records:', error)
    return []
  }
}

/**
 * Expand relation fields in a record
 * Replaces relation IDs with full record objects
 */
export async function expandRelations(
  record: any,
  columns: any[],
  expand: string[] = []
): Promise<any> {
  const expanded = { ...record }
  
  for (const columnName of expand) {
    // Find the column definition
    const column = columns.find(c => c.name === columnName)
    
    if (!column || column.type !== 'relation') {
      continue
    }
    
    // Get the relation ID
    const relationId = record[columnName]
    
    if (!relationId) {
      expanded[columnName + '_data'] = null
      continue
    }
    
    // Fetch the related record
    const relatedRecord = await getRelatedRecord(
      column.config.targetTable,
      relationId
    )
    
    expanded[columnName + '_data'] = relatedRecord
  }
  
  return expanded
}

/**
 * Validate all relations in a record
 */
export async function validateRecordRelations(
  record: any,
  columns: any[]
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = []
  
  for (const column of columns) {
    if (column.type !== 'relation') continue
    
    const value = record[column.name]
    
    // Skip if null and not required
    if (!value && !column.required) continue
    
    // Check if required
    if (!value && column.required) {
      errors.push(`${column.label} is required`)
      continue
    }
    
    // Validate relation exists
    const exists = await validateRelation(column.config.targetTable, value)
    
    if (!exists) {
      errors.push(`Related record not found for ${column.label}`)
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

