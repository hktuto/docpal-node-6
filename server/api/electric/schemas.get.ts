/**
 * Electric Schemas API
 * 
 * Returns PGlite-compatible CREATE TABLE statements for all synced tables.
 * This allows the client to reuse server-side Drizzle schema definitions
 * instead of manually maintaining duplicate schemas.
 * 
 * GET /api/electric/schemas
 */

import { db } from 'hub:db'
import { sql } from 'drizzle-orm'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  try {
    // Tables that are synced via Electric
    const syncedTables = [
      'users',
      'companies',
      'workspaces',
      'data_tables',
      'data_table_columns',
    ]

    const schemas: Record<string, string> = {}

    console.log('[Electric Schemas] Generating schemas for:', syncedTables)

    // For each table, get its CREATE TABLE definition from PostgreSQL
    for (const tableName of syncedTables) {
      try {
        console.log(`[Electric Schemas] Processing table: ${tableName}`)
        
        // Query PostgreSQL's information_schema to generate CREATE TABLE
        const result = await db.execute(sql`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length
          FROM information_schema.columns
          WHERE table_name = ${tableName}
            AND table_schema = 'public'
          ORDER BY ordinal_position
        `)

        // Drizzle's execute() returns the array directly, not {rows: []}
        const columns = result as any[]

        // Check if table exists
        if (!columns || columns.length === 0) {
          console.warn(`[Electric Schemas] Table '${tableName}' not found or has no columns, skipping...`)
          continue
        }
        
        console.log(`[Electric Schemas] Table ${tableName} - Processing ${columns.length} columns`)

        // Build CREATE TABLE statement
        const columnDefs = columns.map(col => {
        let def = `"${col.column_name}" `

        // Map PostgreSQL types to PGlite types
        switch (col.data_type) {
          case 'uuid':
            def += 'UUID'
            break
          case 'character varying':
          case 'text':
            def += 'TEXT'
            break
          case 'integer':
          case 'bigint':
            def += 'INTEGER'
            break
          case 'numeric':
          case 'double precision':
            def += 'NUMERIC'
            break
          case 'boolean':
            def += 'BOOLEAN'
            break
          case 'timestamp without time zone':
          case 'timestamp with time zone':
            def += 'TIMESTAMP'
            break
          case 'jsonb':
          case 'json':
            def += 'JSONB'
            break
          case 'date':
            def += 'DATE'
            break
          default:
            def += 'TEXT'
        }

        // Add NOT NULL constraint
        if (col.is_nullable === 'NO' && !col.column_default?.includes('nextval')) {
          def += ' NOT NULL'
        }

        // Add DEFAULT (simplified - only handle simple cases)
        if (col.column_default) {
          if (col.column_default.includes('now()')) {
            // Skip DEFAULT NOW() - PGlite handles this differently
          } else if (col.column_default.includes('gen_random_uuid()')) {
            // Skip UUID generation
          } else if (col.column_default === 'false') {
            def += ' DEFAULT false'
          } else if (col.column_default === 'true') {
            def += ' DEFAULT true'
          } else if (!isNaN(Number(col.column_default))) {
            def += ` DEFAULT ${col.column_default}`
          }
        }

        return def
      }).join(',\n      ')

      // Check for primary key
      const pkResult = await db.execute(sql`
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = ${tableName}::regclass
          AND i.indisprimary
      `) as any[]
      
      const primaryKey = pkResult[0]?.attname

      schemas[tableName] = `
CREATE TABLE IF NOT EXISTS "${tableName}" (
      ${columnDefs}${primaryKey ? `,\n      PRIMARY KEY ("${primaryKey}")` : ''}
)`.trim()

        console.log(`[Electric Schemas] ✓ Generated schema for ${tableName}`)
        
      } catch (tableError) {
        console.error(`[Electric Schemas] Failed to process table '${tableName}':`, tableError)
        // Continue with other tables
      }
    }

    // Check if any schemas were generated
    if (Object.keys(schemas).length === 0) {
      console.warn('[Electric Schemas] No schemas generated - tables may not exist yet. Run migrations first.')
      return successResponse({
        schemas: {},
        tables: [],
        generatedAt: new Date().toISOString(),
        warning: 'No tables found. Please run database migrations: pnpm db:migrate'
      })
    }

    console.log(`[Electric Schemas] ✓ Successfully generated ${Object.keys(schemas).length} schemas`)

    return successResponse({
      schemas,
      tables: Object.keys(schemas),
      generatedAt: new Date().toISOString(),
    })

  } catch (error) {
    console.error('[Electric Schemas] Error:', error)
    throw createError({
      statusCode: 500,
      message: `Failed to generate schemas: ${(error as Error).message}`
    })
  }
})

