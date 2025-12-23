/**
 * Shared validation functions for field types
 * Used by both frontend and backend
 */

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Email validation
 */
export function validateEmail(value: string): ValidationResult {
  if (!value) return { valid: true }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!emailRegex.test(value)) {
    return { valid: false, error: 'Invalid email format' }
  }
  
  return { valid: true }
}

/**
 * Multiple emails validation (comma-separated)
 */
export function validateMultipleEmails(value: string): ValidationResult {
  if (!value) return { valid: true }
  
  const emails = value.split(',').map(e => e.trim()).filter(e => e)
  
  for (const email of emails) {
    const result = validateEmail(email)
    if (!result.valid) {
      return { valid: false, error: `Invalid email: ${email}` }
    }
  }
  
  return { valid: true }
}

/**
 * Phone number validation
 */
export function validatePhone(value: string, config?: { minLength?: number; maxLength?: number }): ValidationResult {
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
}

/**
 * URL validation
 */
export function validateUrl(value: string, config?: { requireHttps?: boolean }): ValidationResult {
  if (!value) return { valid: true }
  
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`)
    
    if (config?.requireHttps && url.protocol !== 'https:') {
      return { valid: false, error: 'HTTPS is required' }
    }
    
    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }
}

/**
 * Number validation
 */
export function validateNumber(value: any, config?: { min?: number; max?: number; decimal?: boolean }): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return { valid: true }
  }
  
  const num = Number(value)
  
  if (isNaN(num)) {
    return { valid: false, error: 'Must be a valid number' }
  }
  
  if (!config?.decimal && !Number.isInteger(num)) {
    return { valid: false, error: 'Decimals not allowed' }
  }
  
  if (config?.min !== undefined && num < config.min) {
    return { valid: false, error: `Must be at least ${config.min}` }
  }
  
  if (config?.max !== undefined && num > config.max) {
    return { valid: false, error: `Must be at most ${config.max}` }
  }
  
  return { valid: true }
}

/**
 * Text length validation
 */
export function validateTextLength(value: string, config?: { minLength?: number; maxLength?: number }): ValidationResult {
  if (!value) return { valid: true }
  
  if (config?.minLength && value.length < config.minLength) {
    return { valid: false, error: `Must be at least ${config.minLength} characters` }
  }
  
  if (config?.maxLength && value.length > config.maxLength) {
    return { valid: false, error: `Must be at most ${config.maxLength} characters` }
  }
  
  return { valid: true }
}

/**
 * Pattern validation (regex)
 */
export function validatePattern(value: string, pattern: string): ValidationResult {
  if (!value) return { valid: true }
  
  try {
    const regex = new RegExp(pattern)
    if (!regex.test(value)) {
      return { valid: false, error: 'Invalid format' }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid pattern' }
  }
}

/**
 * Select validation (value must be in options)
 */
export function validateSelect(value: string, options: Array<{ value: string; label: string }>): ValidationResult {
  if (!value) return { valid: true }
  
  const validValues = options.map(opt => opt.value)
  
  if (!validValues.includes(value)) {
    return { valid: false, error: 'Invalid option selected' }
  }
  
  return { valid: true }
}

/**
 * Multi-select validation
 */
export function validateMultiSelect(
  values: string[], 
  options: Array<{ value: string; label: string }>,
  config?: { maxSelections?: number }
): ValidationResult {
  if (!values || !Array.isArray(values)) {
    return { valid: true }
  }
  
  const validValues = options.map(opt => opt.value)
  
  // Check all values are valid
  for (const val of values) {
    if (!validValues.includes(val)) {
      return { valid: false, error: `Invalid option: ${val}` }
    }
  }
  
  // Check max selections
  if (config?.maxSelections && values.length > config.maxSelections) {
    return { valid: false, error: `Maximum ${config.maxSelections} selections allowed` }
  }
  
  return { valid: true }
}

/**
 * Date validation
 */
export function validateDate(value: string, config?: { minDate?: string; maxDate?: string }): ValidationResult {
  if (!value) return { valid: true }
  
  const date = new Date(value)
  
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date' }
  }
  
  if (config?.minDate) {
    const minDate = new Date(config.minDate)
    if (date < minDate) {
      return { valid: false, error: `Date must be after ${config.minDate}` }
    }
  }
  
  if (config?.maxDate) {
    const maxDate = new Date(config.maxDate)
    if (date > maxDate) {
      return { valid: false, error: `Date must be before ${config.maxDate}` }
    }
  }
  
  return { valid: true }
}

/**
 * Rating validation
 */
export function validateRating(value: any, config?: { maxStars?: number; allowHalf?: boolean }): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return { valid: true }
  }
  
  const num = Number(value)
  
  if (isNaN(num)) {
    return { valid: false, error: 'Must be a valid number' }
  }
  
  const maxStars = config?.maxStars || 5
  const allowHalf = config?.allowHalf || false
  
  if (num < 1 || num > maxStars) {
    return { valid: false, error: `Rating must be between 1 and ${maxStars}` }
  }
  
  // Check if half stars are allowed
  if (!allowHalf && !Number.isInteger(num)) {
    return { valid: false, error: 'Only whole numbers are allowed' }
  }
  
  // Check if value is in 0.5 increments when half stars are allowed
  if (allowHalf && (num * 2) % 1 !== 0) {
    return { valid: false, error: 'Only 0.5 increments are allowed' }
  }
  
  return { valid: true }
}

/**
 * Color validation
 */
export function validateColor(value: string, config?: { format?: 'hex' | 'rgb' | 'hsl' }): ValidationResult {
  if (!value) return { valid: true }
  
  const format = config?.format || 'hex'
  
  if (format === 'hex') {
    // Validate hex color (#RGB, #RRGGBB, #RRGGBBAA)
    const hexPattern = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/
    
    if (!hexPattern.test(value)) {
      return { valid: false, error: 'Invalid hex color format (use #RGB, #RRGGBB, or #RRGGBBAA)' }
    }
  } else if (format === 'rgb') {
    // Validate RGB/RGBA format
    const rgbPattern = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*[0-1]?\.?\d*)?\s*\)$/
    
    if (!rgbPattern.test(value)) {
      return { valid: false, error: 'Invalid RGB color format (use rgb(r,g,b) or rgba(r,g,b,a))' }
    }
  } else if (format === 'hsl') {
    // Validate HSL/HSLA format
    const hslPattern = /^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*(,\s*[0-1]?\.?\d*)?\s*\)$/
    
    if (!hslPattern.test(value)) {
      return { valid: false, error: 'Invalid HSL color format (use hsl(h,s%,l%) or hsla(h,s%,l%,a))' }
    }
  }
  
  return { valid: true }
}

/**
 * Geolocation validation
 */
export function validateGeolocation(value: any, config?: { requireAddress?: boolean }): ValidationResult {
  if (!value || value === null || value === undefined) {
    return { valid: true }
  }
  
  // Value should be an object
  if (typeof value !== 'object') {
    return { valid: false, error: 'Invalid geolocation format' }
  }
  
  const { lat, lng, address } = value
  
  // Validate latitude
  if (typeof lat !== 'number' || isNaN(lat)) {
    return { valid: false, error: 'Latitude must be a number' }
  }
  
  if (lat < -90 || lat > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90' }
  }
  
  // Validate longitude
  if (typeof lng !== 'number' || isNaN(lng)) {
    return { valid: false, error: 'Longitude must be a number' }
  }
  
  if (lng < -180 || lng > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180' }
  }
  
  // Check if address is required
  if (config?.requireAddress && !address) {
    return { valid: false, error: 'Address is required' }
  }
  
  return { valid: true }
}

/**
 * Required field validation
 */
export function validateRequired(value: any): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: 'This field is required' }
  }
  
  if (Array.isArray(value) && value.length === 0) {
    return { valid: false, error: 'At least one selection is required' }
  }
  
  return { valid: true }
}

/**
 * Unique field validation (needs database check)
 * This is just the interface - actual implementation in backend
 */
export async function validateUnique(
  value: any,
  tableId: string,
  columnId: string,
  checkFn: (value: any, tableId: string, columnId: string) => Promise<boolean>
): Promise<ValidationResult> {
  if (!value) return { valid: true }
  
  const isUnique = await checkFn(value, tableId, columnId)
  
  if (!isUnique) {
    return { valid: false, error: 'This value already exists' }
  }
  
  return { valid: true }
}

/**
 * Master validator - validates based on field type
 */
export function validateFieldValue(
  value: any,
  fieldType: string,
  config?: any,
  required?: boolean
): ValidationResult {
  // Check required first
  if (required) {
    const requiredResult = validateRequired(value)
    if (!requiredResult.valid) {
      return requiredResult
    }
  }
  
  // Type-specific validation
  switch (fieldType) {
    case 'email':
      return config?.allowMultiple 
        ? validateMultipleEmails(value)
        : validateEmail(value)
    
    case 'phone':
      return validatePhone(value, config)
    
    case 'url':
      return validateUrl(value, config)
    
    case 'number':
    case 'currency':
      return validateNumber(value, config)
    
    case 'rating':
      return validateRating(value, config)
    
    case 'color':
      return validateColor(value, config)
    
    case 'geolocation':
      return validateGeolocation(value, config)
    
    case 'text':
    case 'long_text':
      return validateTextLength(value, config)
    
    case 'select':
      return validateSelect(value, config?.options || [])
    
    case 'multi_select':
      return validateMultiSelect(value, config?.options || [], config)
    
    case 'date':
    case 'datetime':
      return validateDate(value, config)
    
    default:
      return { valid: true }
  }
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phone: string, format: 'us' | 'international' = 'us'): string {
  if (!phone) return ''
  
  const digitsOnly = phone.replace(/\D/g, '')
  
  if (format === 'us') {
    if (digitsOnly.length === 10) {
      return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`
    } else if (digitsOnly.length === 11 && digitsOnly[0] === '1') {
      return `+1 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`
    }
  }
  
  return phone
}

/**
 * Normalize URL (add https:// if missing)
 */
export function normalizeUrl(url: string): string {
  if (!url) return ''
  
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`
  }
  
  return url
}

