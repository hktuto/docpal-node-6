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
    maxStars: 5,
    allowHalf: false,
    showNumber: true,
    color: '#fadb14',
    placeholder: 'Select rating'
  },
  set: (val) => emit('update:modelValue', val)
})

const maxStarsOptions = [
  { label: '5 Stars (⭐⭐⭐⭐⭐)', value: 5 },
  { label: '10 Stars (⭐×10)', value: 10 }
]

const popularColors = [
  { label: 'Gold', value: '#fadb14' },
  { label: 'Orange', value: '#fa8c16' },
  { label: 'Red', value: '#f5222d' },
  { label: 'Blue', value: '#1890ff' },
  { label: 'Green', value: '#52c41a' },
  { label: 'Purple', value: '#722ed1' }
]
</script>

<template>
  <div class="rating-field-config">
    <!-- Max Stars -->
    <el-form-item label="Max Stars">
      <el-select
        v-model="config.maxStars"
        placeholder="Select max stars"
        style="width: 100%"
      >
        <el-option
          v-for="item in maxStarsOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <template #extra>
        <span class="form-tip">Maximum rating value (5 or 10)</span>
      </template>
    </el-form-item>
    
    <!-- Allow Half Stars -->
    <el-form-item label="Allow Half Stars">
      <div style="display: flex; align-items: center; gap: 8px;">
        <el-switch v-model="config.allowHalf" />
        <span style="font-size: 12px; color: var(--el-text-color-secondary)">
          Enable 0.5 increments (e.g., 4.5 stars)
        </span>
      </div>
    </el-form-item>
    
    <!-- Show Number -->
    <el-form-item label="Show Number">
      <div style="display: flex; align-items: center; gap: 8px;">
        <el-switch v-model="config.showNumber" />
        <span style="font-size: 12px; color: var(--el-text-color-secondary)">
          Display numeric value alongside stars (e.g., "4 / 5")
        </span>
      </div>
    </el-form-item>
    
    <!-- Star Color -->
    <el-form-item label="Star Color">
      <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
        <el-color-picker
          v-model="config.color"
          show-alpha
          :predefine="popularColors.map(c => c.value)"
        />
        
        <!-- Quick color buttons -->
        <div style="display: flex; gap: 4px;">
          <button
            v-for="color in popularColors"
            :key="color.value"
            type="button"
            class="color-button"
            :style="{ backgroundColor: color.value }"
            :title="color.label"
            @click="config.color = color.value"
          >
            <Icon 
              v-if="config.color === color.value"
              name="lucide:check" 
              size="12" 
              style="color: white"
            />
          </button>
        </div>
      </div>
      <template #extra>
        <span class="form-tip">Color for filled stars</span>
      </template>
    </el-form-item>
    
    <!-- Placeholder -->
    <el-form-item label="Placeholder">
      <el-input
        v-model="config.placeholder"
        placeholder="Select rating"
      />
      <template #extra>
        <span class="form-tip">Text shown when no rating is selected</span>
      </template>
    </el-form-item>
    
    <!-- Preview -->
    <el-form-item label="Preview">
      <div class="preview-section">
        <FieldRatingInput
          :model-value="3"
          :max-stars="config.maxStars"
          :allow-half="config.allowHalf"
          :show-number="config.showNumber"
          :color="config.color"
          :placeholder="config.placeholder"
          :disabled="true"
        />
        <span style="font-size: 12px; color: var(--el-text-color-secondary)">
          Preview with rating of 3
        </span>
      </div>
    </el-form-item>
  </div>
</template>

<style scoped>
.rating-field-config {
  width: 100%;
}

.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.color-button {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 2px solid var(--el-border-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.color-button:hover {
  transform: scale(1.1);
  border-color: var(--el-color-primary);
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

