# Column Types Reference

## Overview
The system supports 6 column types for dynamic table schemas. Each type has specific options and constraints stored as JSONB.

---

## 1. Text (`text`)

**Description**: String/text values

**Options**:
```json
{
  "max_length": 255,           // Maximum character length
  "format": "plain|email|url", // Text format validation
  "multiline": false           // Single line or textarea
}
```

**Constraints**:
```json
{
  "required": true,
  "unique": false,
  "pattern": "^[A-Z].*"  // Regex pattern (optional)
}
```

**Storage Example**:
```json
{
  "col_uuid": "John Doe"
}
```

---

## 2. Number (`number`)

**Description**: Numeric values (integer or decimal)

**Options**:
```json
{
  "precision": 2,              // Decimal places (0 = integer)
  "format": "number|currency|percent",
  "currency": "USD"            // If format is currency
}
```

**Constraints**:
```json
{
  "required": true,
  "min": 0,
  "max": 100
}
```

**Storage Example**:
```json
{
  "col_uuid": 42,
  "col_price": 99.99
}
```

---

## 3. Boolean (`boolean`)

**Description**: True/false values

**Options**:
```json
{
  "label_true": "Yes",   // Display label for true
  "label_false": "No"    // Display label for false
}
```

**Constraints**:
```json
{
  "required": true
}
```

**Storage Example**:
```json
{
  "col_uuid": true
}
```

---

## 4. Date (`date`)

**Description**: Date and datetime values

**Options**:
```json
{
  "format": "date|datetime|time",
  "include_time": true,
  "timezone": "UTC"
}
```

**Constraints**:
```json
{
  "required": true,
  "min_date": "2025-01-01",
  "max_date": "2025-12-31"
}
```

**Storage Example**:
```json
{
  "col_uuid": "2025-12-12T10:30:00Z"
}
```

---

## 5. File (`file`)

**Description**: File upload references

**Options**:
```json
{
  "max_size": 10485760,           // Max file size in bytes (10MB)
  "allowed_types": ["image/*", "application/pdf"],
  "multiple": false               // Single or multiple files
}
```

**Constraints**:
```json
{
  "required": true
}
```

**Storage Example**:
```json
{
  "col_uuid": "file_uuid_123",           // Single file
  "col_attachments": ["file_1", "file_2"] // Multiple files
}
```

**Note**: Values reference the `files` table `id` field.

---

## 6. Link (`link`)

**Description**: Reference/link to records in another table (relationships)

**Options**:
```json
{
  "linked_table_id": "uuid-of-target-table",
  "allow_multiple": true,              // Single or multiple links
  "display_column_id": "col_uuid",     // Which column to show as label
  "display_format": "{col_id}"         // Optional: Format template (Phase 1)
}
```

**Display Format Templates** (Phase 1):
Combine multiple fields from linked records for better UX:

```json
// Simple - just show one field
"display_format": "{col_number}"

// Show number and amount
"display_format": "{col_number} - ${col_amount}"

// Show customer with email
"display_format": "{col_name} ({col_email})"

// Complex format
"display_format": "Order #{col_number} - {col_customer} - ${col_total}"
```

**Constraints**:
```json
{
  "required": true,
  "min_links": 1,    // Minimum number of links (if allow_multiple)
  "max_links": 10    // Maximum number of links (if allow_multiple)
}
```

**Storage Format**:
```json
{
  // Single link - stored as UUID string
  "col_customer": "record_uuid_abc",
  
  // Multiple links - stored as array of UUID strings
  "col_quotations": ["record_uuid_1", "record_uuid_2", "record_uuid_3"]
}
```

**API Response Format**:

By default (without `expand`):
```json
{
  "col_customer": {
    "id": "customer_uuid",
    "display": "Acme Corp"  // Formatted using display_format
  },
  "col_quotations": [
    { "id": "q1", "display": "Q-2025-001 ($5000)" },
    { "id": "q2", "display": "Q-2025-002 ($7500)" }
  ]
}
```

