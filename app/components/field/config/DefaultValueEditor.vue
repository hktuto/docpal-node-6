<script setup lang="ts">
interface Props {
  modelValue: any
  fieldType: string
  fieldConfig: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>()

const enabled = ref(false)
const showEditor = ref(false)
const defaultValue = ref<any>(null)

// Initialize from modelValue
watch(() => props.modelValue, (newValue) => {
  if (newValue !== undefined && newValue !== null) {
    enabled.value = true
    defaultValue.value = newValue
  } else {
    enabled.value = false
    defaultValue.value = null
  }
}, { immediate: true })

// Update parent when enabled changes
watch(enabled, (isEnabled) => {
  if (isEnabled && !defaultValue.value) {
    // Set a default based on field type
    if (props.fieldType === 'geolocation') {
      defaultValue.value = {
        lat: props.fieldConfig.defaultCenter?.lat || 37.7749,
        lng: props.fieldConfig.defaultCenter?.lng || -122.4194,
        address: 'San Francisco, CA, USA'
      }
    }
    updateParent()
  } else if (!isEnabled) {
    defaultValue.value = null
    updateParent()
  }
})

// Update parent when value changes
watch(defaultValue, () => {
  if (enabled.value) {
    updateParent()
  }
}, { deep: true })

function updateParent() {
  emit('update:modelValue', enabled.value ? defaultValue.value : undefined)
}
</script>

<template>
  <el-form-item label="Default Value">
    <div class="default-value-editor">
      <div class="toggle-row">
        <el-switch v-model="enabled" />
        <span class="description">
          Pre-fill this value for new records
        </span>
      </div>
      
      <div v-if="enabled" class="editor-section">
        <el-button
          type="primary"
          text
          @click="showEditor = !showEditor"
        >
          <Icon 
            :name="showEditor ? 'lucide:chevron-up' : 'lucide:chevron-down'" 
            size="16" 
          />
          {{ showEditor ? 'Hide' : 'Edit' }} Default Value
        </el-button>
        
        <!-- Geolocation Editor -->
        <div v-if="showEditor && fieldType === 'geolocation'" class="field-editor">
          <div class="editor-hint">
            <Icon name="lucide:info" size="14" />
            <span>Type an address in the input below or click on the map to set location</span>
          </div>
          <FieldGeolocationInput
            v-model:locationValue="defaultValue"
            v-bind="fieldConfig"
            :default-map-open="true"
          />
        </div>
        
        <!-- Preview when collapsed -->
        <div v-else-if="!showEditor && defaultValue" class="value-preview">
          <template v-if="fieldType === 'geolocation'">
            <Icon name="lucide:map-pin" size="16" />
            <div class="preview-content">
              <div class="preview-main">{{ defaultValue.address || 'No address' }}</div>
              <div class="preview-sub">
                {{ defaultValue.lat.toFixed(6) }}, {{ defaultValue.lng.toFixed(6) }}
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
    <template #extra>
      <span class="form-tip">New records will have this value pre-filled</span>
    </template>
  </el-form-item>
</template>

<style scoped>
.default-value-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.description {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.editor-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
}

.field-editor {
  padding: 12px;
  background: var(--el-bg-color);
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
}

.value-preview {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: var(--el-bg-color);
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.preview-main {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.preview-sub {
  font-size: 12px;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  color: var(--el-text-color-secondary);
}

.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.editor-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--el-color-info-light-9);
  border-left: 3px solid var(--el-color-info);
  border-radius: 4px;
  font-size: 12px;
  color: var(--el-text-color-primary);
  margin-bottom: 12px;
}
</style>

