/**
 * Field Type Registry
 * 
 * Central registry for all field types with their validation,
 * PostgreSQL mapping, and configuration options.
 */

export interface FieldTypeDefinition {
  name: string
  label: string
  description: string
  category: 'basic' | 'text' | 'number' | 'date' | 'select' | 'location' | 'media' | 'relation' | 'advanced'
  
  // PostgreSQL type mapping
  pgType: (config?: any) => string
  
  // Validation
  validate?: (value: any, config?: any) => { valid: boolean; error?: string }
  
  // Default configuration
  defaultConfig: Record<string, any>
  
  // Config schema for UI
  configSchema?: Array<{
    key: string
    label: string
    type: 'text' | 'number' | 'boolean' | 'select'
    options?: Array<{ label: string; value: any }>
    default?: any
    description?: string
  }>
  
  // AI hints for type detection
  aiHints?: {
    keywords: string[]  // Keywords in label that suggest this type
    patterns?: RegExp[] // Patterns in label that suggest this type
  }
}

/**
 * Registry of all field types
 */
export const fieldTypeRegistry: Record<string, FieldTypeDefinition> = {
  // ============================================
  // BASIC TYPES (Already implemented)
  // ============================================
  
  text: {
    name: 'text',
    label: 'Text',
    description: 'Short text (up to 255 characters)',
    category: 'basic',
    pgType: (config) => config?.maxLength ? `VARCHAR(${config.maxLength})` : 'VARCHAR(255)',
    defaultConfig: {
      maxLength: 255,
      placeholder: ''
    },
    configSchema: [
      {
        key: 'maxLength',
        label: 'Max Length',
        type: 'number',
        default: 255,
        description: 'Maximum number of characters'
      },
      {
        key: 'placeholder',
        label: 'Placeholder',
        type: 'text',
        default: '',
        description: 'Placeholder text'
      }
    ]
  },
  
  long_text: {
    name: 'long_text',
    label: 'Long Text',
    description: 'Long text (unlimited)',
    category: 'text',
    pgType: () => 'TEXT',
    defaultConfig: {
      placeholder: '',
      rows: 4
    },
    configSchema: [
      {
        key: 'placeholder',
        label: 'Placeholder',
        type: 'text',
        default: '',
        description: 'Placeholder text'
      },
      {
        key: 'rows',
        label: 'Rows',
        type: 'number',
        default: 4,
        description: 'Number of visible rows'
      }
    ]
  },
  
  number: {
    name: 'number',
    label: 'Number',
    description: 'Integer or decimal number',
    category: 'number',
    pgType: (config) => config?.decimal ? 'DECIMAL(10,2)' : 'INTEGER',
    validate: (value, config) => {
      if (value === null || value === undefined || value === '') return { valid: true }
      
      const num = Number(value)
      if (isNaN(num)) {
        return { valid: false, error: 'Must be a valid number' }
      }
      
      if (config?.min !== undefined && num < config.min) {
        return { valid: false, error: `Must be at least ${config.min}` }
      }
      
      if (config?.max !== undefined && num > config.max) {
        return { valid: false, error: `Must be at most ${config.max}` }
      }
      
      return { valid: true }
    },
    defaultConfig: {
      decimal: false,
      min: undefined,
      max: undefined,
      placeholder: ''
    },
    configSchema: [
      {
        key: 'decimal',
        label: 'Allow Decimals',
        type: 'boolean',
        default: false
      },
      {
        key: 'min',
        label: 'Minimum Value',
        type: 'number',
        description: 'Minimum allowed value'
      },
      {
        key: 'max',
        label: 'Maximum Value',
        type: 'number',
        description: 'Maximum allowed value'
      }
    ]
  },
  
  date: {
    name: 'date',
    label: 'Date',
    description: 'Date (without time)',
    category: 'date',
    pgType: () => 'DATE',
    defaultConfig: {
      dateFormat: 'YYYY-MM-DD',
      disablePast: false,
      disableFuture: false
    }
  },
  
  datetime: {
    name: 'datetime',
    label: 'Date & Time',
    description: 'Date with time',
    category: 'date',
    pgType: () => 'TIMESTAMP',
    defaultConfig: {
      dateFormat: 'YYYY-MM-DD HH:mm:ss',
      disablePast: false,
      disableFuture: false
    }
  },
  
  boolean: {
    name: 'boolean',
    label: 'Boolean',
    description: 'True/False toggle',
    category: 'basic',
    pgType: () => 'BOOLEAN',
    defaultConfig: {
      defaultValue: false
    }
  },
  
  switch: {
    name: 'switch',
    label: 'Switch',
    description: 'On/Off switch (same as boolean)',
    category: 'basic',
    pgType: () => 'BOOLEAN',
    defaultConfig: {
      defaultValue: false,
      trueLabel: 'On',
      falseLabel: 'Off'
    }
  },
  
  // ============================================
  // TEXT TYPES (New - Week 2)
  // ============================================
  
  email: {
    name: 'email',
    label: 'Email',
    description: 'Email address with validation',
    category: 'text',
    pgType: () => 'VARCHAR(255)',
    validate: (value) => {
      if (!value) return { valid: true }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        return { valid: false, error: 'Invalid email format' }
      }
      
      return { valid: true }
    },
    defaultConfig: {
      placeholder: 'name@example.com',
      allowMultiple: false
    },
    configSchema: [
      {
        key: 'placeholder',
        label: 'Placeholder',
        type: 'text',
        default: 'name@example.com'
      },
      {
        key: 'allowMultiple',
        label: 'Allow Multiple Emails',
        type: 'boolean',
        default: false,
        description: 'Allow comma-separated email addresses'
      }
    ],
    aiHints: {
      keywords: ['email', 'e-mail', 'mail', 'contact email'],
      patterns: [/email/i, /e-mail/i]
    }
  },
  
  phone: {
    name: 'phone',
    label: 'Phone',
    description: 'Phone number with formatting',
    category: 'text',
    pgType: () => 'VARCHAR(20)',
    validate: (value, config) => {
      if (!value) return { valid: true }
      
      // Remove all non-digit characters for validation
      const digitsOnly = value.replace(/\D/g, '')
      
      const minLength = config?.minLength || 10
      const maxLength = config?.maxLength || 15
      
      if (digitsOnly.length < minLength) {
        return { valid: false, error: `Phone number must be at least ${minLength} digits` }
      }
      
      if (digitsOnly.length > maxLength) {
        return { valid: false, error: `Phone number must be at most ${maxLength} digits` }
      }
      
      return { valid: true }
    },
    defaultConfig: {
      format: 'international', // 'international' | 'us' | 'uk' | 'custom'
      placeholder: '+1 (555) 123-4567',
      minLength: 10,
      maxLength: 15
    },
    configSchema: [
      {
        key: 'format',
        label: 'Format',
        type: 'select',
        options: [
          { label: 'International', value: 'international' },
          { label: 'US', value: 'us' },
          { label: 'UK', value: 'uk' },
          { label: 'Custom', value: 'custom' }
        ],
        default: 'international'
      },
      {
        key: 'placeholder',
        label: 'Placeholder',
        type: 'text',
        default: '+1 (555) 123-4567'
      }
    ],
    aiHints: {
      keywords: ['phone', 'telephone', 'mobile', 'cell', 'contact number'],
      patterns: [/phone/i, /tel/i, /mobile/i, /cell/i]
    }
  },
  
  url: {
    name: 'url',
    label: 'URL',
    description: 'Website URL with validation',
    category: 'text',
    pgType: () => 'TEXT',
    validate: (value) => {
      if (!value) return { valid: true }
      
      try {
        new URL(value)
        return { valid: true }
      } catch {
        // Try with https:// prefix
        try {
          new URL(`https://${value}`)
          return { valid: true }
        } catch {
          return { valid: false, error: 'Invalid URL format' }
        }
      }
    },
    defaultConfig: {
      placeholder: 'https://example.com',
      openInNewTab: true,
      requireHttps: false
    },
    configSchema: [
      {
        key: 'placeholder',
        label: 'Placeholder',
        type: 'text',
        default: 'https://example.com'
      },
      {
        key: 'openInNewTab',
        label: 'Open in New Tab',
        type: 'boolean',
        default: true,
        description: 'Open links in new tab when clicked'
      },
      {
        key: 'requireHttps',
        label: 'Require HTTPS',
        type: 'boolean',
        default: false,
        description: 'Only allow secure HTTPS URLs'
      }
    ],
    aiHints: {
      keywords: ['url', 'website', 'link', 'web address', 'homepage'],
      patterns: [/url/i, /website/i, /link/i, /web/i]
    }
  },
  
  // ============================================
  // SELECT TYPES (New - Week 2)
  // ============================================
  
  select: {
    name: 'select',
    label: 'Select',
    description: 'Single select dropdown',
    category: 'select',
    pgType: () => 'VARCHAR(255)',
    validate: (value, config) => {
      if (!value) return { valid: true }
      
      const options = config?.options || []
      const validValues = options.map((opt: any) => opt.value)
      
      if (!validValues.includes(value)) {
        return { valid: false, error: 'Invalid option selected' }
      }
      
      return { valid: true }
    },
    defaultConfig: {
      options: [],
      placeholder: 'Select an option',
      allowCustom: false
    },
    configSchema: [
      {
        key: 'options',
        label: 'Options',
        type: 'text',
        description: 'Comma-separated options (e.g., Small, Medium, Large)'
      },
      {
        key: 'placeholder',
        label: 'Placeholder',
        type: 'text',
        default: 'Select an option'
      },
      {
        key: 'allowCustom',
        label: 'Allow Custom Values',
        type: 'boolean',
        default: false,
        description: 'Allow users to enter custom values'
      }
    ],
    aiHints: {
      keywords: ['select', 'dropdown', 'choice', 'option', 'status', 'priority', 'category', 'type'],
      patterns: [/select/i, /dropdown/i, /choice/i, /status/i, /priority/i, /category/i, /type/i]
    }
  },
  
  multi_select: {
    name: 'multi_select',
    label: 'Multi Select',
    description: 'Multiple select dropdown',
    category: 'select',
    pgType: () => 'JSONB',
    validate: (value, config) => {
      if (!value || !Array.isArray(value)) return { valid: true }
      
      const options = config?.options || []
      const validValues = options.map((opt: any) => opt.value)
      
      for (const val of value) {
        if (!validValues.includes(val)) {
          return { valid: false, error: `Invalid option: ${val}` }
        }
      }
      
      if (config?.maxSelections && value.length > config.maxSelections) {
        return { valid: false, error: `Maximum ${config.maxSelections} selections allowed` }
      }
      
      return { valid: true }
    },
    defaultConfig: {
      options: [],
      placeholder: 'Select options',
      maxSelections: undefined,
      allowCustom: false
    },
    configSchema: [
      {
        key: 'options',
        label: 'Options',
        type: 'text',
        description: 'Comma-separated options'
      },
      {
        key: 'placeholder',
        label: 'Placeholder',
        type: 'text',
        default: 'Select options'
      },
      {
        key: 'maxSelections',
        label: 'Max Selections',
        type: 'number',
        description: 'Maximum number of selections allowed'
      }
    ],
    aiHints: {
      keywords: ['tags', 'categories', 'skills', 'interests'],
      patterns: [/tags/i, /skills/i, /interests/i]
    }
  }
}

