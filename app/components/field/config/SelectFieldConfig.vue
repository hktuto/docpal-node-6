<script setup lang="ts">
interface SelectOption {
  label: string
  value: string
  color: string
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
  get: () => props.modelValue || { options: [], placeholder: '', allowCustom: false },
  set: (val) => emit('update:modelValue', val)
})

// Options management
const options = ref<SelectOption[]>([])

// Initialize from config
watch(() => config.value.options, (newOptions) => {
  if (newOptions && Array.isArray(newOptions)) {
    options.value = newOptions.map((opt: any) => ({
      label: typeof opt === 'string' ? opt : (opt.label || ''),
      value: typeof opt === 'string' ? opt.toLowerCase().replace(/\s+/g, '_') : (opt.value || opt.label?.toLowerCase().replace(/\s+/g, '_') || ''),
      color: opt.color || '#409EFF'
    }))
  } else if (options.value.length === 0) {
    // Start with one empty option for better UX
    options.value = [{
      label: '',
      value: '',
      color: '#409EFF'
    }]
  }
}, { immediate: true })

// Add new option
function addOption() {
  options.value.push({
    label: '',
    value: '',
    color: '#409EFF'
  })
}

// Remove option
function removeOption(index: number) {
  options.value.splice(index, 1)
  updateConfig()
}

// Update config when options change
function updateConfig() {
  const validOptions = options.value
    .filter(opt => opt.label.trim()) // Only keep options with labels
    .map(opt => ({
      label: opt.label.trim(),
      value: opt.value || opt.label.toLowerCase().replace(/\s+/g, '_'), // Auto-generate value from label
      color: opt.color
    }))
  
  config.value = {
    ...config.value,
    options: validOptions
  }
}

// Generate value from label and update config
function handleLabelChange(index: number) {
  const option = options.value[index]
  if (option.label) {
    // Auto-generate value from label
    option.value = option.label.toLowerCase().replace(/\s+/g, '_')
  }
  updateConfig()
}

// Drag and drop for reordering
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function handleDragStart(index: number) {
  draggedIndex.value = index
}

function handleDragOver(e: DragEvent, index: number) {
  e.preventDefault()
  dragOverIndex.value = index
}

function handleDragLeave() {
  dragOverIndex.value = null
}

function handleDrop(e: DragEvent, dropIndex: number) {
  e.preventDefault()
  
  if (draggedIndex.value === null || draggedIndex.value === dropIndex) {
    draggedIndex.value = null
    dragOverIndex.value = null
    return
  }
  
  // Reorder the options array
  const draggedOption = options.value[draggedIndex.value]
  options.value.splice(draggedIndex.value, 1)
  options.value.splice(dropIndex, 0, draggedOption)
  
  // Reset drag state and update config
  draggedIndex.value = null
  dragOverIndex.value = null
  updateConfig()
}

function handleDragEnd() {
  draggedIndex.value = null
  dragOverIndex.value = null
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
          :class="{
            'dragging': draggedIndex === index,
            'drag-over': dragOverIndex === index
          }"
          draggable="true"
          @dragstart="handleDragStart(index)"
          @dragover="handleDragOver($event, index)"
          @dragleave="handleDragLeave"
          @drop="handleDrop($event, index)"
          @dragend="handleDragEnd"
        >
          <!-- Drag Handle -->
          <div class="drag-handle">
            <Icon name="lucide:grip-vertical" size="16" />
          </div>
          
          <el-input
            v-model="option.label"
            placeholder="Option label (e.g., High Priority)"
            style="flex: 1"
            @input="handleLabelChange(index)"
          >
            <template #prefix>
              <Icon name="lucide:tag" size="16" />
            </template>
          </el-input>
          
          <el-color-picker
            v-model="option.color"
            @change="updateConfig"
          />
          
          <el-button
            type="danger"
            circle
            size="small"
            @click="removeOption(index)"
          >
            <Icon name="lucide:trash-2" size="16" />
          </el-button>
        </div>
        
        <el-button
          type="primary"
          text
          style="margin-top: 8px"
          @click="addOption"
        >
          <Icon name="lucide:plus" size="16" style="margin-right: 4px" />
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
      <div style="display: flex; align-items: center; gap: 8px;">
        <el-switch v-model="config.allowCustom" />
        <span style="font-size: 12px; color: var(--el-text-color-secondary)">
          Let users add their own values
        </span>
      </div>
    </el-form-item>
    
    <!-- Max Selections (multi-select only) -->
    <el-form-item v-if="fieldType === 'multi_select'" label="Max Selections">
      <el-input-number
        v-model="config.maxSelections"
        :min="1"
        :max="100"
        :controls="true"
        placeholder="Unlimited"
        style="width: 100%"
      />
      <template #extra>
        <span class="form-tip">Leave empty for unlimited selections</span>
      </template>
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
  padding: 8px;
  border-radius: 6px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  transition: all 0.2s ease;
  cursor: move;
}

.option-row:hover {
  border-color: var(--el-color-primary);
  background: var(--el-fill-color-light);
}

.option-row.dragging {
  opacity: 0.5;
  transform: scale(0.98);
}

.option-row.drag-over {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-style: dashed;
  border-width: 2px;
}

.drag-handle {
  display: flex;
  align-items: center;
  color: var(--el-text-color-secondary);
  cursor: grab;
  padding: 4px;
}

.drag-handle:active {
  cursor: grabbing;
}

.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>

