import { defineApiResponse } from '~/server/utils/response'
import type { TableColumnDef } from '#shared/types/db'
import OpenAI from 'openai'

export default defineEventHandler(async (event) => {
  return defineApiResponse(event, async () => {
    const body = await readBody(event)
    const { columnName, columnLabel, tableDescription, appSlug } = body

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

    // Get Ollama configuration from environment
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b'

    // Check if Ollama is configured
    if (!process.env.OLLAMA_BASE_URL && !process.env.OLLAMA_MODEL) {
      console.warn('Ollama not configured. Using fallback logic.')
      return {
        suggestedColumn: fallbackColumnSuggestion(columnName, columnLabel),
        confidence: 'low',
        reason: 'AI not configured. Using basic pattern matching.',
        aiEnabled: false
      }
    }

    try {
      // Initialize OpenAI client with Ollama endpoint
      const openai = new OpenAI({
        baseURL: `${ollamaBaseUrl}/v1`,  // Ollama's OpenAI-compatible endpoint
        apiKey: 'ollama', // Required by SDK but not used by Ollama
        timeout: 10000, // 10 second timeout
      })

      // Build messages for the AI
      const systemPrompt = buildSystemPrompt()
      const userPrompt = buildUserPrompt(columnName, columnLabel, tableDescription, appContext)
      
      // Call Ollama via OpenAI-compatible API
      const completion = await openai.chat.completions.create({
        model: ollamaModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        top_p: 0.9,
        response_format: { type: 'json_object' }, // Force JSON response!
      })

      // Parse the response
      const responseText = completion.choices[0]?.message?.content || '{}'
      const suggestion = parseAIResponse(responseText, columnName, columnLabel)
      
      return {
        ...suggestion,
        aiEnabled: true
      }
    } catch (error: any) {
      console.error('Error calling Ollama:', error)
      
      // Fallback to basic suggestion if AI fails
      return {
        suggestedColumn: fallbackColumnSuggestion(columnName, columnLabel),
        confidence: 'low',
        reason: `AI service unavailable: ${error.message}. Using basic pattern matching.`,
        aiEnabled: false
      }
    }
  })
})

/**
 * Get app context including existing tables and their schemas
 */
