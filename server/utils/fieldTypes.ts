/**
 * Field Type Registry
 * 
 * Central registry for all field types with their validation,
 * PostgreSQL mapping, and configuration options.
 */

import { validateFieldValue as sharedValidateFieldValue } from '#shared/utils/validators'

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
    type: 'text' | 'number' | 'boolean' | 'select' | 'color'
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
    validate: (value, config) => sharedValidateFieldValue(value, 'number', config),
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
  
  checkbox: {
    name: 'checkbox',
    label: 'Checkbox',
    description: 'True/False checkbox',
    category: 'basic',
    pgType: () => 'BOOLEAN',
    validate: (value, config) => sharedValidateFieldValue(value, 'checkbox', config),
    defaultConfig: {
      defaultValue: false
    },
    configSchema: [],
    aiHints: {
      keywords: ['checkbox', 'check', 'yes/no', 'true/false', 'confirmed', 'verified', 'completed', 'done', 'active', 'enabled'],
      patterns: [/check/i, /confirm/i, /verify/i, /complete/i, /done/i, /active/i, /enable/i]
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
    validate: (value, config) => sharedValidateFieldValue(value, 'email', config),
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
    validate: (value, config) => sharedValidateFieldValue(value, 'phone', config),
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
    validate: (value, config) => sharedValidateFieldValue(value, 'url', config),
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
    validate: (value, config) => sharedValidateFieldValue(value, 'select', config),
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
    validate: (value, config) => sharedValidateFieldValue(value, 'multi_select', config),
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
  },
  
  // ============================================
  // NUMBER DISPLAY TYPES (New - Week 2)
  // ============================================
  
  currency: {
    name: 'currency',
    label: 'Currency',
    description: 'Monetary value with currency symbol',
    category: 'number',
    pgType: () => 'DECIMAL(19,4)', // Supports large amounts with precision
    validate: (value, config) => {
      if (value === null || value === undefined || value === '') {
        return { valid: true }
      }
      
      const num = typeof value === 'string' ? parseFloat(value) : value
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
      symbol: '$',
      position: 'before', // 'before' | 'after'
      decimalPlaces: 2,
      compactDisplay: false,
      compactThreshold: 10000, // When to start compacting
      min: undefined,
      max: undefined,
      placeholder: '0.00'
    },
    configSchema: [
      {
        key: 'symbol',
        label: 'Currency Symbol',
        type: 'select',
        options: [
          { label: '$ (Dollar)', value: '$' },
          { label: '€ (Euro)', value: '€' },
          { label: '£ (Pound)', value: '£' },
          { label: '¥ (Yen)', value: '¥' },
          { label: '₹ (Rupee)', value: '₹' },
          { label: '₽ (Ruble)', value: '₽' },
          { label: 'Custom', value: 'custom' }
        ],
        default: '$'
      },
      {
        key: 'position',
        label: 'Symbol Position',
        type: 'select',
        options: [
          { label: 'Before ($100)', value: 'before' },
          { label: 'After (100€)', value: 'after' }
        ],
        default: 'before'
      },
      {
        key: 'decimalPlaces',
        label: 'Decimal Places',
        type: 'select',
        options: [
          { label: 'No decimals (100)', value: 0 },
          { label: '2 decimals (100.00)', value: 2 },
          { label: '4 decimals (100.0000)', value: 4 }
        ],
        default: 2
      },
      {
        key: 'compactDisplay',
        label: 'Compact Display',
        type: 'boolean',
        default: false,
        description: 'Display as 1.2K, 1.5M, 2.3B, etc.'
      },
      {
        key: 'compactThreshold',
        label: 'Compact Threshold',
        type: 'number',
        default: 10000,
        description: 'Start compact display at this value'
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
    ],
    aiHints: {
      keywords: ['price', 'cost', 'amount', 'revenue', 'salary', 'budget', 'fee', 'payment', 'balance', 'total'],
      patterns: [/price/i, /cost/i, /amount/i, /\$/, /revenue/i, /salary/i, /budget/i]
    }
  },
  
  rating: {
    name: 'rating',
    label: 'Rating',
    description: 'Star rating system (1-5 or 1-10)',
    category: 'number',
    pgType: () => 'INTEGER',
    validate: (value, config) => {
      if (value === null || value === undefined || value === '') {
        return { valid: true }
      }
      
      const num = typeof value === 'string' ? parseInt(value) : value
      if (isNaN(num) || !Number.isInteger(num)) {
        return { valid: false, error: 'Must be a whole number' }
      }
      
      const maxStars = config?.maxStars || 5
      if (num < 1 || num > maxStars) {
        return { valid: false, error: `Rating must be between 1 and ${maxStars}` }
      }
      
      return { valid: true }
    },
    defaultConfig: {
      maxStars: 5, // 5 or 10
      allowHalf: false, // Allow 0.5 increments (4.5 stars)
      showNumber: true, // Show number alongside stars
      color: '#fadb14', // Star color (yellow by default)
      placeholder: 'Select rating'
    },
    configSchema: [
      {
        key: 'maxStars',
        label: 'Max Stars',
        type: 'select',
        options: [
          { label: '5 Stars', value: 5 },
          { label: '10 Stars', value: 10 }
        ],
        default: 5
      },
      {
        key: 'allowHalf',
        label: 'Allow Half Stars',
        type: 'boolean',
        default: false,
        description: 'Enable 0.5 increments (e.g., 4.5 stars)'
      },
      {
        key: 'showNumber',
        label: 'Show Number',
        type: 'boolean',
        default: true,
        description: 'Display numeric value alongside stars'
      },
      {
        key: 'color',
        label: 'Star Color',
        type: 'color',
        default: '#fadb14'
      },
      {
        key: 'placeholder',
        label: 'Placeholder',
        type: 'text',
        default: 'Select rating'
      }
    ],
    aiHints: {
      keywords: ['rating', 'stars', 'score', 'review', 'quality', 'satisfaction', 'feedback'],
      patterns: [/rating/i, /stars/i, /score/i, /review/i, /quality/i]
    }
  },
  
  color: {
    name: 'color',
    label: 'Color',
    description: 'Color picker with hex/rgb values',
    category: 'basic',
    pgType: () => 'VARCHAR(20)',
    validate: (value, config) => {
      if (value === null || value === undefined || value === '') {
        return { valid: true }
      }
      
      // Validate hex color format (#RGB or #RRGGBB or #RRGGBBAA)
      const hexPattern = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/
      
      if (!hexPattern.test(value)) {
        return { valid: false, error: 'Invalid color format. Use hex format like #FF5733' }
      }
      
      return { valid: true }
    },
    defaultConfig: {
      format: 'hex', // 'hex' | 'rgb' | 'hsl'
      allowAlpha: true,
      showPresets: true,
      presetColors: [
        '#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF3',
        '#FFD700', '#FF69B4', '#8A2BE2', '#00CED1', '#FF4500'
      ],
      placeholder: 'Select a color'
    },
    configSchema: [
      {
        key: 'format',
        label: 'Color Format',
        type: 'select',
        options: [
          { label: 'Hex (#FF5733)', value: 'hex' },
          { label: 'RGB (rgb(255,87,51))', value: 'rgb' },
          { label: 'HSL (hsl(9,100%,60%))', value: 'hsl' }
        ],
        default: 'hex'
      },
      {
        key: 'allowAlpha',
        label: 'Allow Transparency',
        type: 'boolean',
        default: true,
        description: 'Allow alpha channel for transparency'
      },
      {
        key: 'showPresets',
        label: 'Show Preset Colors',
        type: 'boolean',
        default: true,
        description: 'Show quick color presets'
      },
      {
        key: 'placeholder',
        label: 'Placeholder',
        type: 'text',
        default: 'Select a color'
      }
    ],
    aiHints: {
      keywords: ['color', 'colour', 'theme', 'background', 'foreground', 'accent', 'brand', 'hex', 'rgb'],
      patterns: [/color/i, /colour/i, /theme/i, /background/i, /bg/i, /hex/i, /rgb/i]
    }
  },
  
  geolocation: {
    name: 'geolocation',
    label: 'Geolocation',
    description: 'Address with coordinates and map picker',
    category: 'location',
    pgType: () => 'JSONB',
    validate: (value, config) => {
      if (value === null || value === undefined || value === '') {
        return { valid: true }
      }
      
      // Value should be an object with lat, lng, and optional address
      if (typeof value !== 'object') {
        return { valid: false, error: 'Invalid geolocation format' }
      }
      
      const { lat, lng } = value
      
      // Validate latitude (-90 to 90)
      if (typeof lat !== 'number' || lat < -90 || lat > 90) {
        return { valid: false, error: 'Latitude must be between -90 and 90' }
      }
      
      // Validate longitude (-180 to 180)
      if (typeof lng !== 'number' || lng < -180 || lng > 180) {
        return { valid: false, error: 'Longitude must be between -180 and 180' }
      }
      
      return { valid: true }
    },
    defaultConfig: {
      format: 'full', // 'full' | 'coordinates' | 'address'
      defaultZoom: 13,
      defaultCenter: { lat: 37.7749, lng: -122.4194 }, // San Francisco
      enableGeocoding: true, // Convert address to coordinates
      enableReverseGeocoding: true, // Convert coordinates to address
      requireAddress: false,
      showMap: true,
      mapProvider: 'openstreetmap', // 'openstreetmap' | 'google' | 'mapbox'
      placeholder: 'Enter an address or click on map'
    },
    configSchema: [
      {
        key: 'format',
        label: 'Display Format',
        type: 'select',
        options: [
          { label: 'Full (Address + Coordinates)', value: 'full' },
          { label: 'Coordinates Only', value: 'coordinates' },
          { label: 'Address Only', value: 'address' }
        ],
        default: 'full'
      },
      {
        key: 'showMap',
        label: 'Show Map Picker',
        type: 'boolean',
        default: true,
        description: 'Show interactive map for selecting location'
      },
      {
        key: 'enableGeocoding',
        label: 'Enable Geocoding',
        type: 'boolean',
        default: true,
        description: 'Convert addresses to coordinates automatically'
      },
      {
        key: 'enableReverseGeocoding',
        label: 'Enable Reverse Geocoding',
        type: 'boolean',
        default: true,
        description: 'Convert coordinates to addresses automatically'
      },
      {
        key: 'requireAddress',
        label: 'Require Address',
        type: 'boolean',
        default: false,
        description: 'Require address text (not just coordinates)'
      },
      {
        key: 'defaultZoom',
        label: 'Default Map Zoom',
        type: 'number',
        default: 13,
        description: 'Initial zoom level (1-20)'
      },
      {
        key: 'placeholder',
        label: 'Placeholder',
        type: 'text',
        default: 'Enter an address or click on map'
      }
    ],
    aiHints: {
      keywords: ['location', 'address', 'geolocation', 'place', 'coordinates', 'latitude', 'longitude', 'map', 'where', 'city', 'country'],
      patterns: [/location/i, /address/i, /place/i, /where/i, /coordinates/i, /lat.*lng/i, /geo/i, /map/i]
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
 * Get PostgreSQL type for field
 */
export function getPostgresType(fieldType: string, config?: any): string {
  const definition = getFieldType(fieldType)
  
  if (!definition) {
    return 'TEXT' // Default fallback
  }
  
  return definition.pgType(config)
}

