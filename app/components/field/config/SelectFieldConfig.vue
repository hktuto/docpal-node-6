<script setup lang="ts">
interface SelectOption {
  label: string
  value: string
  color?: string
}

interface Props {
  modelValue: any
  fieldType: 'select' | 'multi_select'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>()

const config = computed({
  get: () => props.modelValue || {},
  set: (val) => emit('update:modelValue', val)
})

// Options management
const options = ref<SelectOption[]>([])

// Initialize from config
watch(() => config.value.options, (newOptions) => {
  if (newOptions && Array.isArray(newOptions)) {
    options.value = newOptions.map((opt: any) => ({
      label: opt.label || opt,
      value: opt.value || opt,
      color: opt.color || '#409EFF'
    }))
  }
}, { immediate: true })

// Add new option
function addOption() {
  options.value.push({
    label: '',
    value: '',
    color: '#409EFF'
  })
  updateConfig()
}

// Remove option
function removeOption(index: number) {
  options.value.splice(index, 1)
  updateConfig()
}

// Update config when options change
function updateConfig() {
  config.value = {
    ...config.value,
    options: options.value.filter(opt => opt.label && opt.value)
  }
}

// Generate value from label
function handleLabelChange(index: number) {
  const option = options.value[index]
  if (option.label && !option.value) {
    option.value = option.label.toLowerCase().replace(/\s+/g, '_')
  }
  updateConfig()
}
</script>

<template>
  <div class="select-field-config">
    <!-- Options List -->
    <el-form-item label="Options" required>
      <div class="options-list">
        <div
          v-for="(option, index) in options"
          :key="index"
          class="option-row"
        >
          <el-input
            v-model="option.label"
            placeholder="Label"
            style="flex: 1"
            @input="handleLabelChange(index)"
          />
          <el-input
            v-model="option.value"
            placeholder="Value"
            style="flex: 1"
          />
          <el-color-picker
            v-model="option.color"
            @change="updateConfig"
          />
          <el-button
            type="danger"
            :icon="'Delete'"
            circle
            size="small"
            @click="removeOption(index)"
          />
        </div>
        
        <el-button
          type="primary"
          text
          :icon="'Plus'"
          @click="addOption"
        >
          Add Option
        </el-button>
      </div>
    </el-form-item>
    
    <!-- Placeholder -->
    <el-form-item label="Placeholder">
      <el-input
        v-model="config.placeholder"
        :placeholder="fieldType === 'multi_select' ? 'Select options' : 'Select an option'"
      />
    </el-form-item>
    
    <!-- Allow Custom -->
    <el-form-item label="Allow Custom Values">
      <el-switch v-model="config.allowCustom" />
      <span class="hint">Let users add their own values</span>
    </el-form-item>
    
    <!-- Max Selections (multi-select only) -->
    <el-form-item v-if="fieldType === 'multi_select'" label="Max Selections">
      <el-input-number
        v-model="config.maxSelections"
        :min="1"
        :max="100"
        placeholder="Unlimited"
      />
      <span class="hint">Leave empty for unlimited</span>
    </el-form-item>
  </div>
</template>

<style scoped>
.options-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.hint {
  margin-left: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>

