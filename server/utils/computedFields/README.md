# 🧮 Computed Fields System

**Location:** `server/utils/computedFields/`  
**Purpose:** Advanced field types that automatically calculate, pull, or aggregate data

---

## 📋 Overview

The Computed Fields system provides four types of advanced field processing that extend basic data types with intelligent, automatic calculations:

1. **Relation Fields** - Enrich with display information (NEW!)
2. **Lookup Fields** - Pull data from related records
3. **Formula Fields** - Calculate values using expressions
4. **Rollup Fields** - Aggregate data from related tables

These fields are calculated **on-the-fly** when querying data, ensuring values are always up-to-date.

---

## 📁 File Structure

```
server/utils/computedFields/
├── README.md                  ← You are here
├── relationResolver.ts        ← Relation field enrichment (NEW!)
├── lookupResolver.ts          ← Lookup field logic
├── formulaEvaluator.ts        ← Formula field logic
├── rollupResolver.ts          ← Rollup field logic
└── index.ts                   ← Exports for easy importing
```

---

## 🔄 Execution Flow

When a user queries data, computed fields are resolved in this order:

```typescript
// 1. Fetch raw data from database
const rows = await db.execute(sql`SELECT * FROM table`)

// 2. Resolve Relation fields (enrich with display information)
rows = await resolveRelationFieldsForRows(rows, columns)

// 3. Resolve Lookup fields (pull data from relations)
rows = await resolveLookupFieldsForRows(rows, columns, tableName)

// 4. Resolve Rollup fields (aggregate related data)
rows = await resolveRollupFieldsForRows(rows, columns)

// 5. Resolve Formula fields (calculate from current row + lookups/rollups)
rows = resolveFormulaFieldsForRows(rows, columns)

// 6. Return enhanced rows
return rows
```

**Why this order?**
- Relations must run first (makes frontend display easier)
- Lookups run second (formulas may use lookup values)
- Rollups run third (formulas may use rollup values)
- Formulas run last (can use all other field values)

---

## 0️⃣ Relation Fields (NEW!)

**File:** `relationResolver.ts`  
**Purpose:** Enrich relation fields with display information for better frontend UX

### How It Works

```typescript
// Contact table has:
// - company (relation → Companies table, displayField: "company_name")

// Before enrichment (raw database value):
const contact = {
  full_name: "John Smith",
  company: "019d1234-5678-7100-8000-000000000001"  // Just a UUID
}

// After enrichment:
const contact = {
  full_name: "John Smith",
  company: {
    relatedId: "019d1234-5678-7100-8000-000000000001",
    displayFieldValue: "Acme Corp",
    displayField: "company_name"
  }
}
```

### Why This Is Useful

**Problem:** Without enrichment, the frontend only gets a UUID. To display something meaningful, it must:
1. Know which field to display (company_name)
2. Make a separate API call to fetch the company
3. Extract the display field value

**Solution:** With enrichment, the frontend gets everything it needs in one response:
- ✅ The UUID (for updates/links)
- ✅ The display value ("Acme Corp")
- ✅ The display field name (for consistency)

### Configuration

```json
{
  "name": "company",
  "type": "relation",
  "config": {
    "targetTable": "companies",
    "displayField": "company_name",
    "allowMultiple": false
  }
}
```

### Frontend Usage Examples

#### Display the relation
```vue
<template>
  <!-- Before (manual lookup needed) -->
  <div>{{ contact.company }}</div>  <!-- Shows: 019d1234-... -->
  
  <!-- After (auto-enriched) -->
  <div>{{ contact.company.displayFieldValue }}</div>  <!-- Shows: Acme Corp -->
</template>
```

#### Edit the relation
```vue
<template>
  <select v-model="contact.company.relatedId">
    <option v-for="company in companies" :value="company.id">
      {{ company.company_name }}
    </option>
  </select>
</template>

<script>
// When saving, send the relatedId
const updateData = {
  company: contact.company.relatedId  // The UUID
}
</script>
```

