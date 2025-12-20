import type { TableColumnDef } from '#shared/types/db'

/**
 * Generate a unique physical table name for a dynamic table
 * Format: dt_[companyIdPrefix]_[tableIdPrefix]
 * 
 * @param companyId - Company UUID
 * @param tableId - Table UUID
 * @returns Physical table name (e.g., "dt_abc123def456_8f3a4b2c1d9e")
 */
export function generatePhysicalTableName(companyId: string, tableId: string): string {
  // Remove hyphens and take first 12 chars of company ID
  const companyPrefix = companyId.replace(/-/g, '').substring(0, 12)
  
  // Remove hyphens and take first 16 chars of table ID
  const tablePrefix = tableId.replace(/-/g, '').substring(0, 16)
  
  return `dt_${companyPrefix}_${tablePrefix}`
}

/**
 * Map column type to PostgreSQL type
 * For date fields, checks config.format to determine DATE vs TIMESTAMPTZ
 * 
 * @param columnType - The column type
 * @param config - Optional column configuration
 */
export function mapColumnTypeToSQL(columnType: string, config?: { format?: string }): string {
  const typeMap: Record<string, string> = {
    text: 'TEXT',
    long_text: 'TEXT',
    number: 'NUMERIC',
    switch: 'BOOLEAN',
  }
  
  // Special handling for date type - check format option
  if (columnType === 'date') {
    // Default to DATE, unless format is 'datetime'
    return config?.format === 'datetime' ? 'TIMESTAMPTZ' : 'DATE'
  }
  
  return typeMap[columnType] || 'TEXT'
}

/**
 * Generate CREATE TABLE SQL for a dynamic table
 * 
 * @param tableName - Physical table name
 * @param columns - Array of column definitions
 * @returns SQL CREATE TABLE statement
 */
export function generateCreateTableSQL(tableName: string, columns: TableColumnDef[]): string {
  // System columns (always present)
  const systemColumns = [
    'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
    'created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    'updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    'created_by UUID', // Reference to user (nullable for now)
  ]
  
  // User-defined columns
  const userColumns = columns.map(col => {
    const sqlType = mapColumnTypeToSQL(col.type, col.config)
    const nullable = col.required ? 'NOT NULL' : 'NULL'
    return `${col.name} ${sqlType} ${nullable}`
  })
  
  // Combine all columns
  const allColumns = [...systemColumns, ...userColumns].join(',\n    ')
  
  return `CREATE TABLE ${tableName} (
    ${allColumns}
  )`
}

/**
 * Generate DROP TABLE SQL for a dynamic table
 */
export function generateDropTableSQL(tableName: string): string {
  return `DROP TABLE IF EXISTS ${tableName} CASCADE`
}

/**
 * Generate ALTER TABLE SQL to add a column
 */
export function generateAddColumnSQL(
  tableName: string,
  column: TableColumnDef
): string {
  const sqlType = mapColumnTypeToSQL(column.type, column.config)
  const nullable = column.required ? 'NOT NULL' : 'NULL'
  
  return `ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${sqlType} ${nullable}`
}

/**
 * Generate ALTER TABLE SQL to drop a column
 * Note: We don't actually drop columns, we just mark them as deleted in metadata
 * This is a safer approach for production systems
 */
export function generateDropColumnSQL(
  tableName: string,
  columnName: string
): string {
  // For now, return the SQL but recommend not using it
  return `-- ALTER TABLE ${tableName} DROP COLUMN ${columnName}`
}

/**
 * Validate table name to prevent SQL injection
 */
export function validateTableName(tableName: string): boolean {
  // Table name must start with dt_ and contain only alphanumeric and underscore
  const pattern = /^dt_[a-z0-9_]+$/
  return pattern.test(tableName)
}

/**
 * Validate column name to prevent SQL injection
 */
export function validateColumnName(columnName: string): boolean {
  // Column name must contain only lowercase letters, numbers, and underscores
  // Must start with a letter
  const pattern = /^[a-z][a-z0-9_]*$/
  return pattern.test(columnName)
}

