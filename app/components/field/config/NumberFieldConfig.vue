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
  <div class="number-field-config">
    <!-- Allow Decimals -->
    <el-form-item label="Allow Decimals">
      <el-switch v-model="config.decimal" />
    </el-form-item>
    
    <!-- Minimum Value -->
    <el-form-item label="Minimum Value">
      <el-input-number
        v-model="config.min"
        :controls="false"
        placeholder="No minimum"
        style="width: 100%"
      />
    </el-form-item>
    
    <!-- Maximum Value -->
    <el-form-item label="Maximum Value">
      <el-input-number
        v-model="config.max"
        :controls="false"
        placeholder="No maximum"
        style="width: 100%"
      />
    </el-form-item>
    
    <!-- Placeholder -->
    <el-form-item label="Placeholder">
      <el-input
        v-model="config.placeholder"
        placeholder="Enter a number"
      />
    </el-form-item>
  </div>
</template>

