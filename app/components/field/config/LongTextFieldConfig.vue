<script setup lang="ts">
interface Props {
  modelValue: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>()

const config = computed({
  get: () => props.modelValue || {},
  set: (val) => emit('update:modelValue', val)
})
</script>

<template>
  <div class="long-text-field-config">
    <!-- Visible Rows -->
    <el-form-item label="Visible Rows">
      <el-input-number
        v-model="config.rows"
        :min="2"
        :max="20"
        :step="1"
        placeholder="4"
      />
      <span class="hint">Number of rows to display in textarea</span>
    </el-form-item>
    
    <!-- Placeholder -->
    <el-form-item label="Placeholder">
      <el-input
        v-model="config.placeholder"
        type="textarea"
        :rows="2"
        placeholder="Enter placeholder text"
      />
    </el-form-item>
  </div>
</template>

<style scoped>
.hint {
  margin-left: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>

