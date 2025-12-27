import type { SQL } from 'drizzle-orm'
import { eq, sql as drizzleSql } from 'drizzle-orm'
import { resolveRelationFieldsForRows, resolveFormulaFieldsForRows, resolveRollupFieldsForRows } from './computedFields'

/**
 * Query Rows by View - Server Utility
 * 
 * ⚠️ SECURITY: This file must stay in server/utils (NOT shared/)
 * Contains SQL building logic that should NEVER be exposed to frontend
 * 
 * This utility builds and executes SQL queries based on view configuration.
 * Works across all view types (Table, Kanban, Calendar, Gallery, etc.)
 * 
 * Features:
 * - Applies view filters (with AND/OR logic)
 * - Applies view sorting
 * - Respects visible columns
 * - Resolves relations and lookups ✅
 * - Pagination support
 */

export interface QueryRowsByViewOptions {
  limit?: number
  offset?: number
  // Override view's default filters/sorts if needed
  additionalFilters?: any
  additionalSort?: any
}

export interface QueryRowsByViewResult {
  rows: any[]
  total: number
  view: any
  columns: any[]
}

interface FilterCondition {
  columnId: string
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'startsWith' | 'endsWith' | 
            'isEmpty' | 'isNotEmpty' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'in' | 'notIn'
  value?: any
}

interface ViewFilters {
  operator: 'AND' | 'OR'
  conditions: FilterCondition[]
}

interface ViewSort {
  columnId: string
  direction: 'asc' | 'desc'
}

/**
 * Build SQL WHERE clause from view filters
 * ⚠️ SERVER-ONLY: Never expose this to frontend
 */
function buildFilterSQL(
  filters: ViewFilters | undefined,
  columnMap: Map<string, any>
): string {
  if (!filters || !filters.conditions || filters.conditions.length === 0) {
    return ''
  }

  const conditions = filters.conditions
    .map(condition => {
      const column = columnMap.get(condition.columnId)
      if (!column) return null

      const columnName = column.name
      const operator = condition.operator
      const value = condition.value

      switch (operator) {
        case 'equals':
          return value === null 
            ? `"${columnName}" IS NULL`
            : `"${columnName}" = '${escapeSQLValue(value)}'`
        
        case 'notEquals':
          return value === null
            ? `"${columnName}" IS NOT NULL`
            : `"${columnName}" != '${escapeSQLValue(value)}'`
        
        case 'contains':
          return `"${columnName}" ILIKE '%${escapeSQLValue(value)}%'`
        
        case 'notContains':
          return `"${columnName}" NOT ILIKE '%${escapeSQLValue(value)}%'`
        
        case 'startsWith':
          return `"${columnName}" ILIKE '${escapeSQLValue(value)}%'`
        
        case 'endsWith':
          return `"${columnName}" ILIKE '%${escapeSQLValue(value)}'`
        
        case 'isEmpty':
          return `("${columnName}" IS NULL OR "${columnName}" = '')`
        
        case 'isNotEmpty':
          return `("${columnName}" IS NOT NULL AND "${columnName}" != '')`
        
        case 'gt':
          return `"${columnName}" > '${escapeSQLValue(value)}'`
        
        case 'gte':
          return `"${columnName}" >= '${escapeSQLValue(value)}'`
        
        case 'lt':
          return `"${columnName}" < '${escapeSQLValue(value)}'`
        
        case 'lte':
          return `"${columnName}" <= '${escapeSQLValue(value)}'`
        
        case 'between':
          if (Array.isArray(value) && value.length === 2) {
            return `"${columnName}" BETWEEN '${escapeSQLValue(value[0])}' AND '${escapeSQLValue(value[1])}'`
          }
          return null
        
        case 'in':
          if (Array.isArray(value) && value.length > 0) {
            const values = value.map(v => `'${escapeSQLValue(v)}'`).join(', ')
            return `"${columnName}" IN (${values})`
          }
          return null
        
        case 'notIn':
          if (Array.isArray(value) && value.length > 0) {
            const values = value.map(v => `'${escapeSQLValue(v)}'`).join(', ')
            return `"${columnName}" NOT IN (${values})`
          }
          return null
        
        default:
          return null
      }
    })
    .filter(Boolean)

  if (conditions.length === 0) {
    return ''
  }

  const joinOperator = filters.operator === 'OR' ? ' OR ' : ' AND '
  return `(${conditions.join(joinOperator)})`
}

/**
 * Build SQL ORDER BY clause from view sort config
 * ⚠️ SERVER-ONLY: Never expose this to frontend
 */
