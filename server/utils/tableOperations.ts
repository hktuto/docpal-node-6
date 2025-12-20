import { db } from 'hub:db'
import { sql } from 'drizzle-orm'
import type { TableColumnDef } from '#shared/types/db'
import {
  generateCreateTableSQL,
  generateDropTableSQL,
  validateTableName,
  validateColumnName,
} from './dynamicTable'

/**
 * Create a physical PostgreSQL table for dynamic data
 * 
 * @param tableName - Physical table name (must be validated)
 * @param columns - Array of column definitions
 * @throws Error if table name is invalid or table creation fails
 */
export async function createPhysicalTable(
  tableName: string,
  columns: TableColumnDef[]
): Promise<void> {
  // Validate table name to prevent SQL injection
  if (!validateTableName(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`)
  }
  
  // Validate all column names
  for (const column of columns) {
    if (!validateColumnName(column.name)) {
      throw new Error(`Invalid column name: ${column.name}`)
    }
  }
  
  // Generate CREATE TABLE SQL
  const createSQL = generateCreateTableSQL(tableName, columns)
  
  try {
    // Execute the SQL
    await db.execute(sql.raw(createSQL))
    console.log(`✅ Created physical table: ${tableName}`)
  } catch (error) {
    console.error(`❌ Failed to create table ${tableName}:`, error)
    throw new Error(`Failed to create physical table: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Drop a physical PostgreSQL table
 * 
 * @param tableName - Physical table name (must be validated)
 * @throws Error if table name is invalid or drop fails
 */
export async function dropPhysicalTable(tableName: string): Promise<void> {
  // Validate table name to prevent SQL injection
  if (!validateTableName(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`)
  }
  
  // Generate DROP TABLE SQL
  const dropSQL = generateDropTableSQL(tableName)
  
  try {
    // Execute the SQL
    await db.execute(sql.raw(dropSQL))
    console.log(`✅ Dropped physical table: ${tableName}`)
  } catch (error) {
    console.error(`❌ Failed to drop table ${tableName}:`, error)
    throw new Error(`Failed to drop physical table: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Check if a physical table exists
 * 
 * @param tableName - Physical table name
 * @returns true if table exists, false otherwise
 */
export async function tableExists(tableName: string): Promise<boolean> {
  if (!validateTableName(tableName)) {
    return false
  }
  
  try {
    const result = await db.execute(sql.raw(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = '${tableName}'
      ) as exists
    `))
    
    return result.rows[0]?.exists === true
  } catch (error) {
    console.error(`Error checking if table exists: ${tableName}`, error)
    return false
  }
}

/**
 * Get row count from a dynamic table
 * 
 * @param tableName - Physical table name
 * @returns Number of rows in the table
 */
export async function getTableRowCount(tableName: string): Promise<number> {
  if (!validateTableName(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`)
  }
  
  try {
    const result = await db.execute(sql.raw(`
      SELECT COUNT(*) as count FROM ${tableName}
    `))
    
    return Number(result.rows[0]?.count || 0)
  } catch (error) {
    console.error(`Error getting row count for table: ${tableName}`, error)
    return 0
  }
}

