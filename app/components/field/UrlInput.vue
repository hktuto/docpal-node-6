<script setup lang="ts">
interface Props {
  modelValue: string | null | undefined
  placeholder?: string
  openInNewTab?: boolean
  requireHttps?: boolean
  disabled?: boolean
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'https://example.com',
  openInNewTab: true,
  requireHttps: false,
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

function validateUrl(url: string): boolean {
  if (!url) return true
  
  try {
    new URL(url)
    return true
  } catch {
    // Try with https:// prefix
    try {
      new URL(`https://${url}`)
      return true
    } catch {
      return false
    }
  }
}

function normalizeUrl(url: string): string {
  if (!url) return ''
  
  // If URL doesn't have protocol, add https://
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`
  }
  
  return url
}

function handleBlur() {
  if (!inputValue.value) {
    errorMessage.value = ''
    return
  }
  
  if (!validateUrl(inputValue.value)) {
    errorMessage.value = 'Invalid URL format'
    return
  }
  
  // Normalize URL (add https:// if missing)
  const normalized = normalizeUrl(inputValue.value)
  
  if (props.requireHttps && !normalized.startsWith('https://')) {
    errorMessage.value = 'HTTPS is required'
    return
  }
  
  // Update with normalized URL
  inputValue.value = normalized
  errorMessage.value = ''
}

function handleInput() {
  // Clear error on input
  if (errorMessage.value) {
    errorMessage.value = ''
  }
}

function openUrl() {
  if (inputValue.value && validateUrl(inputValue.value)) {
    const url = normalizeUrl(inputValue.value)
    window.open(url, props.openInNewTab ? '_blank' : '_self')
  }
}
</script>

<template>
  <div class="url-input">
    <el-input
      v-model="inputValue"
      type="url"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="{ 'is-error': errorMessage }"
      @blur="handleBlur"
      @input="handleInput"
    >
      <template #prefix>
        <Icon name="lucide:link" />
      </template>
      <template v-if="inputValue && !errorMessage" #suffix>
        <el-button
          link
          type="primary"
          size="small"
          @click="openUrl"
        >
          <Icon name="lucide:external-link" />
        </el-button>
      </template>
    </el-input>
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<style scoped>
.url-input {
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

