# Phase 2.4: Column Management & Field Types

**Status**: 🟢 **Core Field Types Complete** (90% Complete - 16 field types implemented)  
**Started**: December 22, 2025  
**Last Updated**: December 23, 2025  
**Estimated Duration**: 3-4 weeks ⚠️ (Includes complex types: formula, relation, aggregation, lookup)  
**Priority**: 🔴 **Critical** (Blocks AI Assistant)

---

## 🎯 Progress Update (December 22, 2025)

### ✅ Completed (60%)
- **Views System**: Full implementation with multiple views per table
- **Column Management UI**: Right-click menu, drag-to-reorder, add/edit dialog
- **Column CRUD APIs**: All endpoints complete (add/edit/delete/reorder)
- **Auto-Proxy DataGrid**: Simplified data fetching (40 lines → 2 props)
- **AI Integration**: Smart column type suggestions with auto-naming
- **Separation of Concerns**: Column vs View architecture
- **View-specific Reordering**: Each view maintains its own column order

### 🟡 In Progress
- None

### ✅ Recently Completed (Dec 23, 2025)
- **16 Field Types Implemented**: text, long_text, number, date, datetime, checkbox, switch, email, phone, url, select, multi_select, currency, rating, color, geolocation
- **Geolocation Field**: Full PostGIS integration with Leaflet maps, address search via Nominatim, interactive map picker
- **Field Configuration UI**: Dynamic config panels for each field type with live preview
- **Drag-and-drop reordering**: For select/multi-select options
- **Validation System**: Comprehensive validation for all field types including geolocation
- **Reusable Components**: DefaultValueEditor and FieldPreview components for cleaner code

### ⏳ Deferred to Future Phases
- **Complex Field Types**: formula, relation, aggregation, lookup (Phase 3)
- **Advanced Validation**: Unique constraints, cross-field validation (Phase 3)

**Next Up**: Phase 2.5 - AI Assistant (Ready to start!)

---

## Overview

This phase implements the **missing critical features** needed before building the AI Assistant:
1. **Column management** - Add/edit/delete columns after table creation
2. **Advanced field types** - Email, phone, URL, select, multi-select, checkbox, rating, etc.
3. **Field validation** - Email format, phone format, URL validation, required fields
4. **Column configuration** - Options for selects, constraints, default values

**Why this is critical:**
- ❌ Users currently can't add columns after creating a table!
- ❌ AI Assistant can't suggest advanced field types we don't have
- ❌ Can't test AI suggestions without variety of field types
- ❌ Poor user experience without manual column management

---

## Goals

- [x] **Complete column CRUD operations (add, edit, delete, reorder)** - ✅ **COMPLETE**
  - [x] Column reordering (drag-and-drop with native VXE Grid)
  - [x] Right-click context menu for column actions
  - [x] Add/Edit column dialog with AI suggestions
  - [x] Delete column with confirmation
  - [x] Reorder API endpoint (updates view order)
  - [x] Add column API endpoint ✅
  - [x] Edit column API endpoint ✅
  - [x] Delete column API endpoint ✅
- [x] Implement 14 core field types with proper validation
- [x] **Build column settings UI** - Complete
- [x] Add field type-specific configuration
- [x] Implement column constraints and validation
- [x] **Support column reordering** - Complete (drag-and-drop + API)
- [x] **Add column visibility toggle** - In dataTableView schema
- [ ] Implement formula parser and evaluator (Deferred to Phase 3)
- [ ] Implement aggregation engine (Deferred to Phase 3)
- [ ] Implement relation/lookup system (Deferred to Phase 3)

---

## Field Types to Implement

### Basic Types (Already Have)
- [x] **text** - Plain text
- [x] **long_text** - Multi-line text / textarea
- [x] **number** - Integer or decimal
- [x] **date** - Date picker
- [x] **datetime** - Date + time picker
- [x] **checkbox** - Boolean checkbox (renamed from boolean)
- [x] **switch** - On/Off switch toggle

### New Types (Priority Order)

