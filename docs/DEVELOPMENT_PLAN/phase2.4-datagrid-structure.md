# DataGrid Layer - Field Components Structure

**Phase 2.4 Addition:** Field components for all field types

---

## Directory Structure

```
layers/datagrid/
├── app/
│   ├── components/
│   │   ├── DataGrid.vue                    # Main grid component (existing)
│   │   └── fields/                         # NEW: Field components
│   │       ├── inputs/                     # Input components (editable)
│   │       │   ├── TextInput.vue
│   │       │   ├── NumberInput.vue
│   │       │   ├── DateInput.vue
│   │       │   ├── BooleanInput.vue
│   │       │   ├── EmailInput.vue
│   │       │   ├── PhoneInput.vue
│   │       │   ├── UrlInput.vue
│   │       │   ├── SelectInput.vue
│   │       │   ├── MultiSelectInput.vue
│   │       │   ├── CheckboxInput.vue
│   │       │   ├── TextareaInput.vue
│   │       │   ├── RatingInput.vue
│   │       │   ├── CurrencyInput.vue
│   │       │   ├── PercentInput.vue
│   │       │   ├── ColorInput.vue
│   │       │   ├── DateTimeInput.vue
│   │       │   └── RelationPicker.vue
│   │       └── displays/                   # Display components (read-only)
│   │           ├── TextDisplay.vue
│   │           ├── NumberDisplay.vue
│   │           ├── DateDisplay.vue
│   │           ├── BooleanDisplay.vue
│   │           ├── EmailDisplay.vue
│   │           ├── PhoneDisplay.vue
│   │           ├── UrlDisplay.vue
│   │           ├── SelectDisplay.vue
│   │           ├── MultiSelectDisplay.vue
│   │           ├── CheckboxDisplay.vue
│   │           ├── RatingDisplay.vue
│   │           ├── CurrencyDisplay.vue
│   │           ├── PercentDisplay.vue
│   │           ├── ColorDisplay.vue
│   │           ├── DateTimeDisplay.vue
│   │           ├── FormulaDisplay.vue
│   │           ├── AggregationDisplay.vue
│   │           ├── RelationDisplay.vue
│   │           └── LookupDisplay.vue
│   ├── composables/
│   │   ├── useFieldRegistry.ts             # Field type registry
│   │   ├── useFieldRenderer.ts             # Dynamic rendering logic
│   │   └── useFieldValidation.ts           # Client validation
│   └── utils/
│       ├── fieldFormatters.ts              # Format values for display
│       └── fieldParsers.ts                 # Parse input values
├── nuxt.config.ts
└── README.md
```

---

## Component Responsibilities

### Input Components
**Purpose:** Allow users to edit cell values inline in the grid

**Common Props:**
```typescript
interface FieldInputProps {
  modelValue: any                    // Current value
  column: DataTableColumn            // Column metadata
  row: Record<string, any>           // Entire row data
  disabled?: boolean
  readonly?: boolean
}

// Emits
emits: ['update:modelValue', 'blur', 'focus']
```

**Example:** `EmailInput.vue`
```vue
<template>
  <el-input
    :model-value="modelValue"
    @update:model-value="handleInput"
    type="email"
    :placeholder="column.label"
    :disabled="disabled"
    :readonly="readonly"
  />
</template>

<script setup lang="ts">
const props = defineProps<FieldInputProps>()
const emit = defineEmits(['update:modelValue'])

function handleInput(value: string) {
  // Validate email format
  if (value && !isValidEmail(value)) {
    // Show error or warning
    return
  }
  emit('update:modelValue', value)
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
</script>
```

---

### Display Components
**Purpose:** Show cell values in a formatted, read-only way

**Common Props:**
```typescript
interface FieldDisplayProps {
  value: any                         // Cell value
  column: DataTableColumn            // Column metadata
  row: Record<string, any>           // Entire row data
}
```

**Example:** `EmailDisplay.vue`
```vue
<template>
  <a
    v-if="value"
    :href="`mailto:${value}`"
    class="email-display"
    @click.stop
  >
    <Icon name="lucide:mail" size="14" />
    {{ value }}
  </a>
  <span v-else class="empty">-</span>
</template>

<script setup lang="ts">
const props = defineProps<FieldDisplayProps>()
</script>

<style scoped>
.email-display {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--el-color-primary);
  text-decoration: none;
}

.email-display:hover {
  text-decoration: underline;
}

.empty {
  color: var(--el-text-color-placeholder);
}
</style>
```

---

## Field Registry

**Location:** `layers/datagrid/app/composables/useFieldRegistry.ts`

