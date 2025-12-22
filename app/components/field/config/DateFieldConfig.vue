<script setup lang="ts">
interface Props {
  modelValue: any
  fieldType: 'date' | 'datetime'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>()

const config = computed({
  get: () => props.modelValue || {},
  set: (val) => emit('update:modelValue', val)
})

// Date format type options based on schema
const dateFormatTypes = [
  { label: 'Date Only', value: 'date' },
  { label: 'Date & Time', value: 'datetime' },
  { label: 'Time Only', value: 'time' }
]

// Initialize defaults
onMounted(() => {
  if (!config.value.dateFormatType) {
    config.value = {
      ...config.value,
      dateFormatType: props.fieldType === 'datetime' ? 'datetime' : 'date',
      dateFormatString: props.fieldType === 'datetime' ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD'
    }
  }
})
</script>

<template>
  <div class="date-field-config">
    <!-- Date Format Type -->
    <el-form-item label="Format Type">
      <el-select v-model="config.dateFormatType" placeholder="Select format type">
        <el-option
          v-for="type in dateFormatTypes"
          :key="type.value"
          :label="type.label"
          :value="type.value"
        />
      </el-select>
    </el-form-item>
    
    <!-- Date Format String -->
    <el-form-item label="Format String">
      <el-input
        v-model="config.dateFormatString"
        placeholder="YYYY-MM-DD HH:mm:ss"
      />
      <div class="hint">
        Examples: YYYY-MM-DD, YYYY-MM-DD HH:mm:ss, HH:mm:ss
      </div>
    </el-form-item>
    
    <!-- Date Restrictions -->
    <el-form-item label="Date Restrictions">
      <el-checkbox v-model="config.disablePast">
        Disable past dates
      </el-checkbox>
      <el-checkbox v-model="config.disableFuture">
        Disable future dates
      </el-checkbox>
    </el-form-item>
  </div>
</template>

<style scoped>
.hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>