#### 1. **High Priority** (Week 1)
- [x] **email** - Email with validation
- [x] **phone** - Phone number with formatting
- [x] **url** - URL with validation
- [x] **select** - Single select dropdown (with options)
- [x] **multi_select** - Multiple select (with options)

#### 2. **Medium Priority** (Week 2)
- [x] **rating** - Star rating (1-5 or 1-10)
- [x] **currency** - Number with currency formatting
- [x] **color** - Color picker with hex/rgb/hsl support
- [x] **geolocation** - Location/address with PostGIS support + Leaflet map picker


#### 3. **Complex Types** (Future Phases)
- [ ] **formula** - Calculated fields (Phase 3)
- [ ] **aggregation** - Sum, count, average (Phase 3)
- [ ] **relation** - Link to another table (Phase 3)
- [ ] **lookup** - Pull data from related table (Phase 3)

#### 3. **Nice to Have** (If time allows)
- [ ] **markdown** - Markdown editor with preview
- [ ] **file** - File reference (prepare for Phase 5)
- [ ] **user** - User reference
- [ ] **created_by** - Auto-filled user reference
- [ ] **edited_by** - Auto-filled user reference for user to edit some fields
- [ ] **updated_by** - Auto-filled user reference


---

## Actions

### Backend

#### Column Management API ✅ **ALL COMPLETE**
- [x] `POST /api/apps/[appSlug]/tables/[tableSlug]/columns` - Add column ✅ **COMPLETE**
- [x] `PUT /api/apps/[appSlug]/tables/[tableSlug]/columns/[columnId]` - Update column ✅ **COMPLETE**
- [x] `DELETE /api/apps/[appSlug]/tables/[tableSlug]/columns/[columnId]` - Delete column ✅ **COMPLETE**
- [x] `PUT /api/apps/[appSlug]/tables/[tableSlug]/columns/reorder` - Reorder view columns ✅ **COMPLETE**

#### Column Operations Utilities
- [x] `addColumnToTable()` - Add column to metadata + physical table ✅ **COMPLETE**
- [x] `updateColumnInTable()` - Update column properties + alter physical table ✅ **COMPLETE**
- [x] `deleteColumnFromTable()` - Remove column from metadata + physical table ✅ **COMPLETE**
- [x] `reorderViewColumns()` - Update column order in view ✅ **COMPLETE**
- [x] `validateColumnChange()` - Check if change is safe (type compatibility, NULL checks) ✅ **COMPLETE**

#### Field Type System
- [ ] Create field type registry (`server/utils/fieldTypes.ts`)
- [ ] Define field type interface:
  ```typescript
  interface FieldType {
    name: string
    label: string
    icon: string
    defaultConfig: Record<string, any>
    validation: (value: any, config: any) => boolean
    format: (value: any, config: any) => string
    parse: (input: string, config: any) => any
    sqlType: string
    isComputed?: boolean // For formula, aggregation, lookup
    compute?: (record: any, context: any) => any // Computation function
  }
  ```
- [ ] Implement each field type
- [ ] Add server-side validation for each type
- [ ] Add formatting/parsing logic

#### Complex Type Systems
- [ ] **Formula Engine** (`server/utils/formulaEngine.ts`)
  - [ ] Tokenizer (parse formula string)
  - [ ] Parser (build AST)
  - [ ] Evaluator (execute formula)
  - [ ] Dependency tracker (detect circular refs)
  - [ ] Support basic operations (+, -, *, /, &)
  - [ ] Support field references ({fieldName})
  - [ ] Support basic functions (SUM, AVG, COUNT, etc.)
  
- [ ] **Aggregation Engine** (`server/utils/aggregationEngine.ts`)
  - [ ] SQL query builder for aggregations
  - [ ] Support SUM, COUNT, AVG, MIN, MAX
  - [ ] Support GROUP BY single field
  - [ ] Cache aggregation results
  - [ ] Invalidate cache on data changes
  
