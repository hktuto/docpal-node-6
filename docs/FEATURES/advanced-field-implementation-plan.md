# 🎯 Advanced Field Types - Implementation Plan

**Date**: December 27, 2025  
**Phase**: Option A - Polish Current Features  
**Priority**: High - Core CRM functionality

---

## 📋 Overview

Implement the three advanced field types that are already defined in templates:
1. **Lookup Fields** - Show data from related records
2. **Rollup Fields** - Aggregate data from related records
3. **Formula Fields** - Calculate values from other fields

---

## 1️⃣ Lookup Fields

### What Are Lookup Fields?

Pull data from a related record through a relation field.

**Example:**
```
Contact table:
- company (relation to Companies)
- company_industry (lookup from company.industry)

When Contact.company = "Acme Corp"
Then Contact.company_industry = "Technology" (auto-populated)
```

### Current Status
- ✅ Defined in template
- ✅ Column created in database
- ❌ Values not calculated

### Implementation Steps

#### Step 1: Backend Calculation
```typescript
// server/utils/lookupResolver.ts

export async function resolveLookupField(
  columnConfig: any,
  rowData: any,
  allColumns: any[]
) {
  // 1. Get relation field value (UUID)
  const relationFieldName = columnConfig.relationField
  const relationId = rowData[relationFieldName]
  
  if (!relationId) return null
  
  // 2. Find relation column to get target table
  const relationColumn = allColumns.find(c => c.name === relationFieldName)
  const targetTable = relationColumn.config.targetTable
  
  // 3. Query target table for the field
  const targetField = columnConfig.targetField
  const result = await db.execute(sql`
    SELECT ${targetField} 
    FROM ${targetTable} 
    WHERE id = ${relationId}
  `)
  
  return result[0]?.[targetField]
}
```

#### Step 2: Integrate into Row Query
```typescript
// server/api/workspaces/.../rows/index.get.ts

// After fetching rows
for (const row of rows) {
  for (const column of lookupColumns) {
    row[column.name] = await resolveLookupField(
      column.config,
      row,
      allColumns
    )
  }
}
```

#### Step 3: Real-time Updates
```typescript
// When a related record updates, invalidate lookup cache
// Or use database triggers
```

### Files to Create/Modify
- `server/utils/lookupResolver.ts` (new)
- `server/api/workspaces/[workspaceSlug]/tables/[tableSlug]/rows/index.get.ts` (modify)
- `server/api/workspaces/[workspaceSlug]/tables/[tableSlug]/rows/[rowId]/index.get.ts` (modify)

---

## 2️⃣ Rollup/Aggregation Fields

### What Are Rollup Fields?

Aggregate data from multiple related records.

**Example:**
```
Company_Stats table:
- company (relation to Companies)
- total_contacts (rollup: COUNT contacts where company = this.company)
- total_deal_value (rollup: SUM deals.deal_value where company = this.company)

For "Acme Corp":
- total_contacts = 2 (John + Sarah)
- total_deal_value = $500,000 (Acme Enterprise License)
```

### Current Status
- ✅ Defined in template
- ✅ Column created in database
- ❌ Values not calculated

### Implementation Steps

#### Step 1: Backend Calculation
```typescript
// server/utils/rollupResolver.ts

export async function resolveRollupField(
  columnConfig: any,
  rowData: any
) {
  const {
    sourceTable,
    filterBy,
    aggregation,
    aggregationField
  } = columnConfig
  
  // Build filter condition
  const filterConditions = buildFilterFromConfig(filterBy, rowData)
  
  // Execute aggregation
  switch (aggregation) {
    case 'COUNT':
      return await db.execute(sql`
        SELECT COUNT(*) as value
        FROM ${sourceTable}
        WHERE ${filterConditions}
      `)
    
    case 'SUM':
      return await db.execute(sql`
        SELECT SUM(${aggregationField}) as value
        FROM ${sourceTable}
        WHERE ${filterConditions}
      `)
    
    case 'AVG':
      return await db.execute(sql`
        SELECT AVG(${aggregationField}) as value
        FROM ${sourceTable}
        WHERE ${filterConditions}
      `)
    
    case 'MIN':
    case 'MAX':
      // Similar implementation
  }
}
```

#### Step 2: Filter Builder
```typescript
function buildFilterFromConfig(filterBy: any, rowData: any) {
  // Handle: { field: "company", matchesValue: "{{company}}" }
  // Replace {{company}} with actual value from rowData
  
  const field = filterBy.field
  let value = filterBy.matchesValue
  
  // Replace template variables
  if (value.startsWith('{{') && value.endsWith('}}')) {
    const fieldName = value.slice(2, -2)
    value = rowData[fieldName]
  }
  
  return sql`${field} = ${value}`
}
```

#### Step 3: Caching Strategy
```typescript
// Option 1: Calculate on-demand (slower, always accurate)
// Option 2: Pre-calculate and store (faster, needs updates)
// Option 3: Database views (best, but complex)

// For MVP: Calculate on-demand
```

### Files to Create/Modify
- `server/utils/rollupResolver.ts` (new)
- `server/api/workspaces/[workspaceSlug]/tables/[tableSlug]/rows/index.get.ts` (modify)

---

## 3️⃣ Formula Fields

### What Are Formula Fields?

Calculate values from other fields in the same row.

**Example:**
```
Deals table:
- deal_value = 500000
- probability = 75
- expected_value (formula: deal_value * (probability / 100))
  → Result: 375000

- close_date = "2025-01-15"
- days_to_close (formula: DAYS_BETWEEN(TODAY(), close_date))
  → Result: 19
```

