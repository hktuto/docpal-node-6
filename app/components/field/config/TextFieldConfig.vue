<script setup lang="ts">
interface Props {
  modelValue: any
  fieldType: 'text' | 'email' | 'phone' | 'url'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>()

const config = computed({
  get: () => props.modelValue || {},
  set: (val) => emit('update:modelValue', val)
})

// Initialize defaults based on schema
onMounted(() => {
  if (!config.value.maxLength && props.fieldType === 'text') {
    config.value = { ...config.value, maxLength: 255 }
  }
})
</script>

<template>
  <div class="text-field-config">
    <!-- Max Length (text only) -->
    <el-form-item v-if="fieldType === 'text'" label="Max Length">
      <el-input-number
        v-model="config.maxLength"
        :min="1"
        :max="65535"
        :step="1"
        placeholder="255"
      />
    </el-form-item>
    
    <!-- Placeholder -->
    <el-form-item label="Placeholder">
      <el-input
        v-model="config.placeholder"
        placeholder="Enter placeholder text"
      />
    </el-form-item>
    
    <!-- Email specific -->
    <el-form-item v-if="fieldType === 'email'" label="Allow Multiple Emails">
      <el-switch v-model="config.allowMultiple" />
      <span class="hint">Allow comma-separated email addresses</span>
    </el-form-item>
    
    <!-- Phone specific -->
    <el-form-item v-if="fieldType === 'phone'" label="Phone Format">
      <el-select v-model="config.format" placeholder="Select format">
        <el-option label="International" value="international" />
        <el-option label="US Format" value="us" />
        <el-option label="UK Format" value="uk" />
        <el-option label="Custom" value="custom" />
      </el-select>
    </el-form-item>
    
    <!-- URL specific -->
    <template v-if="fieldType === 'url'">
      <el-form-item label="URL Options">
        <el-checkbox v-model="config.openInNewTab">
          Open links in new tab
        </el-checkbox>
        <el-checkbox v-model="config.requireHttps">
          Require HTTPS only
        </el-checkbox>
      </el-form-item>
    </template>
  </div>
</template>

<style scoped>
.hint {
  margin-left: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>

