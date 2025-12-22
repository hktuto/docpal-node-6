<script setup lang="ts">
interface SelectOption {
  label: string
  value: string
}

interface Props {
  modelValue: string | null | undefined
  options: SelectOption[] | string[]
  placeholder?: string
  allowCustom?: boolean
  disabled?: boolean
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  options: () => [],
  placeholder: 'Select an option',
  allowCustom: false,
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

// Normalize options to SelectOption format
const normalizedOptions = computed<SelectOption[]>(() => {
  return props.options.map(opt => {
    if (typeof opt === 'string') {
      return { label: opt, value: opt }
    }
    return opt
  })
})

// For custom input mode
const showCustomInput = ref(false)
const customValue = ref('')

function handleSelectChange(value: string) {
  if (value === '__custom__' && props.allowCustom) {
    showCustomInput.value = true
    customValue.value = inputValue.value || ''
  } else {
    showCustomInput.value = false
  }
}

function handleCustomConfirm() {
  if (customValue.value) {
    inputValue.value = customValue.value
    showCustomInput.value = false
  }
}

function handleCustomCancel() {
  showCustomInput.value = false
  customValue.value = ''
}
</script>

<template>
  <div class="select-input">
    <el-select
      v-if="!showCustomInput"
      v-model="inputValue"
      :placeholder="placeholder"
      :disabled="disabled"
      filterable
      clearable
      @change="handleSelectChange"
    >
      <el-option
        v-for="option in normalizedOptions"
        :key="option.value"
        :label="option.label"
        :value="option.value"
      />
      <el-option
        v-if="allowCustom"
        value="__custom__"
        label="+ Add custom value"
      />
    </el-select>
    
    <!-- Custom value input -->
    <div v-else class="custom-input">
      <el-input
        v-model="customValue"
        placeholder="Enter custom value"
        @keyup.enter="handleCustomConfirm"
      >
        <template #append>
          <el-button type="primary" @click="handleCustomConfirm">
            <Icon name="lucide:check" />
          </el-button>
          <el-button @click="handleCustomCancel">
            <Icon name="lucide:x" />
          </el-button>
        </template>
      </el-input>
    </div>
  </div>
</template>

<style scoped>
.select-input {
  width: 100%;
}

.custom-input {
  width: 100%;
}
</style>

