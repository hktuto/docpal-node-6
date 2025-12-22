<script setup lang="ts">
import { validatePhone, formatPhoneNumber } from '#shared/utils/validators'

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

function handleBlur() {
  if (!inputValue.value) {
    errorMessage.value = ''
    return
  }
  
  const result = validatePhone(inputValue.value)
  errorMessage.value = result.error || ''
  
  // Auto-format on blur if valid
  if (result.valid && props.format === 'us') {
    inputValue.value = formatPhoneNumber(inputValue.value, 'us')
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

