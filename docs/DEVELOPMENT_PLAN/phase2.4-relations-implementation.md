# Relations, Lookups & Formulas Implementation

**Status**: 🟡 In Progress  
**Started**: December 23, 2025  
**Timeline**: 2 weeks (Relations → Lookups → Formulas)

---

## Overview

Implementing the three most powerful field types that will enable the AI Assistant to suggest intelligent, connected data structures.

---

## Part 1: Relations (Days 1-3)

### Goal
Enable tables to reference other tables via foreign keys, creating relationships between data.

### Schema Design

```typescript
{
  type: 'relation',
  pgType: 'UUID',  // Foreign key
  config: {
    targetTable: string,      // UUID of target table
    displayField: string,      // Which field to show (e.g., "name")
    cascadeDelete: 'restrict' | 'cascade' | 'set_null',
    relationshipType: 'many_to_one'  // Start simple
  }
}
```

### Examples

**Contacts → Companies**
```typescript
{
  name: 'company_id',
  label: 'Company',
  type: 'relation',
  config: {
    targetTable: 'companies-uuid',
    displayField: 'name',
    cascadeDelete: 'set_null'
  }
}
```

**Orders → Customers**
```typescript
{
  name: 'customer_id',
  label: 'Customer',
  type: 'relation',
  config: {
    targetTable: 'customers-uuid',
    displayField: 'full_name',
    cascadeDelete: 'restrict'
  }
}
```

### Backend Implementation

#### 1. Field Type Definition (`server/utils/fieldTypes.ts`)

```typescript
relation: {
  name: 'relation',
  label: 'Relation',
  description: 'Link to another table',
  category: 'relation',
  pgType: () => 'UUID',
  
  validate: (value, config) => {
    if (!value) return { valid: true }
    
    // Check if related record exists
    // This will be implemented in the API layer
    return { valid: true }
  },
  
  defaultConfig: {
    targetTable: null,
    displayField: 'id',
    cascadeDelete: 'set_null',
    relationshipType: 'many_to_one'
  },
  
  aiHints: [
    'links to another table',
    'foreign key',
    'belongs to',
    'references'
  ],
  
  icon: 'lucide:link'
}
```

#### 2. Column Creation with Foreign Key

When creating a relation column, we need to:
1. Add UUID column to physical table
2. Create foreign key constraint
3. Store relation config in metadata

```sql
-- Physical table change
ALTER TABLE "table_name" 
  ADD COLUMN "column_name" UUID
  REFERENCES "target_table" (id)
  ON DELETE SET NULL;  -- or CASCADE or RESTRICT
```

#### 3. Helper Functions

**`server/utils/relationHelpers.ts`** (NEW FILE)

```typescript
/**
 * Get related record by ID
 */
export async function getRelatedRecord(
  tableId: string,
  recordId: string,
  displayFields: string[]
) {
  // Fetch record from target table
  // Return only requested fields
}

/**
 * Search related records for picker
 */
export async function searchRelatedRecords(
  tableId: string,
  searchQuery: string,
  displayField: string,
  limit: number = 50
) {
  // Search records in target table
  // Return id + display field
}

/**
 * Validate relation exists
 */
export async function validateRelation(
  tableId: string,
  recordId: string
): Promise<boolean> {
  // Check if record exists in target table
}

/**
 * Create foreign key constraint
 */
export async function createForeignKey(
  sourceTable: string,
  columnName: string,
  targetTable: string,
  onDelete: 'restrict' | 'cascade' | 'set_null'
) {
  const constraint = `fk_${sourceTable}_${columnName}`
  const action = onDelete === 'set_null' ? 'SET NULL' : 
                 onDelete === 'cascade' ? 'CASCADE' : 'RESTRICT'
  
  await db.execute(`
    ALTER TABLE "${sourceTable}"
    ADD CONSTRAINT "${constraint}"
    FOREIGN KEY ("${columnName}")
    REFERENCES "${targetTable}" (id)
    ON DELETE ${action}
  `)
}
```

#### 4. API Updates