/**
 * Get field type definition
 */
export function getFieldType(name: string): FieldTypeDefinition | undefined {
  return fieldTypeRegistry[name]
}

/**
 * Get all field types
 */
export function getAllFieldTypes(): FieldTypeDefinition[] {
  return Object.values(fieldTypeRegistry)
}

/**
 * Get field types by category
 */
export function getFieldTypesByCategory(category: string): FieldTypeDefinition[] {
  return getAllFieldTypes().filter(type => type.category === category)
}

/**
 * Suggest field type based on label
 */
export function suggestFieldType(label: string): string | null {
  const lowerLabel = label.toLowerCase()
  
  // Check each field type's AI hints
  for (const [typeName, definition] of Object.entries(fieldTypeRegistry)) {
    if (!definition.aiHints) continue
    
    // Check keywords
    if (definition.aiHints.keywords.some(keyword => lowerLabel.includes(keyword.toLowerCase()))) {
      return typeName
    }
    
    // Check patterns
    if (definition.aiHints.patterns?.some(pattern => pattern.test(label))) {
      return typeName
    }
  }
  
  // Default to text
  return 'text'
}

/**
 * Validate field value
 */
export function validateFieldValue(
  value: any, 
  fieldType: string, 
  config?: any
): { valid: boolean; error?: string } {
  const definition = getFieldType(fieldType)
  
  if (!definition || !definition.validate) {
    return { valid: true }
  }
  
  return definition.validate(value, config)
}

/**
 * Get PostgreSQL type for field
 */
export function getPostgresType(fieldType: string, config?: any): string {
  const definition = getFieldType(fieldType)
  
  if (!definition) {
    return 'TEXT' // Default fallback
  }
  
  return definition.pgType(config)
}