### Current Status
- ✅ Defined in template
- ✅ Column created in database
- ❌ Values not calculated

### Implementation Steps

#### Step 1: Formula Parser
```typescript
// server/utils/formulaEvaluator.ts

export function evaluateFormula(
  formula: string,
  rowData: any,
  resultType: string
) {
  // 1. Replace field references with values
  let expression = formula
  
  // Replace field names with values
  for (const [field, value] of Object.entries(rowData)) {
    expression = expression.replace(
      new RegExp(`\\b${field}\\b`, 'g'),
      String(value)
    )
  }
  
  // 2. Replace functions
  expression = replaceFunctions(expression)
  
  // 3. Evaluate safely
  return evaluateSafely(expression, resultType)
}
```

#### Step 2: Function Implementations
```typescript
function replaceFunctions(expression: string) {
  // TODAY()
  expression = expression.replace(
    /TODAY\(\)/g,
    `"${new Date().toISOString().split('T')[0]}"`
  )
  
  // DAYS_BETWEEN(date1, date2)
  expression = expression.replace(
    /DAYS_BETWEEN\(([^,]+),\s*([^)]+)\)/g,
    (_, date1, date2) => {
      return `daysBetween(${date1}, ${date2})`
    }
  )
  
  // MIN(a, b), MAX(a, b)
  expression = expression.replace(/MIN\(/g, 'Math.min(')
  expression = expression.replace(/MAX\(/g, 'Math.max(')
  
  return expression
}
```

#### Step 3: Safe Evaluation
```typescript
function evaluateSafely(expression: string, resultType: string) {
  try {
    // Use a safe eval method (not eval())
    // Option 1: math.js library
    // Option 2: Custom parser
    // Option 3: Limited Function() with sandbox
    
    const result = new Function(
      'Math',
      'daysBetween',
      `return ${expression}`
    )(
      Math,
      (d1: string, d2: string) => {
        const diff = new Date(d2).getTime() - new Date(d1).getTime()
        return Math.floor(diff / (1000 * 60 * 60 * 24))
      }
    )
    
    // Format based on resultType
    switch (resultType) {
      case 'number':
        return Number(result)
      case 'currency':
        return Number(result)
      case 'text':
        return String(result)
      case 'date':
        return new Date(result).toISOString().split('T')[0]
      default:
        return result
    }
  } catch (error) {
    console.error('Formula evaluation error:', error)
    return null
  }
}
```

### Supported Functions (MVP)
- ✅ `TODAY()` - Current date
- ✅ `DAYS_BETWEEN(date1, date2)` - Days difference
- ✅ `MIN(a, b)` - Minimum value
- ✅ `MAX(a, b)` - Maximum value
- ✅ Basic math operators: `+`, `-`, `*`, `/`, `()`

### Files to Create/Modify
- `server/utils/formulaEvaluator.ts` (new)
- `server/api/workspaces/[workspaceSlug]/tables/[tableSlug]/rows/index.get.ts` (modify)

---

## 📊 Implementation Priority

### Phase 1: Lookup Fields (Easiest) ⭐
- Most straightforward
- Single query per field
- No complex logic
- **Estimated Time:** 2-3 hours

### Phase 2: Formula Fields (Medium)
- Self-contained (only uses current row)
- Need safe evaluation
- Function library needed
- **Estimated Time:** 3-4 hours

### Phase 3: Rollup Fields (Complex)
- Multiple queries
- Aggregation logic
- Performance considerations
- Caching strategy needed
- **Estimated Time:** 4-5 hours

---

## 🎯 Integration Points

### Main Integration File
`server/api/workspaces/[workspaceSlug]/tables/[tableSlug]/rows/index.get.ts`

```typescript
// Current: Just return raw data
const rows = await db.execute(sql.raw(`SELECT * FROM ${table.tableName}`))

// Enhanced: Process computed fields
const rows = await db.execute(sql.raw(`SELECT * FROM ${table.tableName}`))

// Get all columns for this table
const columns = await getTableColumns(table.id)

// Process each row
for (const row of rows) {
  // 1. Calculate lookup fields
  for (const col of lookupColumns) {
    row[col.name] = await resolveLookupField(col.config, row, columns)
  }
  
  // 2. Calculate formula fields
  for (const col of formulaColumns) {
    row[col.name] = evaluateFormula(col.config.formula, row, col.config.resultType)
  }
  
  // 3. Calculate rollup fields
  for (const col of rollupColumns) {
    row[col.name] = await resolveRollupField(col.config, row)
  }
}

return rows
```

---

## ✅ Testing Plan

### Lookup Fields Test
1. Open Contacts table
2. Verify "Company Industry" column shows correct industry
3. Change contact's company
4. Verify lookup updates

### Formula Fields Test
1. Open Deals table
2. Verify "Expected Value" = deal_value * (probability / 100)
3. Verify "Days to Close" calculates correctly
4. Change deal_value or probability
5. Verify formula recalculates

### Rollup Fields Test
1. Open Company_Stats table
2. Verify "Total Contacts" counts correctly
3. Verify "Total Deal Value" sums correctly
4. Add a new contact to a company
5. Verify rollup updates

---

## 🚀 Next Steps After Testing

1. **If tests pass** → Start implementing in order:
   - Lookup Fields (2-3 hours)
   - Formula Fields (3-4 hours)
   - Rollup Fields (4-5 hours)

2. **If issues found** → Fix them first

3. **Optional enhancements:**
   - Add more formula functions
   - Add caching for rollups
   - Add background jobs for rollup updates
   - Add formula syntax validator

---

**Ready to implement?** Let's test first, then build! 🚀