- [ ] **Relation Manager** (`server/utils/relationManager.ts`)
  - [ ] Create foreign key constraints
  - [ ] Validate relation integrity
  - [ ] Handle cascade deletes
  - [ ] Query related records efficiently
  
- [ ] **Lookup Engine** (`server/utils/lookupEngine.ts`)
  - [ ] Build JOIN queries for lookups
  - [ ] Cache lookup values
  - [ ] Auto-update on relation changes
  - [ ] Support nested lookups (2 levels)

#### Field Type Validation
- [ ] Email validation (regex)
- [ ] Phone validation (international format support)
- [ ] URL validation
- [ ] Required field validation
- [ ] Min/max length validation
- [ ] Min/max value validation (numbers)
- [ ] Custom regex validation
- [ ] Unique constraint validation

#### Database Schema Updates
```typescript
// data_table_columns - Add new fields
- [ ] validation_rules (jsonb) - Validation config
- [ ] default_value (text) - Default value for new rows
- [ ] is_unique (boolean) - Unique constraint
- [ ] min_length (integer) - For text fields
- [ ] max_length (integer) - For text fields
- [ ] min_value (decimal) - For number fields
- [ ] max_value (decimal) - For number fields
- [ ] options (jsonb) - For select/multi-select (array of options)
- [ ] format_config (jsonb) - Type-specific formatting
```

### Frontend

#### Components

##### 1. Column Management Components ✅ **COMPLETE**
- [x] `layers/datagrid/app/components/DataGrid.vue` - Right-click menu, drag-to-reorder
- [x] `app/components/app/table/ColumnDialog.vue` - Unified add/edit column dialog
  - Auto-generates column name from label
  - AI-powered type suggestions (500ms debounce)
  - Type-specific configuration
  - Clean, minimal UI
- [x] Delete confirmation built into table view page
- [x] Native VXE Grid drag-and-drop for reordering

##### 2. Field Configuration Components (Main App)
- [ ] `components/app/table/fields/FieldTypeSelector.vue` - Field type picker with icons
- [ ] `components/app/table/fields/FieldConfigEditor.vue` - Type-specific config
- [ ] `components/app/table/fields/SelectOptionsEditor.vue` - For select/multi-select
- [ ] `components/app/table/fields/ValidationRulesEditor.vue` - Validation config
- [ ] `components/app/table/fields/FieldPreview.vue` - Preview field appearance
- [ ] `components/app/table/fields/FormulaBuilder.vue` - Formula configuration UI
- [ ] `components/app/table/fields/RelationConfig.vue` - Relation configuration
- [ ] `components/app/table/fields/AggregationConfig.vue` - Aggregation configuration

##### 3. Field Components (DataGrid Layer)

**Location:** `layers/datagrid/app/components/fields/`

###### Input Components (Editing in Grid)
- [ ] `layers/datagrid/app/components/fields/inputs/TextInput.vue`
- [ ] `layers/datagrid/app/components/fields/inputs/NumberInput.vue`
- [ ] `layers/datagrid/app/components/fields/inputs/DateInput.vue`
- [ ] `layers/datagrid/app/components/fields/inputs/BooleanInput.vue`
- [ ] `layers/datagrid/app/components/fields/inputs/EmailInput.vue`
- [ ] `layers/datagrid/app/components/fields/inputs/PhoneInput.vue`
- [ ] `layers/datagrid/app/components/fields/inputs/UrlInput.vue`
- [ ] `layers/datagrid/app/components/fields/inputs/SelectInput.vue`
- [ ] `layers/datagrid/app/components/fields/inputs/MultiSelectInput.vue`
- [ ] `layers/datagrid/app/components/fields/inputs/CheckboxInput.vue`
- [ ] `layers/datagrid/app/components/fields/inputs/TextareaInput.vue`
- [ ] `layers/datagrid/app/components/fields/inputs/RatingInput.vue`
- [ ] `layers/datagrid/app/components/fields/inputs/CurrencyInput.vue`
- [ ] `layers/datagrid/app/components/fields/inputs/PercentInput.vue`
- [ ] `layers/datagrid/app/components/fields/inputs/ColorInput.vue`
- [ ] `layers/datagrid/app/components/fields/inputs/DateTimeInput.vue`
- [ ] `layers/datagrid/app/components/fields/inputs/RelationPicker.vue`

