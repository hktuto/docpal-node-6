/**
 * Validation Utilities
 * 
 * Common validation helpers for API endpoints
 */

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate required fields
 */
export function validateRequired(data: any, fields: string[]): { valid: boolean; missing?: string[] } {
  const missing = fields.filter(field => !data[field]);
  
  if (missing.length > 0) {
    return { valid: false, missing };
  }
  
  return { valid: true };
}

/**
 * Sanitize string (prevent SQL injection in dynamic parts)
 */
export function sanitizeString(str: string): string {
  return str.replace(/[^\w\s-]/g, '');
}

