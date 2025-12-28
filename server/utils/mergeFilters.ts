import type { FilterGroup } from '#shared/types/db'

/**
 * Merge two filter groups with AND logic
 * 
 * @param base - Base filters (from view or override)
 * @param additional - Additional filters to AND on top
 * @returns Merged filter group or null
 */
export function mergeFilters(
  base: FilterGroup | null | undefined,
  additional: FilterGroup | null | undefined
): FilterGroup | null {
  // If both are null/undefined, return null
  if (!base && !additional) return null
  
  // If only one exists, return it
  if (!base) return additional || null
  if (!additional) return base || null
  
  // Both exist: wrap in AND group
  return {
    operator: 'AND',
    conditions: [base, additional]
  }
}

