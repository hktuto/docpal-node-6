<script setup lang="ts">
interface Props {
  fieldType: string
  fieldConfig: any
  defaultValue?: any
}

const props = defineProps<Props>()
</script>

<template>
  <el-form-item label="Preview">
    <div class="field-preview">
      <!-- Geolocation Preview -->
      <template v-if="fieldType === 'geolocation'">
        <FieldGeolocationInput
          :location-value="defaultValue"
          v-bind="fieldConfig"
          :default-map-open="true"
          :disabled="false"
        />
      </template>
      
      <!-- Currency Preview -->
      <template v-else-if="fieldType === 'currency'">
        <FieldCurrencyInput
          :model-value="defaultValue || 1234.56"
          v-bind="fieldConfig"
          :disabled="true"
        />
      </template>
      
      <!-- Rating Preview -->
      <template v-else-if="fieldType === 'rating'">
        <FieldRatingInput
          :model-value="defaultValue || 3"
          v-bind="fieldConfig"
          :disabled="true"
        />
      </template>
      
      <!-- Color Preview -->
      <template v-else-if="fieldType === 'color'">
        <FieldColorInput
          :model-value="defaultValue || '#409EFF'"
          v-bind="fieldConfig"
          :disabled="true"
        />
      </template>
      
      <!-- Email Preview -->
      <template v-else-if="fieldType === 'email'">
        <FieldEmailInput
          :model-value="defaultValue || 'example@email.com'"
          v-bind="fieldConfig"
          :disabled="true"
        />
      </template>
      
      <!-- Phone Preview -->
      <template v-else-if="fieldType === 'phone'">
        <FieldPhoneInput
          :model-value="defaultValue || '+1 (555) 123-4567'"
          v-bind="fieldConfig"
          :disabled="true"
        />
      </template>
      
      <!-- URL Preview -->
      <template v-else-if="fieldType === 'url'">
        <FieldUrlInput
          :model-value="defaultValue || 'https://example.com'"
          v-bind="fieldConfig"
          :disabled="true"
        />
      </template>
      
      <!-- Select Preview -->
      <template v-else-if="fieldType === 'select'">
        <FieldSelectInput
          :model-value="defaultValue"
          v-bind="fieldConfig"
          :disabled="true"
        />
      </template>
      
      <!-- Multi-Select Preview -->
      <template v-else-if="fieldType === 'multi_select'">
        <FieldMultiSelectInput
          :model-value="defaultValue"
          v-bind="fieldConfig"
          :disabled="true"
        />
      </template>
      
      <div class="preview-info">
        <div class="preview-label">
          Preview of {{ fieldType }} field {{ defaultValue ? 'with default value' : '(empty state)' }}
        </div>
        <el-alert
          v-if="fieldType === 'geolocation'"
          type="info"
          :closable="false"
          style="margin-top: 8px;"
        >
          <template #title>
            <span style="font-size: 12px;">💡 Preview is read-only</span>
          </template>
          <div style="font-size: 12px; line-height: 1.5;">
            To test the interactive features:
            <ol style="margin: 4px 0 0 16px; padding: 0;">
              <li>Toggle "Default Value" switch above</li>
              <li>Click "Edit Default Value"</li>
              <li>Type address in the input field for search</li>
              <li>Or click on the map to set location</li>
            </ol>
          </div>
        </el-alert>
      </div>
    </div>
  </el-form-item>
</template>

<style scoped>
.field-preview {
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.preview-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.preview-info {
  width: 100%;
}
</style>

