/**
 * Generate a URL-friendly slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
}

/**
 * Generate a unique slug within a list of existing slugs
 */
export function generateUniqueSlug(baseName: string, existingSlugs: string[]): string {
  let slug = generateSlug(baseName)
  let counter = 1
  let finalSlug = slug
  
  while (existingSlugs.includes(finalSlug)) {
    finalSlug = `${slug}-${counter}`
    counter++
  }
  
  return finalSlug
}

