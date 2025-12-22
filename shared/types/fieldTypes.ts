/**
 * Shared field type definitions for frontend
 */

export type ColumnType = 
  // Basic
  | 'text'
  | 'long_text'
  | 'number'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'switch'
  // Text types
  | 'email'
  | 'phone'
  | 'url'
  // Select types
  | 'select'
  | 'multi_select'
  // Number types
  | 'currency'
  | 'percent'
  | 'rating'
  // Other
  | 'color'

export interface ColumnTypeOption {
  value: ColumnType
  label: string
  description: string
  category: 'basic' | 'text' | 'number' | 'date' | 'select' | 'location' | 'media' | 'relation' | 'advanced'
  icon?: string
}

export const columnTypeOptions: ColumnTypeOption[] = [
  // Basic types
  {
    value: 'text',
    label: 'Text',
    description: 'Short text (up to 255 characters)',
    category: 'basic'
  },
  {
    value: 'long_text',
    label: 'Long Text',
    description: 'Long text (unlimited)',
    category: 'text'
  },
  {
    value: 'number',
    label: 'Number',
    description: 'Integer or decimal number',
    category: 'number'
  },
  {
    value: 'date',
    label: 'Date',
    description: 'Date (without time)',
    category: 'date'
  },
  {
    value: 'datetime',
    label: 'Date & Time',
    description: 'Date with time',
    category: 'date'
  },
  {
    value: 'boolean',
    label: 'Boolean',
    description: 'True/False toggle',
    category: 'basic'
  },
  {
    value: 'switch',
    label: 'Switch',
    description: 'On/Off switch',
    category: 'basic'
  },
  
  // Text types
  {
    value: 'email',
    label: 'Email',
    description: 'Email address with validation',
    category: 'text',
    icon: 'lucide:mail'
  },
  {
    value: 'phone',
    label: 'Phone',
    description: 'Phone number with formatting',
    category: 'text',
    icon: 'lucide:phone'
  },
  {
    value: 'url',
    label: 'URL',
    description: 'Website URL with validation',
    category: 'text',
    icon: 'lucide:link'
  },
  
  // Select types
  {
    value: 'select',
    label: 'Select',
    description: 'Single select dropdown',
    category: 'select',
    icon: 'lucide:list'
  },
  {
    value: 'multi_select',
    label: 'Multi Select',
    description: 'Multiple select dropdown',
    category: 'select',
    icon: 'lucide:tags'
  }
]

export function getColumnTypeOption(type: ColumnType): ColumnTypeOption | undefined {
  return columnTypeOptions.find(opt => opt.value === type)
}

export function getColumnTypesByCategory(category: string): ColumnTypeOption[] {
  return columnTypeOptions.filter(opt => opt.category === category)
}