**Column Creation API** - Add relation support:
```typescript
if (column.type === 'relation') {
  // 1. Add UUID column
  await db.execute(`
    ALTER TABLE "${table.tableName}"
    ADD COLUMN "${column.name}" UUID
  `)
  
  // 2. Get target table physical name
  const targetTable = await getTableById(column.config.targetTable)
  
  // 3. Create foreign key
  await createForeignKey(
    table.tableName,
    column.name,
    targetTable.tableName,
    column.config.cascadeDelete
  )
}
```

**Data Fetching API** - Expand relations:
```typescript
// New parameter: expand=relation1,relation2
// Return related record data inline

{
  id: '...',
  name: 'John Doe',
  company_id: 'company-uuid',
  company: {  // ← Expanded
    id: 'company-uuid',
    name: 'Acme Corp'
  }
}
```

### Frontend Implementation

#### 1. Configuration Component

**`app/components/field/config/RelationFieldConfig.vue`** (NEW FILE)

```vue
<script setup lang="ts">
interface Props {
  modelValue: any
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>()

const config = computed({
  get: () => props.modelValue || {},
  set: (val) => emit('update:modelValue', val)
})

// Fetch available tables
const { data: tables } = await useApi('/api/workspaces/current/tables')

// Fetch fields from selected table
const targetFields = ref([])
watch(() => config.value.targetTable, async (tableId) => {
  if (tableId) {
    const response = await useApi(`/api/tables/${tableId}/columns`)
    targetFields.value = response.data
  }
})
</script>

<template>
  <div class="relation-field-config">
    <!-- Target Table -->
    <el-form-item label="Target Table" required>
      <el-select 
        v-model="config.targetTable" 
        placeholder="Select table to link to"
      >
        <el-option
          v-for="table in tables"
          :key="table.id"
          :label="table.name"
          :value="table.id"
        />
      </el-select>
    </el-form-item>
    
    <!-- Display Field -->
    <el-form-item label="Display Field" required>
      <el-select 
        v-model="config.displayField"
        placeholder="Which field to show"
      >
        <el-option
          v-for="field in targetFields"
          :key="field.name"
          :label="field.label"
          :value="field.name"
        />
      </el-select>
    </el-form-item>
    
    <!-- Cascade Delete -->
    <el-form-item label="When Related Record is Deleted">
      <el-radio-group v-model="config.cascadeDelete">
        <el-radio label="set_null">
          Set this field to null
        </el-radio>
        <el-radio label="restrict">
          Prevent deletion (require manual cleanup)
        </el-radio>
        <el-radio label="cascade">
          Delete this record too (⚠️ Dangerous)
        </el-radio>
      </el-radio-group>
    </el-form-item>
  </div>
</template>
```

#### 2. Relation Picker Component

**`app/components/field/RelationPicker.vue`** (NEW FILE)

```vue
<script setup lang="ts">
interface Props {
  modelValue: string | null
  tableId: string
  displayField: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
}>()

const searchQuery = ref('')
const options = ref([])
const loading = ref(false)

// Debounced search
const searchRecords = useDebounceFn(async () => {
  loading.value = true
  try {
    const response = await useApi(
      `/api/tables/${props.tableId}/records/search`,
      {
        params: {
          q: searchQuery.value,
          field: props.displayField,
          limit: 50
        }
      }
    )
    options.value = response.data
  } finally {
    loading.value = false
  }
}, 300)

watch(searchQuery, searchRecords)

// Load initial selected value
onMounted(async () => {
  if (props.modelValue) {
    const response = await useApi(
      `/api/tables/${props.tableId}/records/${props.modelValue}`
    )
    // Show selected option
  }
})
</script>

<template>
  <el-select
    :model-value="modelValue"
    filterable
    remote
    :remote-method="(q) => { searchQuery = q }"
    :loading="loading"
    placeholder="Search and select..."
    clearable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-option
      v-for="option in options"
      :key="option.id"
      :label="option[displayField]"
      :value="option.id"
    />
  </el-select>
</template>
```

#### 3. Display Component

**`app/components/field/RelationDisplay.vue`** (NEW FILE)

