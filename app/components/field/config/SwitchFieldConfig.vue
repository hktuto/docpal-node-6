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

// Initialize defaults
onMounted(() => {
  if (!config.value.trueLabel) {
    config.value = {
      ...config.value,
      trueLabel: 'On',
      falseLabel: 'Off'
    }
  }
})
</script>

<template>
  <div class="switch-field-config">
    <!-- True Label -->
    <el-form-item label="True Label">
      <el-input
        v-model="config.trueLabel"
        placeholder="On"
      />
    </el-form-item>
    
    <!-- False Label -->
    <el-form-item label="False Label">
      <el-input
        v-model="config.falseLabel"
        placeholder="Off"
      />
    </el-form-item>
    
    <!-- Default Value -->
    <el-form-item label="Default Value">
      <el-switch
        v-model="config.defaultValue"
        :active-text="config.trueLabel || 'On'"
        :inactive-text="config.falseLabel || 'Off'"
      />
    </el-form-item>
  </div>
</template>

