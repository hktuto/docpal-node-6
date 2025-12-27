# Advanced Field Types Reference

**Status**: Implementation Guide  
**Date**: December 27, 2025

## Overview

DocPal supports advanced field types that enable complex data relationships and calculations:

1. **Relation** - Link records between tables
2. **Lookup** - Get values from related records
3. **Rollup** - Aggregate data from related records
4. **Formula** - Calculate values dynamically

## 1. Relation Fields 🔗

Link records from one table to another.

### Configuration

```json
{
  "name": "company",
  "label": "Company",
  "type": "relation",
  "required": false,
  "config": {
    "targetTable": "companies",
    "displayField": "company_name",
    "allowMultiple": false,
    "filterBy": {
      "field": "status",
      "equals": "active"
    }
  }
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `targetTable` | string | Table to link to |
| `displayField` | string | Field to display from target |
| `allowMultiple` | boolean | Allow multiple selections |
| `filterBy` | object | Filter target records |

### Examples

**Single Relation:**
```json
{
  "name": "assigned_to",
  "type": "relation",
  "config": {
    "targetTable": "users",
    "displayField": "name",
    "allowMultiple": false
  }
}
```

**Multiple Relations:**
```json
{
  "name": "tags",
  "type": "relation",
  "config": {
    "targetTable": "tags",
    "displayField": "name",
    "allowMultiple": true
  }
}
```

**Filtered Relation:**
```json
{
  "name": "primary_contact",
  "type": "relation",
  "config": {
    "targetTable": "contacts",
    "displayField": "full_name",
    "allowMultiple": false,
    "filterBy": {
      "field": "is_primary",
      "equals": true
    }
  }
}
```

## 2. Lookup Fields 🔍

Retrieve specific field values from related records.

### Configuration

```json
{
  "name": "company_industry",
  "label": "Company Industry",
  "type": "lookup",
  "required": false,
  "config": {
    "relationField": "company",
    "targetField": "industry"
  }
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `relationField` | string | The relation field to follow |
| `targetField` | string | Field to retrieve from related record |

### How It Works

```
Current Record → Relation Field → Related Record → Target Field → Lookup Value
```

### Examples

**Basic Lookup:**
```json
{
  "name": "contact_email",
  "label": "Contact Email",
  "type": "lookup",
  "config": {
    "relationField": "primary_contact",
    "targetField": "email"
  }
}
```

**Nested Lookup:**
```json
{
  "name": "company_owner_name",
  "label": "Company Owner",
  "type": "lookup",
  "config": {
    "relationField": "company",
    "targetField": "owner.name"
  }
}
```

## 3. Rollup Fields 📊

Aggregate data from related records (COUNT, SUM, AVG, MIN, MAX).

### Configuration

```json
{
  "name": "total_deal_value",
  "label": "Total Deal Value",
  "type": "rollup",
  "required": false,
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

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `sourceTable` | string | Table to aggregate from |
| `filterBy` | object | Filter criteria |
| `aggregation` | string | COUNT, SUM, AVG, MIN, MAX |
| `aggregationField` | string | Field to aggregate (required for SUM/AVG/MIN/MAX) |

### Aggregation Types

#### COUNT
Count related records.

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

#### SUM
Sum numeric field across related records.

```json
{
  "name": "total_revenue",
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
    "aggregation": "SUM",
    "aggregationField": "deal_value"
  }
}
```

#### AVG
Average of numeric field.

```json
{
  "name": "avg_deal_size",
  "type": "rollup",
  "config": {
    "sourceTable": "deals",
    "aggregation": "AVG",
    "aggregationField": "deal_value"
  }
}
```

#### MIN/MAX
Minimum or maximum value.

```json
{
  "name": "last_activity_date",
  "type": "rollup",
  "config": {
    "sourceTable": "activities",
    "filterBy": {
      "field": "company",
      "matchesValue": "{{company}}"
    },
    "aggregation": "MAX",
    "aggregationField": "activity_date"
  }
}
```

## 4. Formula Fields 🧮

Calculate values using expressions.

### Configuration

```json
{
  "name": "expected_value",
  "label": "Expected Value",
  "type": "formula",
  "required": false,
  "config": {
    "formula": "deal_value * (probability / 100)",
    "resultType": "currency"
  }
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `formula` | string | Calculation expression |
| `resultType` | string | number, currency, text, date, boolean |
| `description` | string | Optional explanation |

### Formula Syntax

#### Basic Math
```javascript
deal_value * (probability / 100)
price * quantity
(revenue - cost) / revenue * 100
```

#### Functions
```javascript
MIN(100, score)
MAX(0, balance)
ROUND(price * 1.1, 2)
ABS(profit_loss)
```

#### Date Functions
```javascript
DAYS_BETWEEN(start_date, end_date)
DAYS_BETWEEN(TODAY(), due_date)
MONTHS_BETWEEN(created_at, NOW())
YEAR(order_date)
```

#### Text Functions
```javascript
CONCAT(first_name, " ", last_name)
UPPER(status)
LOWER(email)
LEFT(code, 3)
```

#### Conditional
```javascript
IF(status = "Closed Won", deal_value, 0)
IF(days_overdue > 30, "Urgent", "Normal")
```

### Examples

**Revenue Calculation:**
```json
{
  "name": "total_revenue",
  "type": "formula",
  "config": {
    "formula": "unit_price * quantity * (1 - discount_percent / 100)",
    "resultType": "currency"
  }
}
```

**Health Score:**
```json
{
  "name": "health_score",
  "type": "formula",
  "config": {
    "formula": "MIN(100, (activity_count * 10) + (deal_count * 20))",
    "resultType": "number",
    "description": "0-100 based on engagement"
  }
}
```

**Status Label:**
```json
{
  "name": "priority_label",
  "type": "formula",
  "config": {
    "formula": "IF(priority > 8, '🔴 Urgent', IF(priority > 5, '🟡 High', '🟢 Normal'))",
    "resultType": "text"
  }
}
```

## Implementation Status

### ✅ Implemented
- **Relation** - Working in Phase 2.x
- **Lookup** - Working with queryRowsByView

### ⚠️ Partial
- **Rollup** - Schema defined, needs implementation
- **Formula** - Schema defined, needs parser

### 🚧 To Implement

#### Rollup Implementation
```typescript
// server/utils/rollupResolver.ts
export async function resolveRollups(
  row: any,
  rollupColumns: Column[],
  db: any
) {
  for (const column of rollupColumns) {
    const { sourceTable, filterBy, aggregation, aggregationField } = column.config
    
    // Build filter
    const filter = buildRollupFilter(filterBy, row)
    
    // Execute aggregation
    const result = await db
      .select({
        value: sql`${aggregation}(${aggregationField})`
      })
      .from(sourceTable)
      .where(filter)
    
    row[column.name] = result[0].value
  }
}
```

#### Formula Implementation
```typescript
// server/utils/formulaEvaluator.ts
export function evaluateFormula(
  formula: string,
  row: any,
  columns: Column[]
): any {
  const parser = new FormulaParser()
  
  // Replace field names with values
  const expression = replaceFieldNames(formula, row)
  
  // Evaluate
  return parser.evaluate(expression)
}
```

## Complete Example: Advanced CRM

See `server/data/seed-templates-advanced.json` for a complete working example demonstrating:

1. **Companies Table** - Base entities
2. **Contacts Table** - Relations to Companies + Lookups
3. **Deals Table** - Multiple relations + Formulas
4. **Activities Table** - Polymorphic relations
5. **Company_Stats Table** - Rollups and aggregations

### Seed Advanced Template

```bash
curl -X POST http://localhost:3000/api/seed-templates-advanced
```

### Features Demonstrated

- ✅ Single & multiple relations
- ✅ Lookup fields (get email from contact)
- ✅ Formulas (expected value = deal_value * probability)
- ✅ Rollups (total contacts, total deal value)
- ✅ Complex filters in relations
- ✅ Sample data with relationships

## Best Practices

### 1. Relation Design
- Use descriptive names for relation fields
- Always specify `displayField`
- Consider performance with `allowMultiple`

### 2. Lookup Usage
- Lookups are read-only
- Great for displaying related info without full relation
- Can chain: company → owner → email

### 3. Rollup Performance
- Add indexes on filter fields
- Cache rollup results
- Recalculate on source table changes

### 4. Formula Complexity
- Keep formulas simple
- Document complex calculations
- Consider performance (calculated on each read)

## Migration Path

### Current State
```json
{
  "name": "total_value",
  "type": "number"
}
```

### Add Formula
```json
{
  "name": "total_value",
  "type": "formula",
  "config": {
    "formula": "price * quantity",
    "resultType": "currency"
  }
}
```

No data migration needed - formulas are calculated dynamically.

---

**Last Updated:** December 27, 2025  
**Status:** Schema Ready, Implementation In Progress  
**Next:** Implement rollup and formula resolvers