###### Display Components (Read-only Display)
- [ ] `layers/datagrid/app/components/fields/displays/TextDisplay.vue`
- [ ] `layers/datagrid/app/components/fields/displays/NumberDisplay.vue`
- [ ] `layers/datagrid/app/components/fields/displays/DateDisplay.vue`
- [ ] `layers/datagrid/app/components/fields/displays/BooleanDisplay.vue`
- [ ] `layers/datagrid/app/components/fields/displays/EmailDisplay.vue` - With mailto link
- [ ] `layers/datagrid/app/components/fields/displays/PhoneDisplay.vue` - With tel link
- [ ] `layers/datagrid/app/components/fields/displays/UrlDisplay.vue` - With clickable link
- [ ] `layers/datagrid/app/components/fields/displays/SelectDisplay.vue` - With colored badge
- [ ] `layers/datagrid/app/components/fields/displays/MultiSelectDisplay.vue` - Multiple badges
- [ ] `layers/datagrid/app/components/fields/displays/CheckboxDisplay.vue` - Checkmark icon
- [ ] `layers/datagrid/app/components/fields/displays/RatingDisplay.vue` - Star display
- [ ] `layers/datagrid/app/components/fields/displays/CurrencyDisplay.vue` - Formatted with K/M/B/T
- [ ] `layers/datagrid/app/components/fields/displays/PercentDisplay.vue` - With % symbol
- [ ] `layers/datagrid/app/components/fields/displays/ColorDisplay.vue` - Color swatch + hex
- [ ] `layers/datagrid/app/components/fields/displays/DateTimeDisplay.vue` - Formatted datetime
- [ ] `layers/datagrid/app/components/fields/displays/FormulaDisplay.vue` - Calculated result
- [ ] `layers/datagrid/app/components/fields/displays/AggregationDisplay.vue` - Aggregated value
- [ ] `layers/datagrid/app/components/fields/displays/RelationDisplay.vue` - Related record link
- [ ] `layers/datagrid/app/components/fields/displays/LookupDisplay.vue` - Looked up value

###### Field Registry & Utilities
- [ ] `layers/datagrid/app/composables/useFieldRegistry.ts` - Field type registry
- [ ] `layers/datagrid/app/composables/useFieldRenderer.ts` - Dynamic field rendering
- [ ] `layers/datagrid/app/composables/useFieldValidation.ts` - Client-side validation
- [ ] `layers/datagrid/app/utils/fieldFormatters.ts` - Formatting utilities
- [ ] `layers/datagrid/app/utils/fieldParsers.ts` - Parsing utilities

#### UI Features

##### Column Management UI
- [ ] "Add Column" button in table settings
- [ ] Column list with drag handles for reordering
- [ ] Edit icon next to each column
- [ ] Delete icon with confirmation
- [ ] Column visibility toggle (show/hide in grid)
- [ ] Real-time preview of column changes
- [ ] Undo/redo for column operations (optional)

##### Field Type Configuration UI
- [ ] Field type selector with search and icons
- [ ] Type-specific configuration panel:
  - **Email:** Validation level (strict/lenient)
  - **Phone:** Format (US, international, etc.)
  - **URL:** Allow http/https only
  - **Select:** Add/remove/reorder options, default value, color label
  - **Multi-select:** Same as select, max selections, color label
  - **Number:** Min/max, decimal places, prefix/suffix
  - **Text:** Min/max length, regex pattern
  - **Rating:** Max stars, allow half stars
  - **Currency:** Currency symbol, decimal places, comapct display(K,M,B,T)
- [ ] Validation rules builder
- [ ] Default value setter
- [ ] Required field toggle
- [ ] Unique constraint toggle