#### Link to the related record
```vue
<template>
  <NuxtLink :to="`/workspaces/${workspace}/tables/companies/rows/${contact.company.relatedId}`">
    {{ contact.company.displayFieldValue }}
  </NuxtLink>
</template>
```

### Key Functions

#### `resolveRelationField(columnConfig, relationId)`
Resolves a single relation field.

**Parameters:**
- `columnConfig` - Relation field configuration
- `relationId` - The UUID of the related record

**Returns:** Enriched relation object or `null`

```typescript
{
  relatedId: "019d1234-...",
  displayFieldValue: "Acme Corp",
  displayField: "company_name"
}
```

#### `resolveRelationFieldsForRows(rows, columns)`
Resolves all relation fields for multiple rows.

**Parameters:**
- `rows` - Array of row objects
- `columns` - Array of column definitions

**Returns:** Rows with relation fields enriched

### Handling NULL Relations

If a relation field is empty:

```typescript
// Input
{
  full_name: "Jane Doe",
  company: null
}

// Output
{
  full_name: "Jane Doe",
  company: null  // Stays null
}
```

### Handling Missing Display Values

If the related record is deleted but the relation still exists:

```typescript
// Output
{
  company: {
    relatedId: "019d1234-...",
    displayFieldValue: null,  // Record not found
    displayField: "company_name"
  }
}
```

### Multiple Relations (Future)

Currently, `allowMultiple` relations store an array of UUIDs. In the future, this will return:

```typescript
{
  companies: [
    { relatedId: "uuid1", displayFieldValue: "Acme Corp", displayField: "company_name" },
    { relatedId: "uuid2", displayFieldValue: "GlobalTech", displayField: "company_name" }
  ]
}
```

### Performance

**Impact:** 1 query per relation field per row

**Example:** 50 rows with 2 relations = ~100 extra queries (~200ms)

**Status:** ✅ Acceptable for most use cases

**Optimization:** Same as lookups - batch queries can reduce to 2 queries total

---

## 1️⃣ Lookup Fields

**File:** `lookupResolver.ts`  
**Purpose:** Pull a value from a related record through a relation field

### How It Works

```typescript
// Contact table has:
// - company (relation → Companies table)
// - company_industry (lookup from company.industry)

// When fetching a contact:
const contact = {
  full_name: "John Smith",
  company: "019d1234-5678-7100-8000-000000000001",  // UUID
  company_industry: null  // Will be populated
}

// Lookup resolver:
// 1. Finds the relation field config
// 2. Gets target table (companies)
// 3. Queries: SELECT industry FROM companies WHERE id = '019d...'
// 4. Populates: contact.company_industry = "Technology"
```

### Configuration

```json
{
  "name": "company_industry",
  "type": "lookup",
  "config": {
    "relationField": "company",      // Which relation field to follow
    "targetField": "industry"        // Which field to pull from related record
  }
}
```

### Key Functions

#### `resolveLookupField(columnConfig, rowData, allColumns, tableName)`
Resolves a single lookup field for one row.

**Parameters:**
- `columnConfig` - Lookup field configuration
- `rowData` - Current row data
- `allColumns` - All columns in the table
- `tableName` - Physical table name

**Returns:** The looked-up value or `null`

#### `resolveLookupFieldsForRows(rows, columns, tableName)`
Resolves all lookup fields for multiple rows.

**Parameters:**
- `rows` - Array of row objects
- `columns` - Array of column definitions
- `tableName` - Physical table name

**Returns:** Rows with lookup fields populated

### Adding New Features

To add support for chained lookups (lookup from a lookup):

```typescript
// In resolveLookupField(), after getting relatedRecord:
if (relatedRecord && relatedRecord[targetFieldName] === null) {
  // Check if target field is also a lookup
  const targetColumn = targetTableColumns.find(c => c.name === targetFieldName)
  if (targetColumn?.type === 'lookup') {
    // Recursively resolve the lookup
    return await resolveLookupField(targetColumn.config, relatedRecord, ...)
  }
}
```

---

## 2️⃣ Formula Fields

**File:** `formulaEvaluator.ts`  
**Purpose:** Calculate values using mathematical expressions and functions

### How It Works

