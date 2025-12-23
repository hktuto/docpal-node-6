<script setup lang="ts">
interface Props {
  modelValue: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>()

const config = computed({
  get: () => props.modelValue || {
    format: 'hex',
    allowAlpha: true,
    showPresets: true,
    presetColors: [
      '#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF3',
      '#FFD700', '#FF69B4', '#8A2BE2', '#00CED1', '#FF4500'
    ],
    placeholder: 'Select a color'
  },
  set: (val) => emit('update:modelValue', val)
})

const formatOptions = [
  { label: 'Hex (#FF5733)', value: 'hex' },
  { label: 'RGB (rgb(255,87,51))', value: 'rgb' },
  { label: 'HSL (hsl(9,100%,60%))', value: 'hsl' }
]

// Manage preset colors
const presetColors = ref<string[]>([])

// Initialize preset colors from config
watch(() => config.value.presetColors, (newColors) => {
  if (newColors && Array.isArray(newColors)) {
    presetColors.value = [...newColors]
  } else {
    presetColors.value = [
      '#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF3',
      '#FFD700', '#FF69B4', '#8A2BE2', '#00CED1', '#FF4500'
    ]
  }
}, { immediate: true })

function addPresetColor() {
  presetColors.value.push('#409EFF')
  updateConfig()
}

function removePresetColor(index: number) {
  presetColors.value.splice(index, 1)
  updateConfig()
}

function updatePresetColor(index: number, color: string) {
  presetColors.value[index] = color
  updateConfig()
}

function updateConfig() {
  config.value = {
    ...config.value,
    presetColors: [...presetColors.value]
  }
}
</script>

<template>
  <div class="color-field-config">
    <!-- Color Format -->
    <el-form-item label="Color Format">
      <el-select
        v-model="config.format"
        placeholder="Select format"
        style="width: 100%"
      >
        <el-option
          v-for="item in formatOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <template #extra>
        <span class="form-tip">How the color value will be stored</span>
      </template>
    </el-form-item>
    
    <!-- Allow Transparency -->
    <el-form-item label="Allow Transparency">
      <div style="display: flex; align-items: center; gap: 8px;">
        <el-switch v-model="config.allowAlpha" />
        <span style="font-size: 12px; color: var(--el-text-color-secondary)">
          Enable alpha channel for transparency
        </span>
      </div>
    </el-form-item>
    
    <!-- Show Presets -->
    <el-form-item label="Show Preset Colors">
      <div style="display: flex; align-items: center; gap: 8px;">
        <el-switch v-model="config.showPresets" />
        <span style="font-size: 12px; color: var(--el-text-color-secondary)">
          Display quick color presets for easy selection
        </span>
      </div>
    </el-form-item>
    
    <!-- Preset Colors Editor -->
    <el-form-item v-if="config.showPresets" label="Preset Colors">
      <div class="preset-colors-editor">
        <div
          v-for="(color, index) in presetColors"
          :key="index"
          class="preset-row"
        >
          <el-color-picker
            :model-value="color"
            :show-alpha="config.allowAlpha"
            @change="updatePresetColor(index, $event)"
          />
          
          <el-input
            :model-value="color"
            placeholder="#FF5733"
            style="flex: 1"
            @input="updatePresetColor(index, $event)"
          >
            <template #prefix>
              <Icon name="lucide:palette" size="16" />
            </template>
          </el-input>
          
          <el-button
            type="danger"
            circle
            size="small"
            @click="removePresetColor(index)"
          >
            <Icon name="lucide:trash-2" size="16" />
          </el-button>
        </div>
        
        <el-button
          type="primary"
          text
          style="margin-top: 8px"
          @click="addPresetColor"
        >
          <Icon name="lucide:plus" size="16" style="margin-right: 4px" />
          Add Preset Color
        </el-button>
      </div>
      <template #extra>
        <span class="form-tip">Quick color options shown to users</span>
      </template>
    </el-form-item>
    
    <!-- Placeholder -->
    <el-form-item label="Placeholder">
      <el-input
        v-model="config.placeholder"
        placeholder="Select a color"
      />
      <template #extra>
        <span class="form-tip">Text shown when no color is selected</span>
      </template>
    </el-form-item>
    
    <!-- Preview -->
    <el-form-item label="Preview">
      <div class="preview-section">
        <FieldColorInput
          :model-value="'#409EFF'"
          :format="config.format"
          :allow-alpha="config.allowAlpha"
          :show-presets="config.showPresets"
          :preset-colors="presetColors"
          :placeholder="config.placeholder"
          :disabled="true"
        />
        <span style="font-size: 12px; color: var(--el-text-color-secondary)">
          Preview of color picker
        </span>
      </div>
    </el-form-item>
  </div>
</template>

<style scoped>
.color-field-config {
  width: 100%;
}

.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.preset-colors-editor {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preset-row {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px;
  background: var(--el-bg-color);
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
  transition: all 0.2s ease;
}

.preset-row:hover {
  border-color: var(--el-color-primary);
  background: var(--el-fill-color-light);
}

.preview-section {
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>

