import { eq, sql } from 'drizzle-orm'
import type { FilterGroup } from '#shared/types/db'

export interface GenerateGroupOptionsParams {
  columnName: string
  filters?: FilterGroup | null
  additionalFilters?: FilterGroup | null
  maxOptions?: number
  includeEmpty?: boolean
  minCount?: number
}

export interface GroupOption {
  id: string | null
  label: string
  color?: string
  count: number
  metadata?: Record<string, any>
}

export interface GenerateGroupOptionsResult {
  columnName: string
  columnType: string
  options: GroupOption[]
  total: number
  hasMore: boolean
}

/**
 * Generate grouping options for a column with counts
 * Supports all column types and respects filters
 */
export async function generateGroupOptions(
  db: any,
  schema: any,
  viewId: string,
  params: GenerateGroupOptionsParams
): Promise<GenerateGroupOptionsResult> {
  const {
    columnName,
    filters = null,
    additionalFilters = null,
    maxOptions = 50,
    includeEmpty = true,
    minCount = 1
  } = params

  // 1. Get view and column metadata
  const [view] = await db
    .select()
    .from(schema.dataTableViews)
    .where(eq(schema.dataTableViews.id, viewId))

  if (!view) {
    throw new Error('View not found')
  }

  // 2. Get table and columns
  const [table] = await db
    .select()
    .from(schema.dataTables)
    .where(eq(schema.dataTables.id, view.dataTableId))

  if (!table) {
    throw new Error('Table not found')
  }

  // Use the stored physical table name (e.g., dt_abc123def456_8f3a4b2c1d9e)
  const physicalTableName = table.tableName

  if (!physicalTableName) {
    throw new Error('Table physical name not found')
  }

  // Validate table name to prevent SQL injection
  if (!/^[a-zA-Z0-9_]+$/.test(physicalTableName)) {
    throw new Error('Invalid table name')
  }

  const columns = await db
    .select()
    .from(schema.dataTableColumns)
    .where(eq(schema.dataTableColumns.dataTableId, table.id))

  const column = columns.find((c: any) => c.name === columnName)
  if (!column) {
    throw new Error(`Column ${columnName} not found`)
  }

  // 3. Build WHERE clause from filters
  const whereSQL = buildWhereClauseForGrouping(
    filters ?? view.filters,
    additionalFilters,
    columns,
    physicalTableName
  )

  // 4. Generate options based on column type
  const options = await generateOptionsByType(
    db,
    physicalTableName,
    column,
    columns,
    whereSQL,
    { maxOptions, includeEmpty, minCount }
  )

  // 5. Calculate total
  const total = options.reduce((sum, opt) => sum + opt.count, 0)

  return {
    columnName: column.name,
    columnType: column.type,
    options,
    total,
    hasMore: options.length >= maxOptions
  }
}

/**
 * Build WHERE clause for grouping query
 */
function buildWhereClauseForGrouping(
  baseFilters: FilterGroup | null,
  additionalFilters: FilterGroup | null,
  columns: any[],
  tableName: string
): string {
  // Merge filters
  let filters = baseFilters
  if (additionalFilters) {
    if (filters) {
      filters = {
        operator: 'AND',
        conditions: [filters, additionalFilters]
      }
    } else {
      filters = additionalFilters
    }
  }

  if (!filters) return ''

  // Use existing buildFilterSQL utility
  const columnMap = new Map(columns.map((col: any) => [col.id, col]))
  return buildFilterSQLForGrouping(filters, columnMap)
}

/**
 * Check if column type is stored as JSONB in dynamic tables
 */
function isJSONBColumnType(columnType: string): boolean {
  const jsonbTypes = [
    'text', 'richtext', 'url', 'email', 'phone',
    'select', 'multiSelect', 'user', 'relation',
    'currency', 'attachment', 'lookup', 'formula', 'rollup'
  ]
  return jsonbTypes.includes(columnType)
}

/**
 * Get column SQL reference (handle JSONB vs native types)
 */
function getColumnSQLReference(columnName: string, columnType: string): string {
  if (columnType === 'relation') {
    // For relation fields, the UUID is stored directly as JSONB string
    return `"${columnName}" #>> '{}'`
  } else if (isJSONBColumnType(columnType)) {
    // Extract text value from JSONB
    return `"${columnName}" #>> '{}'`
  }
  // Native types (number, date, timestamp, boolean, etc.)
  return `"${columnName}"`
}

/**
 * Escape SQL value for string interpolation
 */
