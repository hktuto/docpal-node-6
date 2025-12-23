<script setup lang="ts">
interface Props {
  modelValue: number | string | null | undefined
  placeholder?: string
  symbol?: string
  position?: 'before' | 'after'
  decimalPlaces?: number
  compactDisplay?: boolean
  compactThreshold?: number
  min?: number
  max?: number
  disabled?: boolean
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '0.00',
  symbol: '$',
  position: 'before',
  decimalPlaces: 2,
  compactDisplay: false,
  compactThreshold: 10000,
  disabled: false,
  required: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void
}>()

const inputValue = ref('')
const errorMessage = ref('')
const isFocused = ref(false)

// Initialize input value
watchEffect(() => {
  if (!isFocused.value) {
    inputValue.value = formatInputValue(props.modelValue)
  }
})

function formatInputValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return ''
  
  return num.toFixed(props.decimalPlaces)
}

function parseInputValue(value: string): number | null {
  if (!value) return null
  
  // Remove currency symbol and spaces
  const cleanValue = value.replace(/[^0-9.-]/g, '')
  const num = parseFloat(cleanValue)
  
  return isNaN(num) ? null : num
}

function formatDisplayValue(value: number | null): string {
  if (value === null || value === undefined) return ''
  
  const num = value
  
  // Compact display for large numbers
  if (props.compactDisplay && Math.abs(num) >= props.compactThreshold!) {
    return formatCompact(num)
  }
  
  // Regular formatting with thousand separators
  return num.toLocaleString('en-US', {
    minimumFractionDigits: props.decimalPlaces,
    maximumFractionDigits: props.decimalPlaces
  })
}

function formatCompact(num: number): string {
  const absNum = Math.abs(num)
  const sign = num < 0 ? '-' : ''
  
  if (absNum >= 1e12) {
    return sign + (absNum / 1e12).toFixed(1) + 'T'
  } else if (absNum >= 1e9) {
    return sign + (absNum / 1e9).toFixed(1) + 'B'
  } else if (absNum >= 1e6) {
    return sign + (absNum / 1e6).toFixed(1) + 'M'
  } else if (absNum >= 1e3) {
    return sign + (absNum / 1e3).toFixed(1) + 'K'
  }
  
  return num.toFixed(props.decimalPlaces)
}

function handleInput(value: string) {
  inputValue.value = value
  
  // Clear error on input
  if (errorMessage.value) {
    errorMessage.value = ''
  }
}

function handleFocus() {
  isFocused.value = true
  // Show raw number without formatting when focused
  if (props.modelValue !== null && props.modelValue !== undefined) {
    inputValue.value = formatInputValue(props.modelValue)
  }
}

function handleBlur() {
  isFocused.value = false
  
  if (!inputValue.value) {
    errorMessage.value = ''
    emit('update:modelValue', null)
    return
  }
  
  const num = parseInputValue(inputValue.value)
  
  if (num === null) {
    errorMessage.value = 'Invalid number'
    return
  }
  
  // Validate min/max
  if (props.min !== undefined && num < props.min) {
    errorMessage.value = `Must be at least ${props.symbol}${props.min}`
    return
  }
  
  if (props.max !== undefined && num > props.max) {
    errorMessage.value = `Must be at most ${props.symbol}${props.max}`
    return
  }
  
  errorMessage.value = ''
  emit('update:modelValue', num)
  
  // Update display with formatted value
  inputValue.value = formatInputValue(num)
}

// Display formatted value when not focused
const displayValue = computed(() => {
  if (isFocused.value) {
    return inputValue.value
  }
  
  const num = parseInputValue(inputValue.value)
  return formatDisplayValue(num)
})

// Currency symbol display
const prefixContent = computed(() => {
  return props.position === 'before' ? props.symbol : ''
})

const suffixContent = computed(() => {
  return props.position === 'after' ? props.symbol : ''
})
</script>

<template>
  <div class="currency-input">
    <el-input
      :model-value="displayValue"
      type="text"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="{ 'is-error': errorMessage }"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
    >
      <template v-if="prefixContent" #prefix>
        <span class="currency-symbol">{{ prefixContent }}</span>
      </template>
      <template v-if="suffixContent" #suffix>
        <span class="currency-symbol">{{ suffixContent }}</span>
      </template>
    </el-input>
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    <div v-if="compactDisplay && !errorMessage && !isFocused" class="hint-text">
      Displays as compact notation for large values (K, M, B, T)
    </div>
  </div>
</template>

<style scoped>
.currency-input {
  width: 100%;
}

.currency-symbol {
  color: var(--el-text-color-regular);
  font-weight: 500;
}

.error-message {
  color: var(--el-color-danger);
  font-size: 12px;
  margin-top: 4px;
}

.hint-text {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-top: 4px;
}

.is-error :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-danger) inset;
}

:deep(.el-input__inner) {
  text-align: right;
}
</style>