```typescript
// Deal table has:
// - deal_value: 500000
// - probability: 75
// - expected_value (formula: deal_value * (probability / 100))

// When fetching a deal:
const deal = {
  deal_value: 500000,
  probability: 75,
  expected_value: null  // Will be calculated
}

// Formula evaluator:
// 1. Replaces field references: "deal_value * (probability / 100)"
// 2. Becomes: "500000 * (75 / 100)"
// 3. Evaluates safely: 375000
// 4. Populates: deal.expected_value = 375000
```

### Configuration

```json
{
  "name": "expected_value",
  "type": "formula",
  "config": {
    "formula": "deal_value * (probability / 100)",
    "resultType": "currency"
  }
}
```

### Supported Functions

#### Math Functions
- `+`, `-`, `*`, `/`, `()` - Basic operators
- `MIN(a, b, ...)` - Minimum value
- `MAX(a, b, ...)` - Maximum value
- `ROUND(a)` - Round to nearest integer
- `FLOOR(a)` - Round down
- `CEIL(a)` - Round up
- `ABS(a)` - Absolute value

#### Date Functions
- `TODAY()` - Current date
- `DAYS_BETWEEN(date1, date2)` - Days difference

#### Logic Functions
- `IF(condition, trueValue, falseValue)` - Conditional

### Key Functions

#### `evaluateFormula(formula, rowData, resultType)`
Evaluates a formula for a single row.

**Parameters:**
- `formula` - The formula string
- `rowData` - Current row data
- `resultType` - Expected return type (number, currency, text, date, boolean)

**Returns:** Calculated value

#### `resolveFormulaFieldsForRows(rows, columns)`
Resolves all formula fields for multiple rows.

**Parameters:**
- `rows` - Array of row objects
- `columns` - Array of column definitions

**Returns:** Rows with formula fields calculated

### Adding New Functions

To add a `CONCAT(str1, str2)` function:

```typescript
// In replaceFunctions():
result = result.replace(
  /CONCAT\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/gi,
  (_, str1, str2) => `(String(${str1}) + String(${str2}))`
)
```

To add a `YEAR(date)` function:

```typescript
// Add helper function:
function yearFromDate(date: string | Date): number {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.getFullYear()
}

// In replaceFunctions():
result = result.replace(
  /YEAR\s*\(\s*([^)]+)\s*\)/gi,
  (_, date) => `__yearFromDate(${date})`
)

// In safeEvaluate(), add to function params:
const safeFunction = new Function(
  'Math',
  '__daysBetween',
  '__formatDate',
  '__yearFromDate',  // Add new function
  `...`
)
const result = safeFunction(
  Math,
  daysBetween,
  formatDate,
  yearFromDate  // Pass implementation
)
```

---

## 3️⃣ Rollup Fields

**File:** `rollupResolver.ts`  
**Purpose:** Aggregate data from multiple related records

### How It Works

```typescript
// Company_Stats table has:
// - company (relation → Companies)
// - total_contacts (rollup: COUNT contacts where company = this.company)
// - total_deal_value (rollup: SUM deals.deal_value where company = this.company)

// When fetching company stats:
const stats = {
  company: "019d1234-5678-7100-8000-000000000001",
  total_contacts: null,      // Will be aggregated
  total_deal_value: null     // Will be aggregated
}

// Rollup resolver:
// 1. For total_contacts:
//    SELECT COUNT(*) FROM contacts WHERE company = '019d...'
//    Result: 2
// 2. For total_deal_value:
//    SELECT SUM(deal_value) FROM deals WHERE company = '019d...'
//    Result: 500000
// 3. Populates: stats.total_contacts = 2, stats.total_deal_value = 500000
```

### Configuration

```json
{
  "name": "total_contacts",
  "type": "rollup",
  "config": {
    "sourceTable": "contacts",
    "filterBy": {
      "field": "company",
      "matchesValue": "{{company}}"
    },
    "aggregation": "COUNT"
  }
}
```

With aggregation field:

