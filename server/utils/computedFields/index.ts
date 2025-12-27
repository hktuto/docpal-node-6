/**
 * Computed Fields System - Main Entry Point
 * 
 * This module provides advanced field types that automatically calculate,
 * pull, or aggregate data.
 * 
 * @see README.md for comprehensive documentation
 */

// Relation Fields - Enrich with display information
export {
  resolveRelationField,
  resolveRelationFieldsForRow,
  resolveRelationFieldsForRows,
  type RelationFieldConfig,
  type RelationFieldValue
} from './relationResolver'

// Lookup Fields - Pull data from related records
export {
  resolveLookupField,
  resolveLookupFieldsForRow,
  resolveLookupFieldsForRows,
  type LookupFieldConfig
} from './lookupResolver'

// Formula Fields - Calculate values using expressions
export {
  evaluateFormula,
  resolveFormulaFieldsForRow,
  resolveFormulaFieldsForRows,
  type FormulaFieldConfig
} from './formulaEvaluator'

// Rollup Fields - Aggregate data from related tables
export {
  resolveRollupField,
  resolveRollupFieldsForRow,
  resolveRollupFieldsForRows,
  type RollupFieldConfig
} from './rollupResolver'