async function getAppContext(event: any, appSlug: string) {
  const db = await useDatabase()
  
  // Get app with company context
  const { app, company } = event.context
  
  if (!app || app.slug !== appSlug) {
    // Query the app if not in context
    const tables = await import('hub:db:schema')
    const { apps, dataTables, dataTableColumns } = tables
    const { eq, and } = await import('drizzle-orm')
    
    const appRecord = await db
      .select()
      .from(apps)
      .where(eq(apps.slug, appSlug))
      .limit(1)
      .then(rows => rows[0])
    
    if (!appRecord) {
      return null
    }
    
    // Get all tables in this app with their columns
    const existingTables = await db
      .select({
        table: dataTables,
        columns: dataTableColumns
      })
      .from(dataTables)
      .leftJoin(dataTableColumns, eq(dataTables.id, dataTableColumns.dataTableId))
      .where(eq(dataTables.appId, appRecord.id))
    
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
 * Build system prompt for the AI
 */
function buildSystemPrompt(): string {
  return `You are a database schema expert. Your task is to analyze column information and suggest complete, production-ready column configurations.

Available column types:
- text: Short text fields (names, emails, titles, single-line inputs)
- long_text: Multi-line content (descriptions, notes, articles)
- number: Numeric values (prices, quantities, counts, ages)
- date: Date and time values (timestamps, birthdays, deadlines)
- switch: Boolean yes/no values (active/inactive, enabled/disabled)

You MUST respond with ONLY valid JSON in this exact format:
{
  "type": "text|long_text|number|date|switch",
  "required": true|false,
  "config": {
    // For text: "maxLength" (number), "placeholder" (string)
    // For long_text: "maxLength" (number), "placeholder" (string)
    // For number: "min" (number), "max" (number), "decimals" (number)
    // For date: "format" ("date"|"datetime"|"time")
    // For switch: "defaultValue" (boolean)
    // Only include relevant fields for the type
  },
  "confidence": "high|medium|low",
  "reason": "brief explanation (1-2 sentences)"
}

Rules:
- Common fields like "email", "name", "title" should be required: true
- Set reasonable maxLength for text fields (100-500 depending on use)
- Add helpful, realistic placeholders
- For prices/money, use decimals: 2 and min: 0
- For quantities/counts, use decimals: 0 and min: 0
- Respond with ONLY the JSON object, no markdown, no explanations`
}

/**
 * Build user prompt with column context
 */
function buildUserPrompt(
  columnName: string,
  columnLabel?: string,
  tableDescription?: string,
  appContext?: any
): string {
  let prompt = `Analyze this column and provide configuration:\n\nColumn name: "${columnName}"`

  if (columnLabel) {
    prompt += `\nColumn label: "${columnLabel}"`
  }

  if (tableDescription) {
    prompt += `\nTable description: "${tableDescription}"`
  }

  // Add app context if available
  if (appContext?.tables?.length > 0) {
    prompt += `\n\nExisting tables in this app:`
    for (const table of appContext.tables.slice(0, 3)) {
      prompt += `\n- ${table.name}${table.description ? ` (${table.description})` : ''}`
      if (table.columns?.length > 0) {
        prompt += `\n  Columns: ${table.columns.map((c: any) => `${c.name}:${c.type}`).join(', ')}`
      }
    }
    prompt += `\n\nConsider existing patterns when suggesting the configuration.`
  }

  prompt += `\n\nProvide the JSON configuration now:`

  return prompt
}

/**
 * Parse AI response and extract full column suggestion
 */
function parseAIResponse(aiResponse: string, columnName: string, columnLabel?: string): {
  suggestedColumn: TableColumnDef
  confidence: string
  reason: string
} {
  try {
    // Try to parse the JSON response directly
    const parsed = JSON.parse(aiResponse)
    
    return {
      suggestedColumn: {
        name: columnName,
        label: columnLabel || generateLabelFromName(columnName),
        type: parsed.type || 'text',
        required: parsed.required ?? false,
        config: parsed.config || {}
      },
      confidence: parsed.confidence || 'medium',
      reason: parsed.reason || 'Suggested by AI'
    }
  } catch (error) {
    console.error('Error parsing AI response:', error)
    console.error('Response was:', aiResponse)
  }

  // If parsing fails, try to extract JSON from the response
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      
      return {
        suggestedColumn: {
          name: columnName,
          label: columnLabel || generateLabelFromName(columnName),
          type: parsed.type || 'text',
          required: parsed.required ?? false,
          config: parsed.config || {}
        },
        confidence: parsed.confidence || 'medium',
        reason: parsed.reason || 'Suggested by AI'
      }
    }
  } catch (error) {
    console.error('Error extracting JSON from response:', error)
  }

  // If all parsing fails, try to extract type from text
  const lowerResponse = aiResponse.toLowerCase()
  let type = 'text'
  let reason = 'Default text type'
  
  if (lowerResponse.includes('long_text') || lowerResponse.includes('long text')) {
    type = 'long_text'
    reason = 'Contains description or notes'
  } else if (lowerResponse.includes('number') || lowerResponse.includes('numeric')) {
    type = 'number'
    reason = 'Appears to be numeric data'
  } else if (lowerResponse.includes('date') || lowerResponse.includes('time')) {
    type = 'date'
    reason = 'Appears to be date/time data'
  } else if (lowerResponse.includes('switch') || lowerResponse.includes('boolean')) {
    type = 'switch'
    reason = 'Appears to be boolean data'
  }

  return {
    suggestedColumn: {
      name: columnName,
      label: columnLabel || generateLabelFromName(columnName),
      type: type as any,
      required: false,
      config: {}
    },
    confidence: 'low',
    reason
  }
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