```json
{
  "name": "total_deal_value",
  "type": "rollup",
  "config": {
    "sourceTable": "deals",
    "filterBy": {
      "field": "company",
      "matchesValue": "{{company}}"
    },
    "aggregation": "SUM",
    "aggregationField": "deal_value"
  }
}
```

With compound filter (AND):

```json
{
  "name": "won_deals",
  "type": "rollup",
  "config": {
    "sourceTable": "deals",
    "filterBy": {
      "field": "company",
      "matchesValue": "{{company}}",
      "and": {
        "field": "stage",
        "equals": "Closed Won"
      }
    },
    "aggregation": "COUNT"
  }
}
```

### Supported Aggregations

- **COUNT** - Count related records
- **SUM** - Sum numeric values
- **AVG** - Average numeric values
- **MIN** - Find minimum value
- **MAX** - Find maximum value

### Key Functions

#### `resolveRollupField(columnConfig, rowData)`
Resolves a single rollup field for one row.

**Parameters:**
- `columnConfig` - Rollup field configuration
- `rowData` - Current row data

**Returns:** Aggregated value

#### `resolveRollupFieldsForRows(rows, columns)`
Resolves all rollup fields for multiple rows.

**Parameters:**
- `rows` - Array of row objects
- `columns` - Array of column definitions

**Returns:** Rows with rollup fields calculated

### JSONB Column Handling

**Important:** Relation, currency, select, email, phone, url, and other complex fields are stored as JSONB columns.

Rollups handle this by casting:

```sql
-- For filters:
WHERE ("company"::text = '"uuid..."' OR "company" #>> '{}' = 'uuid...')

-- For SUM/AVG:
SUM(("deal_value" #>> '{}')::numeric)

-- For MIN/MAX:
MAX("activity_date" #>> '{}')
```

The `#>> '{}'` operator extracts JSONB as text.

### Adding New Aggregations

To add a `DISTINCT_COUNT` aggregation:

```typescript
// In resolveRollupField(), add new case:
case 'DISTINCT_COUNT':
  if (!aggregationField) {
    console.warn('Rollup: DISTINCT_COUNT requires aggregationField')
    return null
  }
  aggregationSQL = `COUNT(DISTINCT "${aggregationField}")`
  break
```

To add support for OR filters:

```typescript
// Update RollupFieldConfig interface:
export interface RollupFieldConfig {
  // ... existing fields
  filterBy: {
    field: string
    matchesValue: string
    and?: { field: string; equals: string }
    or?: { field: string; equals: string }  // Add OR support
  }
}

// In buildFilterClause(), handle OR:
if (filterConfig.or) {
  const orField = filterConfig.or.field
  const orValue = filterConfig.or.equals
  conditions.push(`("${orField}"::text = '"${orValue}"' OR "${orField}" #>> '{}' = '${orValue}')`)
}

// Change join logic:
if (filterConfig.or) {
  return conditions.join(' OR ')
} else {
  return conditions.join(' AND ')
}
```

---

## 🎯 Integration Points

### Where Computed Fields Are Used

#### 1. Direct Table Queries
**File:** `server/api/workspaces/[workspaceSlug]/tables/[tableSlug]/rows/index.get.ts`

```typescript
import { resolveLookupFieldsForRows } from '~/server/utils/computedFields/lookupResolver'
import { resolveFormulaFieldsForRows } from '~/server/utils/computedFields/formulaEvaluator'
import { resolveRollupFieldsForRows } from '~/server/utils/computedFields/rollupResolver'

// ... fetch rows ...

rows = await resolveLookupFieldsForRows(rows, columns, tableName)
rows = await resolveRollupFieldsForRows(rows, columns)
rows = resolveFormulaFieldsForRows(rows, columns)
```

#### 2. View-Based Queries
**File:** `server/utils/queryRowsByView.ts`

```typescript
import { resolveFormulaFieldsForRows } from './computedFields/formulaEvaluator'
import { resolveRollupFieldsForRows } from './computedFields/rollupResolver'

// ... (lookups resolved inline)