With `expand: ["col_customer"]` in query:
```json
{
  "col_customer": {
    "id": "customer_uuid",
    "display": "Acme Corp",
    "record": {
      "data": {
        "col_name": "Acme Corp",
        "col_email": "contact@acme.com",
        "col_phone": "+1234567890"
      }
    }
  }
}
```

**Use Cases**:
- Link a "Project" to a "Customer"
- Link an "Order" to multiple "Products"
- Link a "Task" to an "Assignee" (user)
- Link "Related Articles" to each other
- Link "Customer" to their "Quotations"

**Query Example**:
```sql
-- Find all projects for a specific customer
SELECT * FROM records 
WHERE table_id = 'projects_table_uuid'
  AND data->>'col_customer' = 'customer_record_uuid';

-- Find records with any of multiple linked records
SELECT * FROM records
WHERE table_id = 'orders_table_uuid'
  AND data->'col_products' @> '"product_record_uuid"'::jsonb;
```

**Notes**:
- Link validation checks if target record exists and is not deleted
- Display format is evaluated server-side for consistency
- Expansion is 1 level only (no nested expansion in Phase 1)
- Bidirectional links are manual (users create reverse link themselves)
- Cross-database linking comes in Phase 4 (POC is same-database only)

---

## 7. Computed (`computed`) - Phase 2 ⏳

**Description**: Aggregate/calculate values from linked records (like Excel VLOOKUP + SUM)

**Options**:
```json
{
  "link_column_id": "col_quotations",      // Which link column to aggregate from
  "linked_column_id": "col_amount",        // Which field in linked records
  "aggregation": "sum|count|average|min|max|unique|array",
  "format": "currency|number|percent"      // Optional: output format
}
```

**Aggregation Types**:

| Aggregation | Description | Example |
|-------------|-------------|---------|
| `sum` | Sum of values | Total quotation amount: 15000 |
| `count` | Count of records | Number of quotations: 3 |
| `average` | Average value | Average order value: 5000 |
| `min` | Minimum value | Smallest order: 1000 |
| `max` | Maximum value | Largest order: 8000 |
| `unique` | Count unique values | Unique products: 5 |
| `array` | Array of values (lookup) | [5000, 7000, 3000] |

**Examples**:

```json
// Sum of quotation amounts
{
  "type": "computed",
  "name": "Total Quotation Amount",
  "options": {
    "link_column_id": "col_quotations",
    "linked_column_id": "col_amount",
    "aggregation": "sum",
    "format": "currency"
  }
}

// Count of quotations
{
  "type": "computed",
  "name": "Quotation Count",
  "options": {
    "link_column_id": "col_quotations",
    "linked_column_id": null,  // Not needed for count
    "aggregation": "count"
  }
}

// Array of statuses (lookup)
{
  "type": "computed",
  "name": "All Quotation Statuses",
  "options": {
    "link_column_id": "col_quotations",
    "linked_column_id": "col_status",
    "aggregation": "array"
  }
}

// Average deal size
{
  "type": "computed",
  "name": "Average Deal Size",
  "options": {
    "link_column_id": "col_deals",
    "linked_column_id": "col_amount",
    "aggregation": "average",
    "format": "currency"
  }
}
```

**Storage**: NOT stored in records (computed on-read in Phase 2)

**API Response**:
```json
{
  "col_name": "Acme Corp",
  "col_quotations": [
    { "id": "q1", "display": "Q-001" },
    { "id": "q2", "display": "Q-002" }
  ],
  "col_total_quotation_amount": 15000  // ✨ Computed on query
}
```

**Query with Computed Fields**:
```sql
-- Computed value is calculated via subquery
SELECT 
  r.*,
  (
    SELECT SUM((linked.data->>'col_amount')::numeric)
    FROM records linked
    WHERE linked.id = ANY(
      SELECT jsonb_array_elements_text(r.data->'col_quotations')::uuid
    )
    AND linked.deleted_at IS NULL
  ) as computed_total_quotation_amount
FROM records r
WHERE r.table_id = ?
  AND r.deleted_at IS NULL
ORDER BY computed_total_quotation_amount DESC;
```

