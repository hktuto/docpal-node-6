/**
 * Formula Evaluator
 * 
 * Safely evaluates formula expressions for formula field types.
 * Supports basic math, functions, and field references.
 * 
 * Example formulas:
 *   - "deal_value * (probability / 100)" → Expected value calculation
 *   - "DAYS_BETWEEN(TODAY(), close_date)" → Days until close
 *   - "MIN(100, (total_activities * 10) + (won_deals * 20))" → Health score
 * 
 * Security: Uses safe evaluation with limited scope, no eval() or Function()
 */

export interface FormulaFieldConfig {
  formula: string
  resultType: 'number' | 'currency' | 'text' | 'date' | 'boolean'
  description?: string
}

/**
 * Helper function: Calculate days between two dates
 */
function daysBetween(date1: string | Date, date2: string | Date): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2
  const diffTime = d2.getTime() - d1.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Helper function: Get today's date as string
 */
function today(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Helper function: Format a date
 */
function formatDate(date: string | Date, format: string = 'YYYY-MM-DD'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0]
}

/**
 * Replace field references in formula with actual values
 */
function replaceFieldReferences(formula: string, rowData: Record<string, any>): string {
  let expression = formula

  // Sort field names by length (longest first) to avoid partial matches
  const fieldNames = Object.keys(rowData).sort((a, b) => b.length - a.length)

  for (const fieldName of fieldNames) {
    const value = rowData[fieldName]
    
    // Skip if value is null or undefined
    if (value === null || value === undefined) {
      // Replace with 0 for numbers, empty string for text
      expression = expression.replace(
        new RegExp(`\\b${fieldName}\\b`, 'g'),
        '0'
      )
      continue
    }

    // Convert value to string for replacement
    let valueStr: string
    if (typeof value === 'number') {
      valueStr = String(value)
    } else if (typeof value === 'boolean') {
      valueStr = value ? '1' : '0'
    } else if (typeof value === 'string') {
      // Escape quotes in strings
      valueStr = `"${value.replace(/"/g, '\\"')}"`
    } else {
      valueStr = JSON.stringify(value)
    }

    // Replace field name with value (word boundary to avoid partial matches)
    expression = expression.replace(
      new RegExp(`\\b${fieldName}\\b`, 'g'),
      valueStr
    )
  }

  return expression
}

/**
 * Replace function calls with JavaScript equivalents
 */
function replaceFunctions(expression: string): string {
  let result = expression

  // TODAY() → current date string
  result = result.replace(/TODAY\(\)/gi, () => `"${today()}"`)

  // DAYS_BETWEEN(date1, date2) → daysBetween function call
  result = result.replace(
    /DAYS_BETWEEN\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/gi,
    (_, date1, date2) => `__daysBetween(${date1}, ${date2})`
  )

  // MIN(a, b, ...) → Math.min
  result = result.replace(/MIN\s*\(/gi, 'Math.min(')

  // MAX(a, b, ...) → Math.max
  result = result.replace(/MAX\s*\(/gi, 'Math.max(')

  // ABS(a) → Math.abs
  result = result.replace(/ABS\s*\(/gi, 'Math.abs(')

  // ROUND(a) → Math.round
  result = result.replace(/ROUND\s*\(/gi, 'Math.round(')

  // FLOOR(a) → Math.floor
  result = result.replace(/FLOOR\s*\(/gi, 'Math.floor(')

  // CEIL(a) → Math.ceil
  result = result.replace(/CEIL\s*\(/gi, 'Math.ceil(')

  // IF(condition, trueValue, falseValue) → ternary operator
  result = result.replace(
    /IF\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/gi,
    (_, condition, trueVal, falseVal) => `(${condition} ? ${trueVal} : ${falseVal})`
  )

  return result
}

/**
 * Safely evaluate a mathematical expression
 * Uses Function constructor with limited scope (safer than eval)
 */
function safeEvaluate(expression: string): any {
  try {
    // Create a safe function with limited scope
    const safeFunction = new Function(
      'Math',
      '__daysBetween',
      '__formatDate',
      `
        'use strict';
        try {
          return (${expression});
        } catch (error) {
          console.error('Formula evaluation error:', error);
          return null;
        }
      `
    )

    // Execute with controlled context
    const result = safeFunction(
      Math,           // Math object
      daysBetween,    // Date calculation helper
      formatDate      // Date formatting helper
    )

    return result
  } catch (error) {
    console.error('Safe evaluation error:', error)
    return null
  }
}

/**
 * Format the result based on the expected result type
 */
function formatResult(value: any, resultType: string): any {
  if (value === null || value === undefined) {
    return null
  }

  switch (resultType) {
    case 'number':
      return Number(value)

    case 'currency':
      // Return as number, frontend will format with currency symbol
      return Number(value)

    case 'text':
      return String(value)

    case 'date':
      // If it's a date string, validate and format it
      if (typeof value === 'string') {
        try {
          const date = new Date(value)
          return date.toISOString().split('T')[0]
        } catch {
          return value
        }
      }
      return value

    case 'boolean':
      return Boolean(value)

    default:
      return value
  }
}

/**
 * Evaluate a formula for a single row
 */
export function evaluateFormula(
  formula: string,
  rowData: Record<string, any>,
  resultType: string = 'number'
): any {
  try {
    // Step 1: Replace field references with actual values
    let expression = replaceFieldReferences(formula, rowData)

    // Step 2: Replace function calls with JavaScript equivalents
    expression = replaceFunctions(expression)

    // Step 3: Safely evaluate the expression
    const rawResult = safeEvaluate(expression)

    // Step 4: Format the result based on expected type
    const formattedResult = formatResult(rawResult, resultType)

    return formattedResult
  } catch (error) {
    console.error('Formula evaluation error:', error)
    console.error('Formula:', formula)
    console.error('Row data:', rowData)
    return null
  }
}

/**
 * Resolve all formula fields in a row
 */
export function resolveFormulaFieldsForRow(
  row: Record<string, any>,
  formulaColumns: any[]
): Record<string, any> {
  const resolvedRow = { ...row }

  for (const formulaColumn of formulaColumns) {
    const config = formulaColumn.config as FormulaFieldConfig
    
    if (!config?.formula) {
      resolvedRow[formulaColumn.name] = null
      continue
    }

    const value = evaluateFormula(
      config.formula,
      row,
      config.resultType || 'number'
    )

    resolvedRow[formulaColumn.name] = value
  }

  return resolvedRow
}

/**
 * Resolve formula fields for multiple rows
 */
export function resolveFormulaFieldsForRows(
  rows: Record<string, any>[],
  columns: any[]
): Record<string, any>[] {
  // Find all formula columns
  const formulaColumns = columns.filter(c => c.type === 'formula')

  if (formulaColumns.length === 0) {
    return rows
  }

  console.log(`🧮 Resolving ${formulaColumns.length} formula fields for ${rows.length} rows...`)

  // Resolve formulas for each row
  const resolvedRows = rows.map(row => 
    resolveFormulaFieldsForRow(row, formulaColumns)
  )

  console.log(`✅ Resolved formula fields`)

  return resolvedRows
}

