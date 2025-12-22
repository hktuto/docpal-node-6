<script setup lang="ts">
interface Props {
  modelValue: string | null | undefined
  placeholder?: string
  format?: 'international' | 'us' | 'uk' | 'custom'
  disabled?: boolean
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '+1 (555) 123-4567',
  format: 'international',
  disabled: false,
  required: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
}>()

const inputValue = computed({
  get: () => props.modelValue || '',
  set: (val) => emit('update:modelValue', val || null)
})

const errorMessage = ref('')

function validatePhone(phone: string): boolean {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '')
  
  // Check length (10-15 digits is reasonable for most countries)
  return digitsOnly.length >= 10 && digitsOnly.length <= 15
}

function formatPhone(phone: string): string {
  if (!phone) return ''
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '')
  
  if (props.format === 'us' && digitsOnly.length === 10) {
    // Format as (555) 123-4567
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`
  } else if (props.format === 'us' && digitsOnly.length === 11 && digitsOnly[0] === '1') {
    // Format as +1 (555) 123-4567
    return `+1 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`
  }
  
  // For international or other formats, just return with spaces
  return phone
}

function handleBlur() {
  if (!inputValue.value) {
    errorMessage.value = ''
    return
  }
  
  if (!validatePhone(inputValue.value)) {
    errorMessage.value = 'Invalid phone number'
  } else {
    errorMessage.value = ''
    // Auto-format on blur if US format
    if (props.format === 'us') {
      inputValue.value = formatPhone(inputValue.value)
    }
  }
}

function handleInput() {
  // Clear error on input
  if (errorMessage.value) {
    errorMessage.value = ''
  }
}
</script>

<template>
  <div class="phone-input">
    <el-input
      v-model="inputValue"
      type="tel"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="{ 'is-error': errorMessage }"
      @blur="handleBlur"
      @input="handleInput"
    >
      <template #prefix>
        <Icon name="lucide:phone" />
      </template>
    </el-input>
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<style scoped>
.phone-input {
  width: 100%;
}

.error-message {
  color: var(--el-color-danger);
  font-size: 12px;
  margin-top: 4px;
}

.is-error :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-danger) inset;
}
</style>

