import { successResponse } from '~~/server/utils/response'
import { generateJSONCompletion, isAIEnabled, getAIProvider } from '~~/server/utils/ai'
import type { TableColumnDef } from '#shared/types/db'
import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'
import { suggestFieldType, getFieldType } from '~~/server/utils/fieldTypes'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { columnName, columnLabel, tableDescription, appSlug, currentTableColumns } = body

  if (!columnName) {
    throw createError({
      statusCode: 400,
      message: 'Column name is required'
    })
  }

  // Get app context to understand existing table structures
  let appContext = null
  if (appSlug) {
    try {
      appContext = await getAppContext(event, appSlug)
    } catch (error) {
      console.warn('Could not fetch app context:', error)
      // Continue without context
    }
  }

  // Check if AI is configured
  if (!isAIEnabled()) {
    console.warn('AI not configured. Using fallback logic.')
    const fallback = fallbackColumnSuggestion(columnName, columnLabel)
    return successResponse({
      type: fallback.type,
      required: fallback.required,
      config: fallback.config,
      aiEnabled: false
    })
  }

  try {
    // Build context for the LLM with rich information
    const prompt = buildPromptContext(
      columnName, 
      columnLabel, 
      tableDescription, 
      currentTableColumns,
      appContext
    )
    
    // Call AI API (works with both OpenAI and Ollama)
    const aiResponse = await generateJSONCompletion<{
      type: string
      required: boolean
      config: any
      confidence: string
      reason: string
    }>(
      [
        {
          role: 'system',
          content: 'You are a database schema design expert. Analyze column requirements and suggest complete, production-ready column configurations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      {
        temperature: 0.3,
        maxTokens: 500
      }
    )

    if (!aiResponse) {
      throw new Error('Failed to parse AI response')
    }

    // Return slim response - just the essentials
    return successResponse({
        type: aiResponse.type || 'text',
        required: aiResponse.required ?? false,
      config: aiResponse.config || {},
      aiEnabled: true
    })
  } catch (error: any) {
    console.error('Error calling AI:', error)
    
    // Fallback to basic suggestion if AI fails
    const fallback = fallbackColumnSuggestion(columnName, columnLabel)
    return successResponse({
      type: fallback.type,
      required: fallback.required,
      config: fallback.config,
      aiEnabled: false
    })
  }
})

/**
 * Get app context including existing tables and their schemas
 */
async function getAppContext(event: any, appSlug: string) {
  
  // Get app with company context
  const { app, company } = event.context
  
  if (!app || app.slug !== appSlug) {
    // Query the app if not in context
    const appRecord = await db
      .select()
      .from(schema.apps)
      .where(eq(schema.apps.slug, appSlug))
      .limit(1)
      .then(rows => rows[0])
    
    if (!appRecord) {
      return null
    }
    
    // Get all tables in this app with their columns
    const existingTables = await db
      .select({
        table: schema.dataTables,
        columns: schema.dataTableColumns
      })
      .from(schema.dataTables)
      .leftJoin(schema.dataTableColumns, eq(schema.dataTables.id, schema.dataTableColumns.dataTableId))
      .where(eq(schema.dataTables.appId, appRecord.id))
    
    // Group columns by table
    const tablesMap = new Map()
    for (const row of existingTables) {
      if (!row.table) continue
      
      if (!tablesMap.has(row.table.id)) {
        tablesMap.set(row.table.id, {
          name: row.table.name,
          description: row.table.description,
          columns: []
        })
      }
      
      if (row.columns) {
        tablesMap.get(row.table.id).columns.push({
          name: row.columns.name,
          label: row.columns.label,
          type: row.columns.type,
          required: row.columns.required
        })
      }
    }
    
    return {
      appName: appRecord.name,
      tables: Array.from(tablesMap.values())
    }
  }
  
  return null
}


/**
 * Build a rich prompt for the LLM to suggest complete column configuration
 */
