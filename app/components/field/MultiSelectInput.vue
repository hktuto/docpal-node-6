<script setup lang="ts">
interface SelectOption {
  label: string
  value: string
}

interface Props {
  modelValue: string[] | null | undefined
  options: SelectOption[] | string[]
  placeholder?: string
  maxSelections?: number
  allowCustom?: boolean
  disabled?: boolean
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  options: () => [],
  placeholder: 'Select options',
  allowCustom: false,
  disabled: false,
  required: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[] | null): void
}>()

const inputValue = computed({
  get: () => props.modelValue || [],
  set: (val) => emit('update:modelValue', val && val.length > 0 ? val : null)
})

// Normalize options to SelectOption format
const normalizedOptions = computed<SelectOption[]>(() => {
  return props.options.map(opt => {
    if (typeof opt === 'string') {
      return { label: opt, value: opt }
    }
    return opt
  })
})

// Check if max selections reached
const isMaxReached = computed(() => {
  return props.maxSelections && inputValue.value.length >= props.maxSelections
})

// For custom input mode
const showCustomInput = ref(false)
const customValue = ref('')

function handleChange(value: string[]) {
  // Check if custom option was selected
  if (value.includes('__custom__') && props.allowCustom) {
    // Remove __custom__ from value
    const filtered = value.filter(v => v !== '__custom__')
    inputValue.value = filtered
    showCustomInput.value = true
  }
}

function handleCustomConfirm() {
  if (customValue.value && !inputValue.value.includes(customValue.value)) {
    inputValue.value = [...inputValue.value, customValue.value]
  }
  showCustomInput.value = false
  customValue.value = ''
}

function handleCustomCancel() {
  showCustomInput.value = false
  customValue.value = ''
}
</script>

<template>
  <div class="multi-select-input">
    <el-select
      v-model="inputValue"
      :placeholder="placeholder"
      :disabled="disabled || isMaxReached"
      multiple
      filterable
      clearable
      collapse-tags
      collapse-tags-tooltip
      @change="handleChange"
    >
      <el-option
        v-for="option in normalizedOptions"
        :key="option.value"
        :label="option.label"
        :value="option.value"
        :disabled="isMaxReached && !inputValue.includes(option.value)"
      />
      <el-option
        v-if="allowCustom"
        value="__custom__"
        label="+ Add custom value"
      />
    </el-select>
    
    <div v-if="isMaxReached" class="hint-text warning">
      Maximum {{ maxSelections }} selections reached
    </div>
    
    <div v-else-if="maxSelections" class="hint-text">
      {{ inputValue.length }} / {{ maxSelections }} selected
    </div>
    
    <!-- Custom value input dialog -->
    <el-dialog
      v-model="showCustomInput"
      title="Add Custom Value"
      width="400px"
    >
      <el-input
        v-model="customValue"
        placeholder="Enter custom value"
        @keyup.enter="handleCustomConfirm"
      />
      <template #footer>
        <el-button @click="handleCustomCancel">Cancel</el-button>
        <el-button type="primary" @click="handleCustomConfirm">
          Add
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.multi-select-input {
  width: 100%;
}

.hint-text {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-top: 4px;
}

.hint-text.warning {
  color: var(--el-color-warning);
}
</style>

