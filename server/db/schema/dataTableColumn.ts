import { pgTable, uuid, text, jsonb, integer, boolean, timestamp } from 'drizzle-orm/pg-core'
import { dataTables } from './dataTable'

export const dataTableColumns = pgTable('data_table_columns', {
  id: uuid('id').primaryKey(),
  
  // Reference to parent table
  dataTableId: uuid('data_table_id')
    .notNull()
    .references(() => dataTables.id, { onDelete: 'cascade' }),
  
  // Column definition
  name: text('name').notNull(), // DB column name (snake_case)
  label: text('label').notNull(), // Display label
  type: text('type').notNull(), // text, long_text, number, date, switch
  
  // Column properties
  required: boolean('required').notNull().default(false),
  order: integer('order').notNull().default(0),
  
  // NEW: Extended field properties
  defaultValue: text('default_value'),
  isUnique: boolean('is_unique').notNull().default(false),
  isHidden: boolean('is_hidden').notNull().default(false), // Column visibility
  
  // Type-specific configuration (stored as JSONB) - EXPANDED
  config: jsonb('config').$type<{
    // Text field
    maxLength?: number
    minLength?: number
    placeholder?: string
    pattern?: string // Regex validation
    
    // Number field
    min?: number
    max?: number
    decimals?: number
    prefix?: string
    suffix?: string
    
    // Date/DateTime field
    dateFormatType?: 'date' | 'datetime' | 'time'
    dateFormatString? : string // YYYY-MM-DD, YYYY-MM-DD HH:MM:SS, HH:MM:SS
    minDate?: string
    maxDate?: string
    
    // Select/Multi-select field
    options?: Array<{
      value: string
      label: string
      color?: string //hex, rgb, hsl
    }>
    allowCustom?: boolean
    maxSelections?: number // For multi-select
    
    // Rating field
    maxRating?: number // 5 or 10
    allowHalf?: boolean
    icon?: 'star' | 'heart' | 'thumb'
    
    // Currency field
    currency?: string // USD, EUR, etc.
    currencySymbol?: string // $, €, etc.
    compactDisplay?: boolean // Show as K, M, B, T
    compactThreshold?: number
    
    // Color field
    colorFormat?: 'hex' | 'rgb' | 'hsl'
    showAlpha?: boolean
    
    // Phone field
    phoneFormat?: 'US' | 'international' | 'E.164'
    
    // URL field
    allowedProtocols?: string[] // ['http', 'https']
    openInNewTab?: boolean
    
    // Email field
    strictValidation?: boolean
    
    // Formula field (complex)
    formula?: string
    returnType?: 'number' | 'text' | 'date' | 'boolean'
    dependencies?: string[] // Field IDs
    cacheResult?: boolean
    
    // Aggregation field (complex)
    operation?: 'SUM' | 'COUNT' | 'AVG' | 'MIN' | 'MAX'
    sourceTable?: string
    sourceField?: string
    groupBy?: string
    filter?: Record<string, any>
    
    // Relation field (complex)
    targetTable?: string // Table ID to link to
    displayField?: string // Which field to show
    allowMultiple?: boolean
    cascadeDelete?: 'restrict' | 'cascade' | 'set_null'
    
    // Lookup field (complex)
    relationField?: string // Which relation to use
    targetField?: string // Field from related record
    allowNested?: boolean
    autoUpdate?: boolean
    
    // Generic
    description?: string
    helpText?: string
  }>(),
  
  // NEW: Validation rules (stored as JSONB)
  validationRules: jsonb('validation_rules').$type<{
    email?: boolean
    url?: boolean
    phone?: boolean
    pattern?: string
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    unique?: boolean
    custom?: string // Custom validation function name
  }>(),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