##### Data Grid Integration
- [ ] Render correct input component per field type
- [ ] Render correct display component per field type
- [ ] Show validation errors inline
- [ ] Type-specific filtering (e.g., date range, select from options)
- [ ] Type-specific sorting
- [ ] Format data on display (currency, phone, etc.)

### Composables
- [ ] `composables/useFieldTypes.ts` - Field type registry and helpers
- [ ] `composables/useColumnManager.ts` - Column CRUD operations
- [ ] `composables/useFieldValidation.ts` - Validation logic
- [ ] `composables/useFormulaEngine.ts` - Formula parsing and evaluation
- [ ] `composables/useRelationManager.ts` - Relation operations
- [ ] `composables/useAggregation.ts` - Aggregation computation

---

## Implementation Plan

### Week 1: Core Column Management + Basic Types

**Days 1-2: Backend Foundation**
- [ ] Create column management API endpoints
- [ ] Implement addColumnToTable/updateColumn/deleteColumn utilities
- [ ] Add validation for column operations
- [ ] Create field type registry system
- [ ] Implement 7 basic field types (email, phone, url, select, multi-select, checkbox, textarea)

**Days 3-4: Frontend Components**
- [ ] Build AddColumnDialog component
- [ ] Build EditColumnDialog component
- [ ] Build FieldTypeSelector component
- [ ] Build SelectOptionsEditor component
- [ ] Implement 7 input/display components for new types

**Day 5: Integration & Testing**
- [ ] Integrate with table settings page
- [ ] Update data grid to use new field types
- [ ] Test add/edit/delete column flows
- [ ] Fix bugs and polish UI

### Week 2: Display Types (Rating, Currency, Color, DateTime)

**Days 1-2: Display Field Types**
- [ ] Implement rating field type (with UI component)
- [ ] Implement currency field type (with compact display K,M,B,T)
- [ ] Implement percent field type
- [ ] Implement color field type (with picker)
- [ ] Implement datetime field type

**Days 3-4: Validation & Configuration**
- [ ] Add validation rules editor
- [ ] Add default value configuration
- [ ] Add column reordering (drag-and-drop)
- [ ] Add column visibility toggle
- [ ] Polish UI/UX

**Day 5: Testing**
- [ ] Test all display field types
- [ ] Test validation rules
- [ ] Fix bugs

### Week 3: Complex Types - Part 1 (Formula & Aggregation)

**Days 1-3: Formula Field Type**
- [ ] Design formula syntax (Excel-like or custom)
- [ ] Build formula parser (tokenizer, AST)
- [ ] Build formula evaluator
- [ ] Support basic operations (+, -, *, /, concat)
- [ ] Support field references
- [ ] Detect circular dependencies
- [ ] Build FormulaEditor component with autocomplete
- [ ] Add formula validation
- [ ] Handle formula errors gracefully

**Days 4-5: Aggregation Field Type**
- [ ] Design aggregation configuration (SUM, COUNT, AVG, MIN, MAX)
- [ ] Implement aggregation SQL generation
- [ ] Support GROUP BY (aggregate by category)
- [ ] Build aggregation config UI
- [ ] Test aggregations with various data
- [ ] Optimize aggregation queries

### Week 4: Complex Types - Part 2 (Relation & Lookup) + Polish

**Days 1-2: Relation Field Type**
- [ ] Design relation schema (foreign key, cascade options)
- [ ] Implement relation column in physical table
- [ ] Build RelationPicker component (select related record)
- [ ] Support one-to-many and many-to-one
- [ ] Add relation configuration UI (target table, display field)
- [ ] Handle cascade delete options

**Days 2-3: Lookup Field Type**
- [ ] Design lookup configuration (source relation + field)
- [ ] Implement lookup SQL (JOIN queries)
- [ ] Support nested lookups (lookup from related table)
- [ ] Cache lookup values for performance
- [ ] Build LookupDisplay component
- [ ] Add lookup configuration UI