rows = await resolveLookups(rows, visibleColumns, allColumns, db, schema)
rows = await resolveRollupFieldsForRows(rows, visibleColumns)
rows = resolveFormulaFieldsForRows(rows, visibleColumns)
```

---

## ⚡ Performance Considerations

### Current Performance

| Field Type | Queries per Row | Speed | Notes |
|------------|----------------|-------|-------|
| Relation | 1 per field | Fast | Simple SELECT queries |
| Lookup | 1 per field | Fast | Simple SELECT queries |
| Formula | 0 | Very Fast | Pure calculation, no DB |
| Rollup | 1 per field | Moderate | Aggregation queries |

### Performance Impact Examples

**50 rows with 2 lookups:**
- Queries: ~100
- Time: ~200ms
- Status: ✅ Good

**50 rows with 3 formulas:**
- Queries: 0
- Time: ~50ms
- Status: ✅ Excellent

**10 rows with 6 rollups:**
- Queries: ~60
- Time: ~600ms
- Status: ⚠️ Acceptable for small datasets

### Optimization Strategies

#### 1. Caching (Recommended for Rollups)

```typescript
// Add to rollupResolver.ts:
import { useStorage } from '#imports'

const CACHE_TTL = 300 // 5 minutes

async function resolveRollupFieldWithCache(
  columnConfig: RollupFieldConfig,
  rowData: Record<string, any>
): Promise<any> {
  // Build cache key
  const cacheKey = `rollup:${columnConfig.sourceTable}:${JSON.stringify(columnConfig.filterBy)}:${rowData.id}`
  
  // Check cache
  const storage = useStorage()
  const cached = await storage.getItem(cacheKey)
  if (cached !== null) return cached
  
  // Calculate
  const value = await resolveRollupField(columnConfig, rowData)
  
  // Store in cache
  await storage.setItem(cacheKey, value, { ttl: CACHE_TTL })
  
  return value
}
```

#### 2. Batch Queries (Recommended for Lookups)

```typescript
// Group lookups by target table and fetch in batches
const lookupsByTable = groupBy(lookupColumns, col => col.config.targetTable)

for (const [targetTable, lookups] of lookupsByTable) {
  // Collect all relation IDs
  const relationIds = rows.flatMap(row => 
    lookups.map(lookup => row[lookup.config.relationField])
  ).filter(Boolean)
  
  // Single query to fetch all
  const relatedRecords = await db.select()
    .from(targetTable)
    .where(in(id, relationIds))
  
  // Map results back to rows
  // ...
}
```

#### 3. Database Indexes

```sql
-- Add indexes on relation fields for faster lookups and rollups
CREATE INDEX idx_contacts_company ON contacts(company);
CREATE INDEX idx_deals_company ON deals(company);
CREATE INDEX idx_activities_company ON activities(company);
```

---

## 🐛 Troubleshooting

### Issue: Lookup Shows NULL

**Symptoms:** Lookup field always shows `null`

**Possible Causes:**
1. Relation field is empty
2. Related record doesn't exist
3. Target field name is wrong
4. Target table slug is wrong

**Debug Steps:**
```typescript
// Check relation value
console.log('Relation ID:', row[relationFieldName])

// Check if related record exists
const record = await db.select()
  .from(targetTable)
  .where(eq(id, relationId))
console.log('Related record:', record)
```

**Solution:**
- Verify relation field has a valid UUID
- Check target table slug matches actual table slug
- Ensure target field exists in related table

---

### Issue: Formula Returns NULL

**Symptoms:** Formula field always shows `null`

**Possible Causes:**
1. Formula syntax error
2. Field name typo
3. Division by zero
4. Function not supported

**Debug Steps:**
```typescript
// Enable formula logging in formulaEvaluator.ts:
console.log('Original formula:', formula)
console.log('After replacements:', expression)
console.log('Raw result:', rawResult)
```

**Solution:**
- Check formula syntax matches supported functions
- Verify all field names exist in row data
- Add parentheses for operator precedence
- Handle null values in formula

---

### Issue: Rollup Returns 0 When Should Have Data

**Symptoms:** Rollup COUNT/SUM shows 0 but records exist

**Possible Causes:**
1. Filter not matching correctly (JSONB casting issue)
2. Template variable not replaced
3. Source table not found
4. Field name mismatch

**Debug Steps:**
```typescript
// Add logging in rollupResolver.ts:
console.log('Filter clause:', whereClause)
console.log('Full query:', query)
console.log('Query result:', result)
```

**Solution:**
- Check JSONB casting is correct
- Verify {{template}} variables are replaced with actual values
- Ensure source table slug is correct
- Check column names match exactly

---

### Issue: "invalid input syntax for type json"

**Symptoms:** SQL error when querying JSONB columns

**Cause:** Trying to compare JSONB column with text directly

**Solution:**
Use proper JSONB casting:
```sql
-- ❌ Wrong:
WHERE "company" = 'uuid-value'