function buildSortSQL(
  sorts: ViewSort[] | undefined,
  columnMap: Map<string, any>
): string {
  if (!sorts || sorts.length === 0) {
    return 'created_at DESC' // Default sort
  }

  const sortClauses = sorts
    .map(sort => {
      const column = columnMap.get(sort.columnId)
      if (!column) return null

      const direction = sort.direction.toUpperCase()
      return `"${column.name}" ${direction}`
    })
    .filter(Boolean)

  if (sortClauses.length === 0) {
    return 'created_at DESC'
  }

  return sortClauses.join(', ')
}

/**
 * Escape SQL values to prevent injection
 * ⚠️ SERVER-ONLY: Never expose this to frontend
 * Note: This is a basic escape. In production, use parameterized queries.
 */
function escapeSQLValue(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }
  return String(value).replace(/'/g, "''")
}

/**
 * Resolve relation fields for a batch of records
 * ⚠️ SERVER-ONLY: Fetches related records
 */
async function resolveRelations(
  rows: any[],
  columns: any[]
): Promise<any[]> {
  if (rows.length === 0) return rows

  // Find all relation columns
  const relationColumns = columns.filter(col => col.type === 'relation')
  
  if (relationColumns.length === 0) return rows

  // For each row, expand relations
  const expandedRows = []
  
  for (const row of rows) {
    const expandedRow = { ...row }
    
    for (const column of relationColumns) {
      const relationId = row[column.name]
      
      if (!relationId) {
        // No relation set
        expandedRow[`${column.name}_data`] = null
        continue
      }
      
      // Handle multiple relations (array of IDs)
      if (column.config?.allowMultiple && Array.isArray(relationId)) {
        const relatedRecords = []
        for (const id of relationId) {
          const record = await getRelatedRecord(
            column.config.targetTable,
            id,
            ['id', column.config.displayField || 'name']
          )
          if (record) {
            relatedRecords.push(record)
          }
        }
        expandedRow[`${column.name}_data`] = relatedRecords
      } else {
        // Single relation
        const relatedRecord = await getRelatedRecord(
          column.config.targetTable,
          relationId,
          ['id', column.config.displayField || 'name']
        )
        expandedRow[`${column.name}_data`] = relatedRecord
      }
    }
    
    expandedRows.push(expandedRow)
  }
  
  return expandedRows
}

/**
 * Resolve lookup fields for a batch of records
 * ⚠️ SERVER-ONLY: Follows relation chain to fetch target field
 */
async function resolveLookups(
  rows: any[],
  columns: any[],
  allColumns: any[],
  db: any,
  schema: any
): Promise<any[]> {
  if (rows.length === 0) return rows

  // Find all lookup columns
  const lookupColumns = columns.filter(col => col.type === 'lookup')
  
  if (lookupColumns.length === 0) return rows

  // Create a map of column names to column definitions (by name, not ID)
  const columnMapByName = new Map(allColumns.map(col => [col.name, col]))

  // For each row, resolve lookups
  const resolvedRows = []
  
  for (const row of rows) {
    const resolvedRow = { ...row }
    
    for (const lookupColumn of lookupColumns) {
      // Get the relation column this lookup depends on (by field NAME)
      const relationFieldName = lookupColumn.config?.relationField
      const targetFieldName = lookupColumn.config?.targetField
      
      if (!relationFieldName || !targetFieldName) {
        resolvedRow[lookupColumn.name] = null
        continue
      }
      
      // Get the relation column definition by NAME
      const relationColumn = columnMapByName.get(relationFieldName)
      
      if (!relationColumn || relationColumn.type !== 'relation') {
        resolvedRow[lookupColumn.name] = null
        continue
      }
      
      // Get the relation ID from the current row
      // Note: After relation enrichment, this might be an object { relatedId, displayFieldValue, displayField }
      const relationValue = row[relationColumn.name]
      const relationId = typeof relationValue === 'object' && relationValue !== null
        ? relationValue.relatedId
        : relationValue
      
      if (!relationId) {
        resolvedRow[lookupColumn.name] = null
        continue
      }
      
      // Get target table slug from relation config
      const targetTableSlug = relationColumn.config.targetTable
      
      if (!targetTableSlug) {
        resolvedRow[lookupColumn.name] = null
        continue
      }
      
      // Find the target table by slug to get its physical table name
      const [targetTable] = await db
        .select()
        .from(schema.dataTables)
        .where(eq(schema.dataTables.slug, targetTableSlug))
        .limit(1)
      
      if (!targetTable) {
        console.warn(`Lookup: Target table "${targetTableSlug}" not found`)
        resolvedRow[lookupColumn.name] = null
        continue
      }
      
      // Query the physical table directly
      // Note: relationId is a UUID from database, safe to interpolate
      const query = `SELECT "${targetFieldName}" as value FROM "${targetTable.tableName}" WHERE id = '${relationId}' LIMIT 1`
      const result = await db.execute(drizzleSql.raw(query))
      
      // Store the lookup value
      resolvedRow[lookupColumn.name] = result?.[0]?.value || null
    }
    
    resolvedRows.push(resolvedRow)
  }
  
  return resolvedRows
}

