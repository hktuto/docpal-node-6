<script setup lang="ts">
interface Props {
  modelValue: string | null | undefined
  placeholder?: string
  allowMultiple?: boolean
  disabled?: boolean
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'name@example.com',
  allowMultiple: false,
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

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function handleBlur() {
  if (!inputValue.value) {
    errorMessage.value = ''
    return
  }
  
  if (props.allowMultiple) {
    // Validate comma-separated emails
    const emails = inputValue.value.split(',').map(e => e.trim())
    const invalidEmails = emails.filter(email => email && !validateEmail(email))
    
    if (invalidEmails.length > 0) {
      errorMessage.value = `Invalid email: ${invalidEmails[0]}`
    } else {
      errorMessage.value = ''
    }
  } else {
    // Validate single email
    if (!validateEmail(inputValue.value)) {
      errorMessage.value = 'Invalid email format'
    } else {
      errorMessage.value = ''
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
  <div class="email-input">
    <el-input
      v-model="inputValue"
      type="email"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="{ 'is-error': errorMessage }"
      @blur="handleBlur"
      @input="handleInput"
    >
      <template #prefix>
        <Icon name="lucide:mail" />
      </template>
    </el-input>
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    <div v-if="allowMultiple && !errorMessage" class="hint-text">
      Separate multiple emails with commas
    </div>
  </div>
</template>

<style scoped>
.email-input {
  width: 100%;
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
</style>