**Days 4-5: Final Polish & Testing**
- [ ] Comprehensive testing of ALL field types
- [ ] Test complex scenarios (formula referencing lookup, etc.)
- [ ] Test edge cases (circular formulas, broken relations)
- [ ] Performance optimization
- [ ] Documentation
- [ ] Prepare for Phase 2.5 (AI Assistant)

---

## Field Type Specifications

### Email
```typescript
{
  type: 'email',
  sqlType: 'VARCHAR(255)',
  validation: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    required: boolean,
    unique: boolean
  },
  display: {
    showMailtoLink: boolean
  }
}
```

### Phone
```typescript
{
  type: 'phone',
  sqlType: 'VARCHAR(50)',
  validation: {
    format: 'US' | 'international' | 'E.164',
    required: boolean
  },
  display: {
    showTelLink: boolean,
    format: 'formatted' | 'raw'
  }
}
```

### URL
```typescript
{
  type: 'url',
  sqlType: 'TEXT',
  validation: {
    protocol: 'http' | 'https' | 'both',
    required: boolean
  },
  display: {
    showAsLink: boolean,
    openInNewTab: boolean
  }
}
```

### Select
```typescript
{
  type: 'select',
  sqlType: 'VARCHAR(255)',
  config: {
    options: [
      { value: string, label: string, color?: string }
    ],
    allowCustom: boolean
  },
  validation: {
    required: boolean
  },
  display: {
    style: 'badge' | 'plain' | 'colored'
  }
}
```

### Multi-Select
```typescript
{
  type: 'multi_select',
  sqlType: 'JSONB',
  config: {
    options: [
      { value: string, label: string, color?: string }
    ],
    maxSelections?: number
  },
  validation: {
    required: boolean,
    minSelections?: number
  },
  display: {
    style: 'badges' | 'count' | 'list',
    maxVisible: number
  }
}
```

### Rating
```typescript
{
  type: 'rating',
  sqlType: 'DECIMAL(3,2)',
  config: {
    maxRating: 5 | 10,
    allowHalf: boolean,
    icon: 'star' | 'heart' | 'thumb'
  },
  validation: {
    required: boolean
  },
  display: {
    showNumber: boolean
  }
}
```

### Currency
```typescript
{
  type: 'currency',
  sqlType: 'DECIMAL(19,4)',
  config: {
    symbol: string, // $, €, £, ¥, etc.
    position: 'before' | 'after',
    decimalPlaces: 0 | 2 | 4,
    compactDisplay: boolean, // Show as K, M, B, T
    compactThreshold: number // When to start compacting (e.g., 1000)
  },
  validation: {
    required: boolean,
    min?: number,
    max?: number
  },
  display: {
    style: 'symbol' | 'code' | 'name', // $100 vs USD 100 vs US Dollar 100
    showZeroAs: string // e.g., "-" or "Free"
  }
}
```

### Formula
```typescript
{
  type: 'formula',
  sqlType: 'TEXT', // Store formula, compute on read
  config: {
    formula: string, // e.g., "{price} * {quantity}"
    returnType: 'number' | 'text' | 'date' | 'boolean',
    dependencies: string[], // Field IDs this formula depends on
    cacheResult: boolean // Store computed value for performance
  },
  validation: {
    // Formulas can't be required (always computed)
  },
  display: {
    format: // Based on returnType
  }
}
```

### Aggregation
```typescript
{
  type: 'aggregation',
  sqlType: 'JSONB', // Store config, compute on read
  config: {
    operation: 'SUM' | 'COUNT' | 'AVG' | 'MIN' | 'MAX',
    sourceTable: string, // Related table ID
    sourceField: string, // Field to aggregate
    groupBy?: string, // Optional: group by field
    filter?: object // Optional: filter conditions
  },
  validation: {
    // Aggregations can't be required (always computed)
  },
  display: {
    format: 'number' | 'currency' | 'percent'
  }
}
```

