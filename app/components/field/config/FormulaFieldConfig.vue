<script setup lang="ts">
interface Props {
  modelValue: any
  tableSlug: string
  workspaceSlug: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>()

const config = computed({
  get: () => props.modelValue || {},
  set: (val) => emit('update:modelValue', val)
})

// Fetch available fields for autocomplete
const availableFields = ref<any[]>([])
const loadingFields = ref(false)

async function fetchFields() {
  loadingFields.value = true
  try {
    const response = await $fetch(`/api/workspaces/${props.workspaceSlug}/tables/${props.tableSlug}/columns`)
    availableFields.value = (response as any).data || []
  } catch (error) {
    console.error('Failed to load fields:', error)
    availableFields.value = []
  } finally {
    loadingFields.value = false
  }
}

// Return type options
const returnTypes = [
  { value: 'number', label: 'Number', icon: 'lucide:hash' },
  { value: 'text', label: 'Text', icon: 'lucide:type' },
  { value: 'boolean', label: 'Boolean', icon: 'lucide:check-square' },
  { value: 'date', label: 'Date', icon: 'lucide:calendar' }
]

// Insert field reference at cursor
const formulaInput = ref<any>(null)

function insertField(fieldName: string) {
  const input = formulaInput.value?.$el?.querySelector('textarea') || formulaInput.value?.$el?.querySelector('input')
  
  if (input) {
    const start = input.selectionStart
    const end = input.selectionEnd
    const text = config.value.formula || ''
    const before = text.substring(0, start)
    const after = text.substring(end)
    
    config.value.formula = before + `{${fieldName}}` + after
    
    // Set cursor position after inserted field
    nextTick(() => {
      const newPos = start + fieldName.length + 2
      input.setSelectionRange(newPos, newPos)
      input.focus()
    })
  } else {
    // Fallback: append to end
    config.value.formula = (config.value.formula || '') + `{${fieldName}}`
  }
}

// Formula examples
const examples = [
  { label: 'Math: Price × Quantity', formula: '{price} * {quantity}' },
  { label: 'Discount: 10% off', formula: '{price} * 0.9' },
  { label: 'Full Name', formula: '{first_name} & " " & {last_name}' },
  { label: 'Tax Calculation', formula: '{price} * 1.1' },
  { label: 'Conditional', formula: 'IF({quantity} > 100, {price} * 0.9, {price})' }
]

function useExample(formula: string) {
  config.value.formula = formula
}

// Initialize defaults
onMounted(async () => {
  await fetchFields()
  
  if (!config.value.returnType) {
    config.value.returnType = 'number'
  }
  if (config.value.cacheResult === undefined) {
    config.value.cacheResult = true
  }
})
</script>

<template>
  <div class="formula-field-config">
    <!-- Formula Editor -->
    <el-form-item label="Formula" required>
      <el-input
        ref="formulaInput"
        v-model="config.formula"
        type="textarea"
        :rows="4"
        placeholder="e.g., {price} * {quantity}"
        class="formula-input"
      />
      <template #extra>
        <div class="formula-help">
          <span class="hint">Use <code>{field_name}</code> to reference fields</span>
          <span class="hint">Operators: <code>+</code> <code>-</code> <code>*</code> <code>/</code> <code>&</code> (concat)</span>
        </div>
      </template>
    </el-form-item>
    
    <!-- Available Fields -->
    <el-form-item label="Available Fields">
      <div class="fields-grid">
        <el-button
          v-for="field in availableFields"
          :key="field.name"
          size="small"
          @click="insertField(field.name)"
        >
          <Icon :name="`lucide:${field.type === 'text' ? 'type' : field.type === 'number' ? 'hash' : 'circle'}`" size="14" />
          {{ field.label }}
        </el-button>
        
        <div v-if="loadingFields" class="loading-fields">
          <Icon name="lucide:loader-2" size="16" class="spin" />
          Loading fields...
        </div>
        
        <div v-else-if="availableFields.length === 0" class="no-fields">
          <Icon name="lucide:alert-circle" size="16" />
          No fields available
        </div>
      </div>
      <template #extra>
        <span class="hint">Click to insert field reference into formula</span>
      </template>
    </el-form-item>
    
    <!-- Return Type -->
    <el-form-item label="Return Type" required>
      <el-select v-model="config.returnType" placeholder="Select return type">
        <el-option
          v-for="type in returnTypes"
          :key="type.value"
          :label="type.label"
          :value="type.value"
        >
          <div style="display: flex; align-items: center; gap: 8px;">
            <Icon :name="type.icon" size="16" />
            <span>{{ type.label }}</span>
          </div>
        </el-option>
      </el-select>
      <template #extra>
        <span class="hint">The type of value this formula returns</span>
      </template>
    </el-form-item>
    
    <!-- Formula Examples -->
    <el-form-item label="Examples">
      <div class="examples-list">
        <div
          v-for="example in examples"
          :key="example.formula"
          class="example-item"
          @click="useExample(example.formula)"
        >
          <strong>{{ example.label }}</strong>
          <code>{{ example.formula }}</code>
        </div>
      </div>
      <template #extra>
        <span class="hint">Click to use an example formula</span>
      </template>
    </el-form-item>
    
    <!-- Options -->
    <el-form-item label="Options">
      <el-checkbox v-model="config.cacheResult">
        <div class="option-label">
          <strong>Cache Result</strong>
          <span class="hint">Store calculated value for better performance</span>
        </div>
      </el-checkbox>
    </el-form-item>
    
    <!-- Supported Functions -->
    <el-collapse class="functions-help">
      <el-collapse-item title="📚 Supported Functions" name="functions">
        <div class="functions-list">
          <div class="function-item">
            <code>SUM(a, b, c)</code>
            <span>Add numbers together</span>
          </div>
          <div class="function-item">
            <code>AVG(a, b, c)</code>
            <span>Calculate average</span>
          </div>
          <div class="function-item">
            <code>MIN(a, b, c)</code>
            <span>Find minimum value</span>
          </div>
          <div class="function-item">
            <code>MAX(a, b, c)</code>
            <span>Find maximum value</span>
          </div>
          <div class="function-item">
            <code>ROUND(n, decimals)</code>
            <span>Round to decimals</span>
          </div>
          <div class="function-item">
            <code>IF(condition, true, false)</code>
            <span>Conditional logic</span>
          </div>
          <div class="function-item">
            <code>COUNT(a, b, c)</code>
            <span>Count non-null values</span>
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<style scoped>
.hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.formula-help {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.formula-help code {
  padding: 2px 4px;
  background-color: var(--el-fill-color-light);
  border-radius: 3px;
  font-size: 11px;
}

.formula-input {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.fields-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.loading-fields,
.no-fields {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.examples-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.example-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  background-color: var(--el-fill-color-light);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.example-item:hover {
  background-color: var(--el-fill-color);
  transform: translateX(4px);
}

.example-item strong {
  font-size: 13px;
}

.example-item code {
  font-size: 12px;
  color: var(--el-color-primary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.option-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-label .hint {
  margin-top: 0;
  font-size: 11px;
}

.functions-help {
  margin-top: 16px;
}

.functions-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
}

.function-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.function-item code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  color: var(--el-color-primary);
  font-weight: 600;
}

.function-item span {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

:deep(.el-checkbox) {
  align-items: flex-start;
}
</style>