/**
 * Main query function
 * ⚠️ SERVER-ONLY: This function executes SQL queries
 */
export async function queryRowsByView(
  db: any, // Drizzle db instance
  schema: any, // DB schema
  viewId: string,
  options: QueryRowsByViewOptions = {}
): Promise<QueryRowsByViewResult> {
  const { limit = 50, offset = 0 } = options

  // 1. Get view metadata
  const view = await db
    .select()
    .from(schema.dataTableViews)
    .where(eq(schema.dataTableViews.id, viewId))
    .limit(1)
    .then((rows: any[]) => rows[0])
  if (!view) {
    throw new Error(`View not found: ${viewId}`)
  }

  // 2. Get table metadata
  const table = await db
    .select()
    .from(schema.dataTables)
    .where(eq(schema.dataTables.id, view.dataTableId))
    .limit(1)
    .then((rows: any[]) => rows[0])

  if (!table) {
    throw new Error(`Table not found for view: ${viewId}`)
  }

  // 3. Get all columns for this table
  const allColumns = await db
    .select()
    .from(schema.dataTableColumns)
    .where(eq(schema.dataTableColumns.dataTableId, table.id))
    .orderBy(schema.dataTableColumns.order)

  // Create column lookup maps
  const columnMap = new Map<string, any>(allColumns.map((col: any) => [col.id, col]))
  const columnNameMap = new Map<string, any>(allColumns.map((col: any) => [col.name, col]))

  // 4. Get visible columns (or all if not specified)
  const visibleColumnIds = (view.visibleColumns as string[]) || []
  const visibleColumns = visibleColumnIds.length > 0
    ? visibleColumnIds.map(id => columnMap.get(id)).filter(Boolean)
    : allColumns

  // 5. Build SQL query
  const tableName = table.tableName
  
  // Validate table name to prevent SQL injection
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    throw new Error('Invalid table name')
  }

  // Build WHERE clause from filters
  const filters = view.filters as ViewFilters | undefined
  const whereClause = buildFilterSQL(filters, columnMap)
  const whereSQL = whereClause ? `WHERE ${whereClause}` : ''

  // Build ORDER BY clause from sort config
  const sorts = view.sort as ViewSort[] | undefined
  const orderBySQL = `ORDER BY ${buildSortSQL(sorts, columnMap)}`

  // Build SELECT query
  const selectSQL = `
    SELECT * 
    FROM "${tableName}"
    ${whereSQL}
    ${orderBySQL}
    LIMIT ${limit}
    OFFSET ${offset}
  `.trim()

  // Build COUNT query
  const countSQL = `
    SELECT COUNT(*) as count
    FROM "${tableName}"
    ${whereSQL}
  `.trim()

  // 6. Execute queries
  let rows = await db.execute(drizzleSql.raw(selectSQL))
  const countResult = await db.execute(drizzleSql.raw(countSQL))
  const total = parseInt((countResult[0] as any).count, 10)

  // 7. Resolve computed fields in order:
  // 7a. Relation fields (enrich with display information)
  rows = await resolveRelationFieldsForRows(rows as any[], visibleColumns)

  // 7b. Lookup fields (pull data from relations)
  rows = await resolveLookups(rows as any[], visibleColumns, allColumns, db, schema)

  // 7c. Rollup fields (aggregate data from related tables)
  rows = await resolveRollupFieldsForRows(rows as any[], visibleColumns)

  // 7d. Formula fields (calculate values from current row, may use lookup/rollup results)
  rows = resolveFormulaFieldsForRows(rows as any[], visibleColumns)

  // 8. Return results
  return {
    rows,
    total,
    view: {
      ...view,
      columns: visibleColumns, // Include visible columns in response
    },
    columns: visibleColumns,
  }
}

// Note: Access control functions moved to server/utils/viewAccess.ts
// Use validateViewAccess() from there for comprehensive access control