```vue
<script setup lang="ts">
interface Props {
  value: string | null
  tableId: string
  displayField: string
}

const props = defineProps<Props>()

const relatedRecord = ref(null)
const loading = ref(false)

watchEffect(async () => {
  if (props.value) {
    loading.value = true
    try {
      const response = await useApi(
        `/api/tables/${props.tableId}/records/${props.value}`
      )
      relatedRecord.value = response.data
    } catch (error) {
      console.error('Failed to load related record:', error)
    } finally {
      loading.value = false
    }
  }
})
</script>

<template>
  <div class="relation-display">
    <span v-if="loading" class="loading">Loading...</span>
    <span v-else-if="!value" class="empty">—</span>
    <NuxtLink 
      v-else-if="relatedRecord"
      :to="`/tables/${tableId}/records/${value}`"
      class="relation-link"
    >
      <Icon name="lucide:link" size="14" />
      {{ relatedRecord[displayField] }}
    </NuxtLink>
  </div>
</template>

<style scoped>
.relation-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--el-color-primary);
  text-decoration: none;
}

.relation-link:hover {
  text-decoration: underline;
}
</style>
```

### Testing Checklist

- [ ] Create relation column via API
- [ ] Foreign key constraint is created
- [ ] Can select related record in picker
- [ ] Display shows related record
- [ ] Click on display opens related record
- [ ] Cascade delete SET NULL works
- [ ] Cascade delete RESTRICT prevents deletion
- [ ] Cascade delete CASCADE deletes both
- [ ] Broken relation shows gracefully
- [ ] AI can suggest relation fields

---

## Part 2: Lookups (Days 4-5)

### Goal
Automatically pull field values from related records.

### Schema Design

```typescript
{
  type: 'lookup',
  pgType: 'TEXT',  // Cached value
  config: {
    relationField: string,    // Which relation to follow
    targetField: string,       // Which field to pull
    autoUpdate: boolean        // Update when related changes
  }
}
```

### Example

If `Contacts` has a relation to `Companies`:
```typescript
{
  name: 'company_name',
  label: 'Company Name',
  type: 'lookup',
  config: {
    relationField: 'company_id',
    targetField: 'name',
    autoUpdate: true
  }
}
```

### Implementation

**Backend:**
- When fetching records, JOIN with related table
- Cache lookup value in the column
- On related record update, refresh all lookups
- Webhook/trigger system for auto-update

**Frontend:**
- Configure source relation
- Configure target field
- Display with lookup icon
- Show stale indicator if not auto-update

---

## Part 3: Formulas (Days 1-5, Week 2)

### Goal
Calculate field values using expressions.

### Formula Syntax

```javascript
// Math
{price} * {quantity}
{total} - {discount}
ROUND({price} * 1.1, 2)

// Text
{first_name} & " " & {last_name}

// Conditional
IF({status} = "completed", {price}, 0)

// With relations
{quantity} * {product.price}
```

### Implementation

**Tokenizer:**
```typescript
"{price} * {quantity}"
→ [
  { type: 'field', value: 'price' },
  { type: 'operator', value: '*' },
  { type: 'field', value: 'quantity' }
]
```

**Parser:**
Build AST (Abstract Syntax Tree)

**Evaluator:**
Execute AST with record data

**Circular Dependency Detection:**
Track dependencies, detect cycles

---

## Success Criteria

### Relations
- [ ] Can create relation column
- [ ] Foreign key works correctly
- [ ] Picker searches and selects records
- [ ] Display shows related record with link
- [ ] All cascade options work
- [ ] AI suggests relations

### Lookups
- [ ] Can create lookup column
- [ ] Values are pulled from related records
- [ ] Auto-update works
- [ ] AI suggests lookups

### Formulas
- [ ] Can write formulas
- [ ] Math operations work
- [ ] Text concat works
- [ ] IF function works
- [ ] Field references work
- [ ] Relation field references work
- [ ] Circular dependencies detected
- [ ] AI suggests formulas

---

**Next:** Start implementing Relations!