```typescript
export interface FieldTypeDefinition {
  name: string
  label: string
  icon: string
  category: 'basic' | 'advanced' | 'complex'
  inputComponent: string              // Component name for editing
  displayComponent: string            // Component name for display
  defaultValue: any
  validator?: (value: any, config: any) => boolean
  formatter?: (value: any, config: any) => string
  parser?: (input: string) => any
}

export const FIELD_TYPES: Record<string, FieldTypeDefinition> = {
  text: {
    name: 'text',
    label: 'Text',
    icon: 'lucide:type',
    category: 'basic',
    inputComponent: 'TextInput',
    displayComponent: 'TextDisplay',
    defaultValue: '',
  },
  email: {
    name: 'email',
    label: 'Email',
    icon: 'lucide:mail',
    category: 'basic',
    inputComponent: 'EmailInput',
    displayComponent: 'EmailDisplay',
    defaultValue: '',
    validator: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  },
  select: {
    name: 'select',
    label: 'Select',
    icon: 'lucide:list',
    category: 'basic',
    inputComponent: 'SelectInput',
    displayComponent: 'SelectDisplay',
    defaultValue: null,
  },
  // ... more field types
}

export function useFieldRegistry() {
  const getFieldType = (name: string) => FIELD_TYPES[name]
  
  const getFieldTypes = (category?: string) => {
    if (!category) return Object.values(FIELD_TYPES)
    return Object.values(FIELD_TYPES).filter(f => f.category === category)
  }
  
  const getInputComponent = (fieldType: string) => {
    return FIELD_TYPES[fieldType]?.inputComponent
  }
  
  const getDisplayComponent = (fieldType: string) => {
    return FIELD_TYPES[fieldType]?.displayComponent
  }
  
  return {
    fieldTypes: FIELD_TYPES,
    getFieldType,
    getFieldTypes,
    getInputComponent,
    getDisplayComponent,
  }
}
```

---

## Field Renderer Composable

**Location:** `layers/datagrid/app/composables/useFieldRenderer.ts`

```typescript
import { resolveComponent, h } from 'vue'

export function useFieldRenderer() {
  const { getInputComponent, getDisplayComponent } = useFieldRegistry()
  
  /**
   * Render input component for editing
   */
  const renderInput = (column: DataTableColumn, row: any, value: any) => {
    const componentName = getInputComponent(column.type)
    if (!componentName) {
      console.warn(`No input component for field type: ${column.type}`)
      return h('input', { value })
    }
    
    const component = resolveComponent(`Fields${componentName}`)
    return h(component, {
      modelValue: value,
      column,
      row,
      'onUpdate:modelValue': (newValue) => {
        row[column.name] = newValue
      }
    })
  }
  
  /**
   * Render display component for viewing
   */
  const renderDisplay = (column: DataTableColumn, row: any, value: any) => {
    const componentName = getDisplayComponent(column.type)
    if (!componentName) {
      return h('span', value?.toString() || '-')
    }
    
    const component = resolveComponent(`Fields${componentName}`)
    return h(component, {
      value,
      column,
      row
    })
  }
  
  return {
    renderInput,
    renderDisplay,
  }
}
```

---

## Integration with DataGrid

**Update:** `layers/datagrid/app/components/DataGrid.vue`

```vue
<template>
  <vxe-grid
    ref="gridRef"
    v-bind="gridOptions"
    :columns="processedColumns"
  >
    <!-- Dynamic cell rendering based on field type -->
    <template
      v-for="column in columns"
      :key="column.field"
      #[`${column.field}_edit`]="{ row }"
    >
      <component
        :is="getInputComponent(column)"
        v-model="row[column.field]"
        :column="column"
        :row="row"
      />
    </template>
    
    <template
      v-for="column in columns"
      :key="column.field"
      #[column.field]="{ row }"
    >
      <component
        :is="getDisplayComponent(column)"
        :value="row[column.field]"
        :column="column"
        :row="row"
      />
    </template>
  </vxe-grid>
</template>

<script setup lang="ts">
import { useFieldRenderer } from '../composables/useFieldRenderer'

const { renderInput, renderDisplay } = useFieldRenderer()

const getInputComponent = (column) => {
  // Resolve field input component dynamically
}

const getDisplayComponent = (column) => {
  // Resolve field display component dynamically
}
</script>
```

---

## Usage in Main App

The main app only needs to specify column types:

```vue
<template>
  <DataGrid
    :columns="columns"
    :proxy-config="proxyConfig"
  />
</template>

<script setup lang="ts">
const columns = ref([
  {
    field: 'name',
    title: 'Name',
    type: 'text',           // DataGrid layer handles rendering
    minWidth: 150,
  },
  {
    field: 'email',
    title: 'Email',
    type: 'email',          // Renders EmailInput + EmailDisplay
    minWidth: 200,
  },
  {
    field: 'status',
    title: 'Status',
    type: 'select',         // Renders SelectInput + SelectDisplay
    config: {
      options: [
        { value: 'active', label: 'Active', color: 'success' },
        { value: 'inactive', label: 'Inactive', color: 'danger' },
      ]
    }
  },
  {
    field: 'rating',
    title: 'Rating',
    type: 'rating',         // Renders RatingInput + RatingDisplay
    config: {
      maxRating: 5,
      allowHalf: true,
    }
  }
])
</script>
```

---

## Benefits of This Structure

1. **Separation of Concerns**
   - DataGrid layer handles data display/editing
   - Main app handles column configuration
   
2. **Reusability**
   - Field components can be reused outside the grid
   - Easy to add new field types
   
3. **Type Safety**
   - Field type registry ensures consistency
   - TypeScript support throughout
   
4. **Maintainability**
   - Clear structure for each field type
   - Easy to find and update components
   
5. **Performance**
   - Components can be lazy-loaded
   - Dynamic imports for field types
   
6. **Extensibility**
   - Main app can override field components
   - Custom field types can be registered

---

**Last Updated:** December 22, 2025