function buildPromptContext(
  columnName: string, 
  columnLabel?: string, 
  tableDescription?: string,
  currentTableColumns?: TableColumnDef[],
  appContext?: any
): string {
  const availableTypes = [
    'text - Short text fields (names, titles, email, phone, single-line inputs)',
    'long_text - Longer text content (descriptions, notes, comments, multi-line content)',
    'number - Numeric values (quantities, prices, counts, scores, ratings)',
    'date - Date and time values (birthdays, created_at, due_date, scheduled_time)',
    'switch - Boolean yes/no values (is_active, is_published, enabled, completed)'
  ]

  let prompt = `Analyze this new database column and suggest a complete, production-ready configuration.

# Available Column Types
${availableTypes.map(t => `- ${t}`).join('\n')}

# New Column Information
- Column name: "${columnName}"
- Display label: "${columnLabel || 'Not provided'}"
${tableDescription ? `- Table purpose: "${tableDescription}"` : ''}

# Current Table Columns`

  if (currentTableColumns && currentTableColumns.length > 0) {
    prompt += `\nExisting columns in this table:`
    currentTableColumns.forEach((col: any) => {
      prompt += `\n- ${col.name} (${col.label}): ${col.type}${col.required ? ' [Required]' : ''}`
      if (col.config) {
        const configDetails = []
        if (col.config.maxLength) configDetails.push(`max:${col.config.maxLength}`)
        if (col.config.min !== undefined) configDetails.push(`min:${col.config.min}`)
        if (col.config.max !== undefined) configDetails.push(`max:${col.config.max}`)
        if (configDetails.length > 0) {
          prompt += ` (${configDetails.join(', ')})`
        }
      }
    })
  } else {
    prompt += `\nThis is the first column in a new table.`
  }

  // Add app context if available
  if (appContext?.tables?.length > 0) {
    prompt += `\n\n# Related Tables in This App`
    if (appContext.appName) {
      prompt += `\nApp: "${appContext.appName}"`
    }
    for (const table of appContext.tables.slice(0, 3)) { // Limit to first 3 tables
      prompt += `\n\n## ${table.name}`
      if (table.description) {
        prompt += ` - ${table.description}`
      }
      if (table.columns?.length > 0) {
        prompt += `\nColumns: ${table.columns.map((c: any) => `${c.name}(${c.type})`).join(', ')}`
      }
    }
  }

  prompt += `\n\n# Your Task
Analyze the column name, label, existing table structure, and app context to suggest:
1. The most appropriate column type
2. Whether it should be required
3. Smart configuration options (validations, formats, constraints)
4. Helpful placeholder text

# Configuration Options by Type

**text**:
- maxLength: Maximum character limit (e.g., 100 for names, 255 for emails)
- minLength: Minimum character limit (optional)
- placeholder: Helpful example text

**long_text**:
- maxLength: Character limit (e.g., 1000-5000)
- placeholder: Helpful example text

**number**:
- min: Minimum value (e.g., 0 for quantities, prices)
- max: Maximum value (optional)
- decimals: Decimal places (0 for integers, 2 for currency)

**date**:
- format: "date" (date only), "datetime" (date + time), or "time" (time only)

**switch**:
- defaultValue: true or false

# Response Format (JSON only)
{
  "type": "text|long_text|number|date|switch",
  "required": boolean,
  "config": {
    // Include ONLY relevant config fields for the chosen type
    // Examples:
    // For text: { "maxLength": 255, "placeholder": "john@example.com" }
    // For number: { "min": 0, "max": 100, "decimals": 0 }
    // For date: { "format": "datetime" }
  },
  "confidence": "high|medium|low",
  "reason": "Brief 1-2 sentence explanation of why these settings make sense"
}

# Best Practices
- Common fields (name, email, phone) should be required
- Email/URL fields need appropriate maxLength (255)
- Prices/money should have decimals: 2, min: 0
- Quantities/counts should have decimals: 0, min: 0
- Descriptions should be long_text with 1000-5000 maxLength
- Status fields (is_active, enabled) should be switch with defaultValue
- Timestamps should be date with format: "datetime"
- Due dates/birthdays should be date with format: "date"

Respond with ONLY valid JSON, no other text.`

  return prompt
}

/**
 * Fallback logic when AI is not available - returns full column config
 */
function fallbackColumnSuggestion(columnName: string, columnLabel?: string): TableColumnDef {
  const lowerName = columnName.toLowerCase()
  let type: any = 'text'
  let required = false
  let config: any = {}

  // Boolean/Switch patterns
  if (lowerName.match(/^(is|has|can|should|enable|active|visible|published|deleted|archived)/)) {
    type = 'switch'
    config = { defaultValue: false }
  }
  // Date patterns
  else if (lowerName.match(/(date|time|timestamp|created|updated|deleted|published|scheduled|due|start|end|birthday)/)) {
    type = 'date'
    if (lowerName.includes('time') || lowerName.includes('timestamp') || lowerName.includes('created') || lowerName.includes('updated')) {
      config = { format: 'datetime' }
    } else {
      config = { format: 'date' }
    }
  }
  // Number patterns
  else if (lowerName.match(/(count|amount|price|quantity|number|num|age|year|score|rating|total|sum|qty|cost)/)) {
    type = 'number'
    if (lowerName.includes('price') || lowerName.includes('amount') || lowerName.includes('cost')) {
      config = { min: 0, decimals: 2 }
    } else if (lowerName.includes('count') || lowerName.includes('quantity') || lowerName.includes('qty')) {
      config = { min: 0, decimals: 0 }
    }
  }
  // Long text patterns
  else if (lowerName.match(/(description|notes|content|body|text|comment|message|bio|about|details|summary)/)) {
    type = 'long_text'
    config = { maxLength: 5000, placeholder: `Enter ${columnLabel || columnName}...` }
  }
  // Text patterns
  else {
    type = 'text'
    
    // Email pattern
    if (lowerName.includes('email')) {
      required = true
      config = { maxLength: 255, placeholder: 'name@example.com' }
    }
    // Name patterns
    else if (lowerName.match(/(name|title)/)) {
      required = lowerName.includes('name')
      config = { maxLength: 200 }
    }
    // Phone patterns
    else if (lowerName.includes('phone')) {
      config = { maxLength: 20, placeholder: '+1 234 567 8900' }
    }
    // URL patterns
    else if (lowerName.includes('url') || lowerName.includes('link') || lowerName.includes('website')) {
      config = { maxLength: 500, placeholder: 'https://...' }
    }
    // Default text
    else {
      config = { maxLength: 255 }
    }
  }

  return {
    name: columnName,
    label: columnLabel || generateLabelFromName(columnName),
    type,
    required,
    config
  }
}

/**
 * Generate a label from column name
 */
function generateLabelFromName(name: string): string {
  if (!name) return ''
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}