-- ✅ Correct:
WHERE ("company"::text = '"uuid-value"' OR "company" #>> '{}' = 'uuid-value')
```

---

## 🔧 Testing

### Unit Testing Example

```typescript
// tests/computedFields/formulaEvaluator.test.ts
import { evaluateFormula } from '~/server/utils/computedFields/formulaEvaluator'

describe('Formula Evaluator', () => {
  it('evaluates basic math', () => {
    const result = evaluateFormula('5 * (3 + 2)', {}, 'number')
    expect(result).toBe(25)
  })
  
  it('replaces field references', () => {
    const result = evaluateFormula(
      'deal_value * (probability / 100)',
      { deal_value: 500000, probability: 75 },
      'currency'
    )
    expect(result).toBe(375000)
  })
  
  it('handles null values', () => {
    const result = evaluateFormula(
      'deal_value * (probability / 100)',
      { deal_value: 500000, probability: null },
      'currency'
    )
    expect(result).toBe(0)
  })
})
```

### Integration Testing

```typescript
// tests/api/computedFields.test.ts
describe('Computed Fields API', () => {
  it('resolves all computed fields correctly', async () => {
    const response = await fetch('/api/workspaces/test/tables/contacts/rows')
    const data = await response.json()
    
    expect(data.data[0].company_industry).toBe('Technology')
    expect(data.data[0].full_name).toBe('John Smith')
  })
})
```

---

## 📚 Additional Resources

### Documentation
- [Lookup Fields Complete](../../../docs/DEVELOPMENT_PROCESS/2025-12-27-lookup-fields-COMPLETE.md)
- [Formula Fields Complete](../../../docs/DEVELOPMENT_PROCESS/2025-12-27-formula-fields-COMPLETE.md)
- [Rollup Fields Complete](../../../docs/DEVELOPMENT_PROCESS/2025-12-27-rollup-fields-COMPLETE.md)
- [Advanced Field Types](../../../docs/FEATURES/advanced-field-types.md)

### Related Files
- Table creation: `server/api/app-templates/create-workspace.post.ts`
- Dynamic tables: `server/utils/dynamicTable.ts`
- Relation helpers: `server/utils/relationHelpers.ts`
- View queries: `server/utils/queryRowsByView.ts`

---

## 🎯 Quick Reference

### Import All Utilities
```typescript
import {
  resolveRelationFieldsForRows,
  resolveLookupFieldsForRows,
  resolveFormulaFieldsForRows,
  resolveRollupFieldsForRows
} from '~/server/utils/computedFields'
```

### Usage Pattern
```typescript
// 1. Fetch data
let rows = await db.execute(sql`SELECT * FROM table`)

// 2. Resolve in order
rows = await resolveRelationFieldsForRows(rows, columns)
rows = await resolveLookupFieldsForRows(rows, columns, tableName)
rows = await resolveRollupFieldsForRows(rows, columns)
rows = resolveFormulaFieldsForRows(rows, columns)

// 3. Return enhanced data
return rows
```

### Field Type Detection
```typescript
const relationColumns = columns.filter(c => c.type === 'relation')
const lookupColumns = columns.filter(c => c.type === 'lookup')
const formulaColumns = columns.filter(c => c.type === 'formula')
const rollupColumns = columns.filter(c => c.type === 'rollup')
```

---

**Last Updated:** December 27, 2025  
**Version:** 1.0.0  
**Maintainer:** DocPal Development Team

