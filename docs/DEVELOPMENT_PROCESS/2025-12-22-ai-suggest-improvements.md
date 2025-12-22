# AI Column Type Suggestion Improvements

**Date:** December 22, 2025  
**Status:** ✅ Complete

## Issues Found

1. **Incomplete Field Type List**: The AI prompt only listed 5 basic types (text, long_text, number, date, switch), missing advanced types like email, phone, url, select, multi_select, etc.

2. **Duplicate Type Lists**: Two separate places in the prompt defined available types (line 175 and line 237), leading to maintenance issues and inconsistencies.

3. **Missing Context**: Frontend wasn't passing `tableSlug`, so the backend couldn't fetch the current table's columns.

4. **Manual Context Passing**: Frontend was expected to pass `currentTableColumns`, but it's better for the backend to fetch this data directly.

## Solutions Implemented

### 1. Dynamic Field Type List from Registry

**Before:**
```typescript
const availableTypes = [
  'text - Short text fields',
  'long_text - Longer text content',
  'number - Numeric values',
  'date - Date and time values',
  'switch - Boolean yes/no values'
]
```

**After:**
```typescript
import { getAllFieldTypes } from '~~/server/utils/fieldTypes'

const allFieldTypes = getAllFieldTypes()
const availableTypes = allFieldTypes.map((type: any) => {
  const hints = type.aiHints?.join(', ') || ''
  return `${type.name} - ${type.description}${hints ? ` (${hints})` : ''}`
})
```

**Result:** Now includes all 17+ field types from the registry automatically!

### 2. Dynamic Configuration Options

**Before:** Hardcoded config examples for 5 types

**After:**
```typescript
${allFieldTypes.map((type: any) => {
  const config = type.defaultConfig || {}
  const configStr = Object.keys(config).length > 0 
    ? `\n  Default config: ${JSON.stringify(config, null, 2)}`
    : ''
  return `**${type.name}**:${configStr}`
}).join('\n\n')}
```

**Result:** Automatically generates config documentation for all field types!

### 3. Backend Fetches Table Context

**Before:** Frontend had to pass `currentTableColumns`

**After:**
```typescript
// Get app
const app = await db
  .select()
  .from(schema.apps)
  .where(eq(schema.apps.slug, appSlug))
  .limit(1)
  .then(rows => rows[0])

// Get current table and its columns
currentTable = await db
  .select()
  .from(schema.dataTables)
  .where(and(
    eq(schema.dataTables.appId, app.id),
    eq(schema.dataTables.slug, tableSlug)
  ))
  .limit(1)
  .then(rows => rows[0])

// Get columns for the current table
currentTableColumns = await db
  .select()
  .from(schema.dataTableColumns)
  .where(eq(schema.dataTableColumns.dataTableId, currentTable.id))

// Get all other tables in the app for context
appContext = await getAppContext(app.id, app.name)
```

**Result:** Backend now has complete context about:
- Current table and its existing columns
- All other tables in the app
- Full column definitions with types and configs

### 4. Frontend Passes Table Slug

**Before:**
```typescript
body: {
  columnName: form.value.name,
  columnLabel: form.value.label,
  appSlug: props.appSlug
}
```

**After:**
```typescript
body: {
  columnName: form.value.name,
  columnLabel: form.value.label,
  appSlug: props.appSlug,
  tableSlug: props.tableSlug  // ✅ Added
}
```

### 5. Updated Best Practices in Prompt

Added guidance for using specialized field types:

```
# Best Practices
- Use specialized types: 'email' for emails, 'phone' for phones, 'url' for URLs, not generic 'text'
- Use 'select' for predefined options, 'multi_select' for multiple choices
- For select/multi_select, provide options with label, value, and color
- For date fields, use dateFormatType ('date', 'datetime', 'time') and dateFormatString
- Prices/money should use 'currency' type or 'number' with min: 0, decimal: true
- Color fields should use 'color' type with colorFormat
```

## Benefits

### 1. **Automatic Maintenance**
- Adding a new field type to the registry automatically includes it in AI suggestions
- No need to manually update the prompt when field types change
- Single source of truth for field type definitions

### 2. **Better AI Suggestions**
- AI now knows about all available field types
- Can suggest specialized types (email, phone, url) instead of generic text
- Better configuration suggestions based on field type defaults

### 3. **Richer Context**
- AI sees all columns in the current table
- AI sees related tables in the app
- Can suggest consistent field types across related tables
- Can avoid duplicate field names

### 4. **Simplified Frontend**
- Frontend doesn't need to fetch and pass table columns
- Just passes `appSlug` and `tableSlug`
- Backend handles all data fetching

### 5. **Better Type Safety**
- All field types come from the centralized registry
- TypeScript ensures consistency
- No risk of typos in field type names

## Example AI Context

The AI now receives context like this:

```
# Available Column Types
- text - Short text (up to 255 characters) (names, titles, labels)
- email - Email address with validation (contact fields)
- phone - Phone number with formatting (contact fields)
- url - Website URL with validation (links, websites)
- select - Single select dropdown (status, category, type)
- multi_select - Multiple select dropdown (tags, categories)
- date - Date only (birthdays, deadlines)
- datetime - Date and time (timestamps, schedules)
- currency - Money values with symbol ($100.00)
- color - Color picker (themes, branding)
- rating - Star rating (1-5 or 1-10)
- ... and more

# Current Table Columns
Existing columns in this table:
- company_name (Company Name): text [Required]
- email (Email): email [Required] (max:255)
- phone (Phone): phone (max:20)
- website (Website): url

# Related Tables in This App
App: "CRM System"

## Contacts
Columns: first_name(text), last_name(text), email(email), phone(phone)

## Companies
Columns: name(text), industry(select), size(select)
```

## Testing

### Manual Testing Checklist

- [x] Create column with name "email_address" → AI suggests `email` type
- [x] Create column with name "company_website" → AI suggests `url` type
- [x] Create column with name "phone_number" → AI suggests `phone` type
- [x] Create column with name "priority" → AI suggests `select` type with options
- [x] Create column with name "tags" → AI suggests `multi_select` type
- [x] Create column with name "birth_date" → AI suggests `date` type
- [x] Create column with name "last_login" → AI suggests `datetime` type

### Context Awareness Testing

- [x] AI sees existing columns in current table
- [x] AI sees related tables in the app
- [x] AI avoids suggesting duplicate column names
- [x] AI suggests consistent types with related tables

## Files Modified

1. ✅ `server/api/ai/suggest-column-type.post.ts` - Complete refactor
   - Now fetches table context from database
   - Uses `getAllFieldTypes()` for dynamic type list
   - Generates config documentation dynamically
   - Better error handling

2. ✅ `app/components/app/table/ColumnDialog.vue` - Added `tableSlug` to AI request

## Impact

- ✅ No breaking changes
- ✅ Better AI suggestions
- ✅ Easier maintenance
- ✅ More field types available
- ✅ Richer context for AI
- ✅ Consistent with field type registry

## Next Steps

1. Monitor AI suggestion quality
2. Collect user feedback on suggestions
3. Add more AI hints to field types for better detection
4. Consider caching field type list for performance
5. Add telemetry to track suggestion acceptance rate

