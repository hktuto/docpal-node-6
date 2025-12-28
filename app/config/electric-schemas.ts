/**
 * PGlite Schema Definitions for Electric Sync
 * 
 * Fetches schemas from server API instead of maintaining them manually.
 * This ensures single source of truth with Drizzle schemas.
 */

// Cache schemas to avoid repeated API calls
let schemasCache: Record<string, string> | null = null
let schemasPromise: Promise<Record<string, string>> | null = null

/**
 * Fetch schemas from server API (with caching)
 */
export async function getElectricSchemas(): Promise<Record<string, string>> {
  // Return cached schemas if available
  if (schemasCache) {
    return schemasCache
  }

  // Return in-flight promise if already fetching
  if (schemasPromise) {
    return schemasPromise
  }

  // Fetch schemas from API
  schemasPromise = (async () => {
    try {
      console.log('[Electric Schemas] Fetching from API...')
      const response = await $fetch('/api/electric/schemas')
      
      if (!response.data || !response.data.schemas) {
        throw new Error('Invalid response from schemas API')
      }
      
      schemasCache = response.data.schemas
      
      // Check if any schemas were returned
      const schemaCount = Object.keys(schemasCache).length
      if (schemaCount === 0) {
        console.warn('[Electric Schemas] No schemas available. Have you run migrations?')
        if (response.data.warning) {
          console.warn('[Electric Schemas]', response.data.warning)
        }
      } else {
        console.log('[Electric Schemas] Fetched', schemaCount, 'schemas')
      }
      
      return schemasCache
    } catch (error) {
      console.error('[Electric Schemas] Failed to fetch:', error)
      schemasPromise = null // Allow retry
      throw error
    }
  })()

  return schemasPromise
}

/**
 * Get schema for a specific table
 */
export async function getTableSchema(tableName: string): Promise<string | null> {
  const schemas = await getElectricSchemas()
  return schemas[tableName] || null
}

/**
 * Clear schemas cache (used during migrations)
 */
export function clearSchemasCache() {
  schemasCache = null
  schemasPromise = null
  console.log('[Electric Schemas] Cache cleared')
}

/**
 * Create a dynamic table schema based on its columns
 */
export function createDynamicTableSchema(
  tableName: string,
  columns: Array<{
    name: string
    type: string
    required: boolean
    is_unique: boolean
  }>
): string {
  const columnDefs = columns.map(col => {
    let def = `"${col.name}" `

    // Map column types to PostgreSQL types
    switch (col.type) {
      case 'text':
      case 'long_text':
      case 'email':
      case 'url':
      case 'phone':
      case 'select':
      case 'multi_select':
      case 'color':
        def += 'TEXT'
        break
      case 'number':
      case 'currency':
      case 'rating':
        def += 'NUMERIC'
        break
      case 'date':
      case 'datetime':
        def += 'TIMESTAMP'
        break
      case 'switch':
      case 'checkbox':
        def += 'BOOLEAN'
        break
      case 'json':
      case 'formula':
      case 'lookup':
      case 'rollup':
        def += 'JSONB'
        break
      case 'relation':
        def += 'UUID'
        break
      default:
        def += 'TEXT'
    }

    if (col.required) {
      def += ' NOT NULL'
    }

    if (col.is_unique) {
      def += ' UNIQUE'
    }

    return def
  }).join(',\n      ')

  return `
    CREATE TABLE IF NOT EXISTS "${tableName}" (
      id UUID PRIMARY KEY,
      company_id UUID NOT NULL,
      ${columnDefs},
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL,
      created_by UUID
    )
  `
}

