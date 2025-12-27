import { sql, SQL } from 'drizzle-orm'
import type { DataTableColumn } from '#shared/types/db'

/**
 * View Query Builder - Parse filter and sort JSON into SQL
 * 
 * Converts view filter/sort configurations into Drizzle ORM compatible SQL
 */

// Filter operator types
export type FilterOperator = 
  | 'equals' | 'notEquals' 
  | 'contains' | 'notContains' 
  | 'startsWith' | 'endsWith'
  | 'isEmpty' | 'isNotEmpty'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'between' | 'in' | 'notIn'

// Filter condition structure
export interface FilterCondition {
  columnId: string
  operator: FilterOperator
  value?: any
}

// Filter group structure (supports nesting)
export interface FilterGroup {
  operator: 'AND' | 'OR'
  conditions: (FilterCondition | FilterGroup)[]
}

// Sort configuration
export interface SortConfig {
  columnId: string
  direction: 'asc' | 'desc'
}

/**
 * Build WHERE clause from filter configuration
 */
export function buildWhereClause(
  filters: FilterGroup | null | undefined,
  columns: DataTableColumn[],
  tableName: string
): SQL | undefined {
  if (!filters || !filters.conditions || filters.conditions.length === 0) {
    return undefined
  }

  const columnMap = new Map(columns.map(col => [col.id, col]))
  
  return parseFilterGroup(filters, columnMap, tableName)
}

/**
 * Parse a filter group (handles nesting)
 */
function parseFilterGroup(
  group: FilterGroup,
  columnMap: Map<string, DataTableColumn>,
  tableName: string
): SQL | undefined {
  const clauses: SQL[] = []

  for (const condition of group.conditions) {
    let clause: SQL | undefined

    if ('conditions' in condition) {
      // Nested group
      clause = parseFilterGroup(condition, columnMap, tableName)
    } else {
      // Single condition
      clause = parseFilterCondition(condition, columnMap, tableName)
    }

    if (clause) {
      clauses.push(clause)
    }
  }

  if (clauses.length === 0) {
    return undefined
  }

  // Combine with AND or OR
  if (group.operator === 'OR') {
    return sql`(${sql.join(clauses, sql` OR `)})`
  } else {
    return sql`(${sql.join(clauses, sql` AND `)})`
  }
}

/**
 * Parse a single filter condition
 */
function parseFilterCondition(
  condition: FilterCondition,
  columnMap: Map<string, DataTableColumn>,
  tableName: string
): SQL | undefined {
  const column = columnMap.get(condition.columnId)
  if (!column) {
    console.warn(`Column ${condition.columnId} not found in filter`)
    return undefined
  }

  const columnRef = sql.identifier(column.name)
  const { operator, value } = condition

  switch (operator) {
    case 'equals':
      return sql`${columnRef} = ${value}`
    
    case 'notEquals':
      return sql`${columnRef} != ${value}`
    
    case 'contains':
      return sql`${columnRef}::text ILIKE ${'%' + value + '%'}`
    
    case 'notContains':
      return sql`${columnRef}::text NOT ILIKE ${'%' + value + '%'}`
    
    case 'startsWith':
      return sql`${columnRef}::text ILIKE ${value + '%'}`
    
    case 'endsWith':
      return sql`${columnRef}::text ILIKE ${'%' + value}`
    
    case 'isEmpty':
      return sql`(${columnRef} IS NULL OR ${columnRef}::text = '')`
    
    case 'isNotEmpty':
      return sql`(${columnRef} IS NOT NULL AND ${columnRef}::text != '')`
    
    case 'gt':
      return sql`${columnRef} > ${value}`
    
    case 'gte':
      return sql`${columnRef} >= ${value}`
    
    case 'lt':
      return sql`${columnRef} < ${value}`
    
    case 'lte':
      return sql`${columnRef} <= ${value}`
    
    case 'between':
      if (Array.isArray(value) && value.length === 2) {
        return sql`${columnRef} BETWEEN ${value[0]} AND ${value[1]}`
      }
      return undefined
    
    case 'in':
      if (Array.isArray(value) && value.length > 0) {
        return sql`${columnRef} = ANY(${value})`
      }
      return undefined
    
    case 'notIn':
      if (Array.isArray(value) && value.length > 0) {
        return sql`${columnRef} != ALL(${value})`
      }
      return undefined
    
    default:
      console.warn(`Unknown filter operator: ${operator}`)
      return undefined
  }
}

/**
 * Build ORDER BY clause from sort configuration
 */
export function buildOrderByClause(
  sorts: SortConfig[] | null | undefined,
  columns: DataTableColumn[],
  tableName: string
): SQL | undefined {
  if (!sorts || sorts.length === 0) {
    return undefined
  }

  const columnMap = new Map(columns.map(col => [col.id, col]))
  const orderClauses: SQL[] = []

  for (const sort of sorts) {
    const column = columnMap.get(sort.columnId)
    if (!column) {
      console.warn(`Column ${sort.columnId} not found in sort`)
      continue
    }

    const columnRef = sql.identifier(column.name)
    
    if (sort.direction === 'desc') {
      orderClauses.push(sql`${columnRef} DESC`)
    } else {
      orderClauses.push(sql`${columnRef} ASC`)
    }
  }

  if (orderClauses.length === 0) {
    return undefined
  }

  return sql.join(orderClauses, sql`, `)
}

/**
 * Build complete query with filters and sorts
 */
export function buildViewQuery(
  baseQuery: string,
  filters: FilterGroup | null | undefined,
  sorts: SortConfig[] | null | undefined,
  columns: DataTableColumn[],
  tableName: string
): { query: string; params: any[] } {
  const parts: string[] = [baseQuery]
  const params: any[] = []

  // Add WHERE clause
  const whereClause = buildWhereClause(filters, columns, tableName)
  if (whereClause) {
    parts.push('WHERE')
    parts.push(whereClause.queryChunks.join(''))
    if (whereClause.values) {
      params.push(...whereClause.values)
    }
  }

  // Add ORDER BY clause
  const orderClause = buildOrderByClause(sorts, columns, tableName)
  if (orderClause) {
    parts.push('ORDER BY')
    parts.push(orderClause.queryChunks.join(''))
    if (orderClause.values) {
      params.push(...orderClause.values)
    }
  }

  return {
    query: parts.join(' '),
    params
  }
}

/**
 * Validate filter configuration
 */
export function validateFilters(filters: FilterGroup): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!filters.operator || (filters.operator !== 'AND' && filters.operator !== 'OR')) {
    errors.push('Invalid filter operator: must be AND or OR')
  }

  if (!Array.isArray(filters.conditions)) {
    errors.push('Filter conditions must be an array')
  }

  // Recursively validate nested groups
  for (const condition of filters.conditions || []) {
    if ('conditions' in condition) {
      const nested = validateFilters(condition)
      errors.push(...nested.errors)
    } else {
      // Validate single condition
      if (!condition.columnId) {
        errors.push('Filter condition missing columnId')
      }
      if (!condition.operator) {
        errors.push('Filter condition missing operator')
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate sort configuration
 */
export function validateSorts(sorts: SortConfig[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!Array.isArray(sorts)) {
    errors.push('Sort configuration must be an array')
    return { valid: false, errors }
  }

  for (const sort of sorts) {
    if (!sort.columnId) {
      errors.push('Sort configuration missing columnId')
    }
    if (!sort.direction || (sort.direction !== 'asc' && sort.direction !== 'desc')) {
      errors.push('Sort direction must be "asc" or "desc"')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