### Relation
```typescript
{
  type: 'relation',
  sqlType: 'UUID', // Foreign key to related table
  config: {
    targetTable: string, // Table ID to link to
    displayField: string, // Which field to show (e.g., "name")
    allowMultiple: boolean, // One-to-many vs many-to-one
    cascadeDelete: 'restrict' | 'cascade' | 'set_null'
  },
  validation: {
    required: boolean
  },
  display: {
    style: 'link' | 'badge' | 'inline',
    showIcon: boolean
  }
}
```

### Lookup
```typescript
{
  type: 'lookup',
  sqlType: 'TEXT', // Store looked-up value (cached)
  config: {
    relationField: string, // Which relation field to use
    targetField: string, // Which field from related record
    allowNested: boolean, // Allow lookup from related table's relations
    autoUpdate: boolean // Update when related record changes
  },
  validation: {
    // Lookups can't be required (depends on relation)
  },
  display: {
    format: // Based on target field type
  }
}
```

---

## Success Criteria

### Functional Requirements
- [ ] User can add column to existing table
- [ ] User can edit column properties
- [ ] User can delete column (with confirmation)
- [ ] User can reorder columns via drag-and-drop
- [ ] User can toggle column visibility
- [ ] All 15+ field types work correctly (including formula, relation, aggregation, lookup)
- [ ] Validation works for all field types
- [ ] Formulas evaluate correctly and handle circular dependencies
- [ ] Relations maintain referential integrity
- [ ] Aggregations compute accurately
- [ ] Lookups stay in sync with related records
- [ ] Data grid displays all types correctly
- [ ] Data grid allows editing all types

### Technical Requirements
- [ ] Physical PostgreSQL tables are updated correctly
- [ ] Metadata stays in sync with physical tables
- [ ] No data loss when modifying columns
- [ ] Proper error handling for unsafe operations
- [ ] Audit logging for all column operations

### UX Requirements
- [ ] UI is intuitive and easy to use
- [ ] Clear feedback for all operations
- [ ] Validation errors are helpful
- [ ] Changes are reflected immediately
- [ ] No confusing states

---

## Testing Strategy

### Unit Tests
- [ ] Field type validation functions
- [ ] Column operation utilities
- [ ] Data formatting functions
- [ ] Parsing functions

### Integration Tests
- [ ] Add column flow
- [ ] Edit column flow
- [ ] Delete column flow
- [ ] Reorder columns
- [ ] Each field type CRUD

### E2E Tests
- [ ] Complete column management workflow
- [ ] Add column → Add data → Edit column → Delete column
- [ ] All field types in single table
- [ ] Validation error handling

---

## Dependencies

**Required:**
- Phase 2 (Auth & Audit Logging) ✅ Complete

**Blocks:**
- Phase 2.5 (AI Assistant) ⚠️ **CRITICAL DEPENDENCY**

---

## Migration from Current State

### Current Limitations
- Can only define columns at table creation
- Only basic types (text, number, date, boolean)
- No validation
- No field configuration
- No way to modify columns

### Migration Steps
1. Add new fields to `data_table_columns` schema
2. Create column management API endpoints
3. Build UI components
4. Update data grid to support new types
5. Migrate existing columns to new system (no changes needed)

---

## Notes

### Design Decisions

**Q: What happens to data when changing column type?**
A: Block type changes if table has data. In Phase 5 we can add type conversion.

**Q: What happens when deleting column with data?**
A: Show warning with row count. Require explicit confirmation.

**Q: Should we support undo?**
A: Not in this phase. Consider for future enhancement.

**Q: How to handle column renaming?**
A: Allow rename without data loss. Update physical column name.

### Known Limitations
- Formula syntax is basic (no complex functions like DATE, IF, VLOOKUP - can add in Phase 5)
- Aggregations don't support complex GROUP BY (single field only)
- Relations are one-to-many or many-to-one only (no many-to-many - Phase 5)
- Lookups limited to 2 levels deep (can extend in Phase 5)
- No file uploads (Phase 5)
- No type conversion after data exists (Phase 5)
- No advanced column dependencies/computed fields (Phase 5)

---

**Last Updated**: December 22, 2025  
**Next Phase**: Phase 2.5 - AI Assistant (depends on this)