function escapeSQLValue(value: any): string {
  if (value === null || value === undefined) return 'NULL'
  return String(value).replace(/'/g, "''")
}

/**
 * Simplified filter SQL builder for grouping
 * (Reuses logic from queryRowsByView but simplified)
 */
function buildFilterSQLForGrouping(
  filters: FilterGroup,
  columnMap: Map<string, any>
): string {
  if (!filters || !filters.conditions || filters.conditions.length === 0) {
    return ''
  }

  const conditions = filters.conditions.map((condition: any) => {
    if ('conditions' in condition) {
      // Nested group
      return `(${buildFilterSQLForGrouping(condition, columnMap)})`
    }

    // Single condition
    const column = columnMap.get(condition.columnId)
    if (!column) return ''

    const columnName = column.name
    const columnType = column.type
    const columnSQL = getColumnSQLReference(columnName, columnType)
    const { operator, value } = condition

    switch (operator) {
      case 'equals':
        return value === null 
          ? `"${columnName}" IS NULL`
          : `${columnSQL} = '${escapeSQLValue(value)}'`
      case 'notEquals':
        return value === null
          ? `"${columnName}" IS NOT NULL`
          : `${columnSQL} != '${escapeSQLValue(value)}'`
      case 'contains':
        return `${columnSQL} ILIKE '%${escapeSQLValue(value)}%'`
      case 'notContains':
        return `${columnSQL} NOT ILIKE '%${escapeSQLValue(value)}%'`
      case 'isEmpty':
        return `(${columnSQL} IS NULL OR ${columnSQL} = '')`
      case 'isNotEmpty':
        return `(${columnSQL} IS NOT NULL AND ${columnSQL} != '')`
      case 'gt':
        return `${columnSQL} > '${escapeSQLValue(value)}'`
      case 'gte':
        return `${columnSQL} >= '${escapeSQLValue(value)}'`
      case 'lt':
        return `${columnSQL} < '${escapeSQLValue(value)}'`
      case 'lte':
        return `${columnSQL} <= '${escapeSQLValue(value)}'`
      default:
        return ''
    }
  }).filter(Boolean)

  if (conditions.length === 0) return ''

  const separator = filters.operator === 'OR' ? ' OR ' : ' AND '
  return conditions.join(separator)
}

/**
 * Generate options based on column type
 */
async function generateOptionsByType(
  db: any,
  tableName: string,
  column: any,
  allColumns: any[],
  whereSQL: string,
  options: { maxOptions: number; includeEmpty: boolean; minCount: number }
): Promise<GroupOption[]> {
  switch (column.type) {
    case 'select':
    case 'status':
      return await getSelectOptions(db, tableName, column, whereSQL, options)
    
    case 'relation':
      return await getRelationOptions(db, tableName, column, allColumns, whereSQL, options)
    
    case 'text':
    case 'richtext':
    case 'email':
    case 'url':
    case 'phone':
    case 'user':
      return await getTextOptions(db, tableName, column, whereSQL, options)
    
    case 'number':
    case 'currency':
      return await getNumberOptions(db, tableName, column, whereSQL, options)
    
    case 'boolean':
      return await getBooleanOptions(db, tableName, column, whereSQL, options)
    
    case 'date':
    case 'datetime':
      return await getDateOptions(db, tableName, column, whereSQL, options)
    
    default:
      // For other types (formula, lookup, rollup), treat as text
      return await getTextOptions(db, tableName, column, whereSQL, options)
  }
}

/**
 * Get options for select/status fields
 */
async function getSelectOptions(
  db: any,
  tableName: string,
  column: any,
  whereSQL: string,
  { maxOptions, includeEmpty, minCount }: any
): Promise<GroupOption[]> {
  const config = column.config || {}
  const selectOptions = config.options || []

  // For select fields stored as JSONB, extract the text value
  const columnSQL = isJSONBColumnType(column.type) 
    ? `"${column.name}" #>> '{}'`
    : `"${column.name}"::text`

  // Build query to count per option
  let query = `
    SELECT 
      ${columnSQL} as group_value,
      COUNT(*) as count
    FROM "${tableName}"
  `

  if (whereSQL) {
    query += ` WHERE ${whereSQL}`
  }

  query += `
    GROUP BY ${columnSQL}
    ORDER BY count DESC
  `

  const results = await db.execute(sql.raw(query))
  
  // Create a map of counts from query results
  // The database stores the LABEL value, not the internal value
  const countMap = new Map<string | null, number>()
  for (const row of results) {
    const dbValue = row.group_value === null ? null : String(row.group_value).trim()
    countMap.set(dbValue, Number(row.count))
  }

  const options: GroupOption[] = []

  // Return ALL options from config (with counts from DB, including 0)
  for (const opt of selectOptions) {
    // Match by LABEL since that's what's stored in the database
    const count = countMap.get(opt.label) || 0
    
    options.push({
      id: opt.value,
      label: opt.label || opt.value,
      color: opt.color,
      count
    })
  }

  // Add empty/null group if it exists in data or if includeEmpty is true
  if (includeEmpty || countMap.has(null)) {
    const nullCount = countMap.get(null) || 0
    options.push({
      id: null,
      label: '(Empty)',
      count: nullCount
    })
  }

  return options.slice(0, maxOptions)
}

/**
 * Get options for relation fields
 */
async function getRelationOptions(
  db: any,
  tableName: string,
  column: any,
  allColumns: any[],
  whereSQL: string,
  { maxOptions, includeEmpty, minCount }: any
): Promise<GroupOption[]> {
  // For relations, the UUID is stored directly as JSONB string, not as an object
  // We need to extract the UUID, then lookup the display value from the related table
  
  // Get the relation config
  const relationConfig = column.config as any
  const targetTableSlug = relationConfig?.targetTable
  const displayField = relationConfig?.displayField || 'name'
  
  if (!targetTableSlug) {
    console.warn('Relation field missing targetTable config')
    return []
  }
  
  // Get the related table info by slug
  const [relatedTable] = await db
    .select()
    .from(schema.dataTables)
    .where(eq(schema.dataTables.slug, targetTableSlug))
  
  if (!relatedTable) {
    console.warn('Related table not found:', targetTableSlug)
    return []
  }
  
  // Extract UUID from JSONB and count
  let query = `
    SELECT 
      "${column.name}" #>> '{}' as related_id,
      COUNT(*) as count
    FROM "${tableName}"
  `

  if (whereSQL) {
    query += ` WHERE ${whereSQL}`
  }

  query += `
    GROUP BY "${column.name}" #>> '{}'
    HAVING COUNT(*) >= ${minCount}
    ORDER BY count DESC
    LIMIT ${maxOptions}
  `

  const results = await db.execute(sql.raw(query))
  
  // Build physical table name for related table
  const relatedPhysicalTableName = `${relatedTable.tableName}`
  
  // Get related table's columns to determine displayField type
  const relatedColumns = await db
    .select()
    .from(schema.dataTableColumns)
    .where(eq(schema.dataTableColumns.dataTableId, relatedTable.id))
  
  const displayFieldColumn = relatedColumns.find((c: any) => c.name === displayField)
  
  // Determine if display field is JSONB or native type
  const isDisplayFieldJSONB = displayFieldColumn && [
    'relation', 'select', 'currency', 'multiSelect', 'user', 'attachment'
  ].includes(displayFieldColumn.type)
  
  // Build the display value extraction SQL based on column type
  const displayValueSQL = isDisplayFieldJSONB 
    ? `"${displayField}" #>> '{}' as display_value`
    : `"${displayField}"::text as display_value`
  
  // Now lookup display values for each related ID in a single query
  if (results.length === 0) {
    return []
  }
  
  const relatedIds = results
    .map((r: any) => r.related_id)
    .filter((id: any) => id && id !== 'null')
  
  let displayValueMap = new Map<string, string>()
  
  if (relatedIds.length > 0) {
    try {
      const displayQuery = `
        SELECT id, ${displayValueSQL}
        FROM "${relatedPhysicalTableName}" 
        WHERE id = ANY(ARRAY[${relatedIds.map((id: any) => `'${id}'`).join(', ')}]::uuid[])
      `
      const displayResults = await db.execute(sql.raw(displayQuery))
      
      for (const row of displayResults) {
        if (row.display_value) {
          displayValueMap.set(row.id, row.display_value)
        }
      }
    } catch (error) {
      console.error(`Failed to fetch display values for relation:`, error)
    }
  }
  
  // Build final options
  const options: GroupOption[] = []

  for (const row of results) {
    const relatedId = row.related_id
    
    if (!relatedId || relatedId === 'null') {
      if (includeEmpty) {
        options.push({
          id: null,
          label: '(Empty)',
          count: Number(row.count)
        })
      }
    } else {
      options.push({
        id: relatedId,
        label: displayValueMap.get(relatedId) || relatedId,
        count: Number(row.count)
      })
    }
  }

  return options
}

/**
 * Get options for text fields (unique values)
 */
async function getTextOptions(
  db: any,
  tableName: string,
  column: any,
  whereSQL: string,
  { maxOptions, includeEmpty, minCount }: any
): Promise<GroupOption[]> {
  let query = `
    SELECT 
      "${column.name}"::text as group_value,
      COUNT(*) as count
    FROM "${tableName}"
  `

  if (whereSQL) {
    query += ` WHERE ${whereSQL}`
  }

  query += `
    GROUP BY "${column.name}"
    HAVING COUNT(*) >= ${minCount}
    ORDER BY count DESC
    LIMIT ${maxOptions}
  `

  const results = await db.execute(sql.raw(query))
  const options: GroupOption[] = []

  for (const row of results) {
    if (row.group_value === null || row.group_value === '') {
      if (includeEmpty) {
        options.push({
          id: null,
          label: '(Empty)',
          count: Number(row.count)
        })
      }
    } else {
      options.push({
        id: row.group_value,
        label: row.group_value,
        count: Number(row.count)
      })
    }
  }

  return options
}

/**
 * Get options for number fields (unique values or ranges)
 */
async function getNumberOptions(
  db: any,
  tableName: string,
  column: any,
  whereSQL: string,
  { maxOptions, includeEmpty, minCount }: any
): Promise<GroupOption[]> {
  // For now, treat as unique values (can add range grouping later)
  let query = `
    SELECT 
      "${column.name}"::text as group_value,
      COUNT(*) as count
    FROM "${tableName}"
  `

  if (whereSQL) {
    query += ` WHERE ${whereSQL}`
  }

  query += `
    GROUP BY "${column.name}"
    HAVING COUNT(*) >= ${minCount}
    ORDER BY "${column.name}" ASC
    LIMIT ${maxOptions}
  `

  const results = await db.execute(sql.raw(query))
  const options: GroupOption[] = []

  for (const row of results) {
    if (row.group_value === null) {
      if (includeEmpty) {
        options.push({
          id: null,
          label: '(Empty)',
          count: Number(row.count)
        })
      }
    } else {
      options.push({
        id: row.group_value,
        label: row.group_value,
        count: Number(row.count)
      })
    }
  }

  return options
}

/**
 * Get options for boolean fields
 */
async function getBooleanOptions(
  db: any,
  tableName: string,
  column: any,
  whereSQL: string,
  { includeEmpty, minCount }: any
): Promise<GroupOption[]> {
  let query = `
    SELECT 
      "${column.name}"::text as group_value,
      COUNT(*) as count
    FROM "${tableName}"
  `

  if (whereSQL) {
    query += ` WHERE ${whereSQL}`
  }

  query += `
    GROUP BY "${column.name}"
    HAVING COUNT(*) >= ${minCount}
  `

  const results = await db.execute(sql.raw(query))
  const options: GroupOption[] = []

  for (const row of results) {
    if (row.group_value === null) {
      if (includeEmpty) {
        options.push({
          id: null,
          label: '(Empty)',
          count: Number(row.count)
        })
      }
    } else {
      options.push({
        id: row.group_value,
        label: row.group_value === 'true' ? 'Yes' : 'No',
        count: Number(row.count)
      })
    }
  }

  return options
}

/**
 * Get options for date fields (predefined ranges)
 */
async function getDateOptions(
  db: any,
  tableName: string,
  column: any,
  whereSQL: string,
  { includeEmpty, minCount }: any
): Promise<GroupOption[]> {
  // For now, return unique dates (can add range grouping later)
  let query = `
    SELECT 
      "${column.name}"::text as group_value,
      COUNT(*) as count
    FROM "${tableName}"
  `

  if (whereSQL) {
    query += ` WHERE ${whereSQL}`
  }

  query += `
    GROUP BY "${column.name}"
    HAVING COUNT(*) >= ${minCount}
    ORDER BY "${column.name}" DESC
    LIMIT 50
  `

  const results = await db.execute(sql.raw(query))
  const options: GroupOption[] = []

  for (const row of results) {
    if (row.group_value === null) {
      if (includeEmpty) {
        options.push({
          id: null,
          label: '(No Date)',
          count: Number(row.count)
        })
      }
    } else {
      // Format date nicely
      const date = new Date(row.group_value)
      options.push({
        id: row.group_value,
        label: date.toLocaleDateString(),
        count: Number(row.count)
      })
    }
  }

  return options
}