**Sorting & Filtering**:
Computed fields support sorting and filtering (via SQL subqueries):

```json
POST /api/tables/:tableId/query
{
  "filter": {
    "property": "col_total_quotation_amount",  // ✅ Can filter computed
    "number": { "greater_than": 10000 }
  },
  "sorts": [
    { "property": "col_total_quotation_amount", "direction": "descending" }  // ✅ Can sort
  ]
}
```

**Performance Notes**:
- ⚠️ Computed on every query (slower than regular columns)
- ⚠️ Each computed field = 1 subquery per record
- ✅ Works well for <10K records
- 💡 Phase 3+: Consider caching or storing computed values for large datasets

**Use Cases**:
- Total order amount from linked orders
- Count of completed tasks
- Average project budget
- Latest update timestamp from related records
- Array of all tags from linked items

---

## Column Type Summary

| Type | Use Case | Storage | Phase |
|------|----------|---------|-------|
| `text` | Names, descriptions, emails | String | ✅ Phase 1 |
| `number` | Quantities, prices, scores | Number | ✅ Phase 1 |
| `boolean` | Yes/no, active/inactive | Boolean | ✅ Phase 1 |
| `date` | Dates, deadlines, timestamps | ISO string | ✅ Phase 1 |
| `file` | Documents, images, attachments | UUID(s) | ✅ Phase 1 |
| `link` | Relationships, references | UUID(s) | ✅ Phase 1 |
| `computed` | Aggregate from linked records | Computed | ⏳ Phase 2 |

---

## Future Column Types (Phase 3+)

Potential future enhancements:
- **`category`** - Single-select from predefined options
- **`tag`** - Multi-select tags/labels
- **`user`** - Reference to users table (special case of link)
- **`formula`** - Calculated field based on expression (e.g., `price * quantity`)
- **`lookup`** - Pull specific value from linked record (simpler than computed)
- **`button`** - Trigger workflows/actions
- **`rating`** - Star rating field
- **`color`** - Color picker

---

## Validation Logic

### Type Validation
Each type should validate data on insert/update:

```typescript
function validateColumnValue(column: Column, value: any): boolean {
  switch (column.type) {
    case 'text':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'boolean':
      return typeof value === 'boolean';
    case 'date':
      return isValidDate(value);
    case 'file':
      return isValidFileRef(value);
    case 'link':
      return isValidRecordRef(value, column.options);
  }
}
```

### Constraint Validation
Check constraints defined in column.constraints:

```typescript
function validateConstraints(column: Column, value: any): ValidationError[] {
  const errors = [];
  const { constraints } = column;
  
  if (constraints.required && !value) {
    errors.push('Field is required');
  }
  
  if (column.type === 'number') {
    if (constraints.min !== undefined && value < constraints.min) {
      errors.push(`Value must be >= ${constraints.min}`);
    }
  }
  
  // ... more validations
  
  return errors;
}
```

---

## Display & Formatting

Each type needs UI components:
- `text` → Input/Textarea
- `number` → Number input with formatting
- `boolean` → Checkbox/Toggle
- `date` → Date picker
- `file` → File upload with preview
- `link` → Dropdown/Select with search (shows display_field from linked records)

---

## Migration Notes

The `link` type has been added to the columns table CHECK constraint:

```sql
CHECK (type IN ('text', 'number', 'boolean', 'date', 'file', 'link'))
```

If you've already run migrations, you'll need to update the constraint:

```sql
ALTER TABLE columns 
DROP CONSTRAINT columns_type_check;

ALTER TABLE columns 
ADD CONSTRAINT columns_type_check 
CHECK (type IN ('text', 'number', 'boolean', 'date', 'file', 'link'));
```

