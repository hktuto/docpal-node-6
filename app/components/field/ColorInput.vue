<script setup lang="ts">
import { validateColor } from '#shared/utils/validators'

interface Props {
  modelValue: string | null | undefined
  format?: 'hex' | 'rgb' | 'hsl'
  allowAlpha?: boolean
  showPresets?: boolean
  presetColors?: string[]
  placeholder?: string
  disabled?: boolean
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  format: 'hex',
  allowAlpha: true,
  showPresets: true,
  presetColors: () => [
    '#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF3',
    '#FFD700', '#FF69B4', '#8A2BE2', '#00CED1', '#FF4500'
  ],
  placeholder: 'Select a color',
  disabled: false,
  required: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
}>()

const colorValue = computed({
  get: () => props.modelValue || '#409EFF',
  set: (val) => emit('update:modelValue', val || null)
})

const errorMessage = ref('')

function handleChange(value: string) {
  // Validate color
  const result = validateColor(value, { format: props.format })
  
  if (!result.valid) {
    errorMessage.value = result.error || 'Invalid color'
    return
  }
  
  errorMessage.value = ''
  colorValue.value = value
}

function selectPreset(color: string) {
  handleChange(color)
}

function clearColor() {
  emit('update:modelValue', null)
}
</script>

<template>
  <div class="color-input">
    <div class="color-input-container">
      <div class="color-picker-wrapper">
        <el-color-picker
          :model-value="colorValue"
          :show-alpha="allowAlpha"
          :predefine="showPresets ? presetColors : undefined"
          :disabled="disabled"
          @change="handleChange"
        />
        
        <div class="color-display">
          <div 
            class="color-swatch" 
            :style="{ backgroundColor: colorValue }"
          />
          <span class="color-value">{{ colorValue }}</span>
        </div>
      </div>
      
      <button
        v-if="modelValue && !disabled"
        type="button"
        class="clear-button"
        @click="clearColor"
      >
        <Icon name="lucide:x" size="14" />
      </button>
    </div>
    
    <!-- Preset Colors (if enabled) -->
    <div v-if="showPresets && !disabled" class="preset-colors">
      <button
        v-for="color in presetColors"
        :key="color"
        type="button"
        class="preset-color"
        :class="{ active: colorValue === color }"
        :style="{ backgroundColor: color }"
        :title="color"
        @click="selectPreset(color)"
      >
        <Icon 
          v-if="colorValue === color"
          name="lucide:check" 
          size="12" 
          style="color: white; filter: drop-shadow(0 0 2px rgba(0,0,0,0.5))"
        />
      </button>
    </div>
    
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<style scoped>
.color-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.color-input-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 6px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  transition: border-color 0.2s ease;
}

.color-input-container:hover:not(:has(.clear-button:hover)) {
  border-color: var(--el-color-primary);
}

.color-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.color-display {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 2px solid var(--el-border-color);
  transition: transform 0.2s ease;
}

.color-swatch:hover {
  transform: scale(1.1);
}

.color-value {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 14px;
  color: var(--el-text-color-primary);
  user-select: all;
}

.clear-button {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--el-text-color-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.clear-button:hover {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
}

.preset-colors {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.preset-color {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.preset-color:hover {
  transform: scale(1.15);
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.preset-color.active {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 3px var(--el-color-primary-light-9);
}

.error-message {
  font-size: 12px;
  color: var(--el-color-danger);
  margin-top: 4px;
}

:deep(.el-color-picker) {
  height: auto;
}

:deep(.el-color-picker__trigger) {
  width: 48px;
  height: 48px;
  border: 2px solid var(--el-border-color);
  transition: all 0.2s ease;
}

:deep(.el-color-picker__trigger:hover) {
  border-color: var(--el-color-primary);
}
</style>

