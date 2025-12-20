import { defineApiResponse } from '~/server/utils/response'

export default defineEventHandler(async (event) => {
  return defineApiResponse(event, async () => {
    const body = await readBody(event)
    const { columnName, columnLabel, tableDescription } = body

    if (!columnName) {
      throw createError({
        statusCode: 400,
        message: 'Column name is required'
      })
    }

    // Get Ollama configuration from environment
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b'

    // Check if Ollama is configured
    if (!process.env.OLLAMA_BASE_URL && !process.env.OLLAMA_MODEL) {
      console.warn('Ollama not configured. Using fallback logic.')
      return {
        suggestedType: fallbackTypeSuggestion(columnName),
        confidence: 'low',
        reason: 'AI not configured. Using basic pattern matching.',
        aiEnabled: false
      }
    }

    try {
      // Build context for the LLM
      const context = buildPromptContext(columnName, columnLabel, tableDescription)
      
      // Call Ollama API
      const response = await $fetch(`${ollamaBaseUrl}/api/generate`, {
        method: 'POST',
        body: {
          model: ollamaModel,
          prompt: context,
          stream: false,
          options: {
            temperature: 0.3, // Lower temperature for more consistent results
            top_p: 0.9,
          }
        },
        timeout: 10000 // 10 second timeout
      })

      // Parse the response
      const suggestion = parseAIResponse(response.response)
      
      return {
        ...suggestion,
        aiEnabled: true
      }
    } catch (error: any) {
      console.error('Error calling Ollama:', error)
      
      // Fallback to basic suggestion if AI fails
      return {
        suggestedType: fallbackTypeSuggestion(columnName),
        confidence: 'low',
        reason: `AI service unavailable: ${error.message}. Using basic pattern matching.`,
        aiEnabled: false
      }
    }
  })
})

/**
 * Build a prompt for the LLM to suggest column type
 */
function buildPromptContext(
  columnName: string, 
  columnLabel?: string, 
  tableDescription?: string
): string {
  const availableTypes = [
    'text - for short text fields (names, titles, single-line inputs)',
    'long_text - for longer text content (descriptions, notes, multi-line content)',
    'number - for numeric values (quantities, prices, counts)',
    'date - for date and time values',
    'switch - for boolean yes/no values (active/inactive, enabled/disabled)'
  ]

  let prompt = `You are a database schema expert. Suggest the most appropriate column type for a database field.

Available column types:
${availableTypes.map(t => `- ${t}`).join('\n')}

Column information:
- Column name: "${columnName}"`

  if (columnLabel) {
    prompt += `\n- Display label: "${columnLabel}"`
  }
  
  if (tableDescription) {
    prompt += `\n- Table description: "${tableDescription}"`
  }

  prompt += `\n\nRespond in JSON format ONLY with this exact structure:
{
  "type": "one of: text, long_text, number, date, switch",
  "confidence": "one of: high, medium, low",
  "reason": "brief explanation why this type fits best"
}

JSON response:`

  return prompt
}

/**
 * Parse AI response and extract suggestion
 */
function parseAIResponse(aiResponse: string): {
  suggestedType: string
  confidence: string
  reason: string
} {
  try {
    // Try to extract JSON from the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        suggestedType: parsed.type || 'text',
        confidence: parsed.confidence || 'medium',
        reason: parsed.reason || 'Suggested by AI'
      }
    }
  } catch (error) {
    console.error('Error parsing AI response:', error)
  }

  // If parsing fails, try to extract type from text
  const lowerResponse = aiResponse.toLowerCase()
  if (lowerResponse.includes('long_text') || lowerResponse.includes('long text')) {
    return { suggestedType: 'long_text', confidence: 'medium', reason: 'Contains description or notes' }
  }
  if (lowerResponse.includes('number') || lowerResponse.includes('numeric')) {
    return { suggestedType: 'number', confidence: 'medium', reason: 'Appears to be numeric data' }
  }
  if (lowerResponse.includes('date') || lowerResponse.includes('time')) {
    return { suggestedType: 'date', confidence: 'medium', reason: 'Appears to be date/time data' }
  }
  if (lowerResponse.includes('switch') || lowerResponse.includes('boolean')) {
    return { suggestedType: 'switch', confidence: 'medium', reason: 'Appears to be boolean data' }
  }

  return { suggestedType: 'text', confidence: 'low', reason: 'Default text type' }
}

/**
 * Fallback logic when AI is not available
 */
function fallbackTypeSuggestion(columnName: string): string {
  const lowerName = columnName.toLowerCase()

  // Boolean/Switch patterns
  if (lowerName.match(/^(is|has|can|should|enable|active|visible|published|deleted|archived)/)) {
    return 'switch'
  }

  // Date patterns
  if (lowerName.match(/(date|time|timestamp|created|updated|deleted|published|scheduled|due|start|end|birthday)/)) {
    return 'date'
  }

  // Number patterns
  if (lowerName.match(/(count|amount|price|quantity|number|num|id|age|year|score|rating|total|sum|qty|cost)/)) {
    return 'number'
  }

  // Long text patterns
  if (lowerName.match(/(description|notes|content|body|text|comment|message|bio|about|details|summary)/)) {
    return 'long_text'
  }

  // Default to text
  return 'text'
}
