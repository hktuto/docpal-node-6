import OpenAI from 'openai'

/**
 * AI Service - Supports both OpenAI and self-hosted LLMs (Ollama, etc.)
 * 
 * Configuration via environment variables:
 * - OPENAI_API_KEY: Your OpenAI API key (required for OpenAI)
 * - OPENAI_MODEL: Model to use (default: gpt-4o-mini)
 * - AI_BASE_URL: Custom base URL for self-hosted LLMs (e.g., http://localhost:11434/v1)
 * - AI_MODEL: Model name for self-hosted (e.g., qwen2.5-coder:7b, llama3:8b)
 * 
 * Examples:
 * 
 * OpenAI:
 *   OPENAI_API_KEY=sk-...
 *   OPENAI_MODEL=gpt-4o-mini
 * 
 * Ollama (self-hosted):
 *   AI_BASE_URL=http://localhost:11434/v1
 *   AI_MODEL=qwen2.5-coder:7b
 *   OPENAI_API_KEY=ollama  # Ollama doesn't need a real key, but SDK requires one
 */

interface AIConfig {
  provider: 'openai' | 'ollama'
  model: string
  baseURL?: string
  apiKey: string
  enabled: boolean
}

/**
 * Get AI configuration from environment
 */
export function getAIConfig(): AIConfig {
  const aiBaseUrl = process.env.AI_BASE_URL
  const openaiApiKey = process.env.OPENAI_API_KEY
  const aiModel = process.env.AI_MODEL
  const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  console.log('aiBaseUrl', aiBaseUrl)
  console.log('openaiApiKey', openaiApiKey)
  console.log('aiModel', aiModel)
  console.log('openaiModel', openaiModel)
  // Self-hosted (Ollama, etc.)
  if (aiBaseUrl) {
    return {
      provider: 'ollama',
      model: openaiModel || 'qwen2.5-coder:7b',
      baseURL: aiBaseUrl,
      apiKey: openaiApiKey || 'ollama', // Ollama doesn't need a real key
      enabled: true
    }
  }

  // OpenAI
  if (openaiApiKey) {
    return {
      provider: 'openai',
      model: openaiModel,
      apiKey: openaiApiKey,
      enabled: true
    }
  }

  // Not configured
  return {
    provider: 'openai',
    model: openaiModel,
    apiKey: '',
    enabled: false
  }
}

/**
 * Create OpenAI client (works with both OpenAI and Ollama)
 */
export function createAIClient(): OpenAI | null {
  const config = getAIConfig()

  if (!config.enabled) {
    console.warn('[AI] Not configured. Set OPENAI_API_KEY or AI_BASE_URL.')
    return null
  }

  try {
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: 30000, // 30 second timeout
      maxRetries: 2
    })

    console.log(`[AI] Initialized ${config.provider} client with model: ${config.model}`)
    return client
  } catch (error) {
    console.error('[AI] Failed to initialize client:', error)
    return null
  }
}

/**
 * Generate a chat completion
 */
export async function generateChatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>,
  options?: {
    temperature?: number
    maxTokens?: number
    jsonMode?: boolean
  }
): Promise<string | null> {
  const client = createAIClient()
  if (!client) {
    return null
  }

  const config = getAIConfig()

  try {
    const completion = await client.chat.completions.create({
      model: config.model,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 1000,
      // JSON mode may not work with all Ollama models
      ...(options?.jsonMode && config.provider === 'openai' ? { response_format: { type: 'json_object' } } : {})
    })

    return completion.choices[0]?.message?.content || null
  } catch (error: any) {
    console.error('[AI] Error generating completion:', error)
    throw error
  }
}

/**
 * Generate JSON response (with fallback for non-JSON models)
 */
export async function generateJSONCompletion<T = any>(
  messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>,
  options?: {
    temperature?: number
    maxTokens?: number
  }
): Promise<T | null> {
  const config = getAIConfig()
  
  // For Ollama, add explicit instruction to return JSON
  if (config.provider === 'ollama') {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role === 'user') {
      lastMessage.content += '\n\nIMPORTANT: Respond with ONLY valid JSON, no other text.'
    }
  }

  const response = await generateChatCompletion(messages, {
    ...options,
    jsonMode: config.provider === 'openai'
  })

  if (!response) {
    return null
  }

  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    // Try to parse directly
    return JSON.parse(response)
  } catch (error) {
    console.error('[AI] Failed to parse JSON response:', error)
    console.error('[AI] Raw response:', response)
    return null
  }
}

/**
 * Check if AI is enabled and available
 */
export function isAIEnabled(): boolean {
  const config = getAIConfig()
  return config.enabled
}

/**
 * Get AI provider info
 */
export function getAIProvider(): 'openai' | 'ollama' | 'none' {
  const config = getAIConfig()
  return config.enabled ? config.provider : 'none'
}

