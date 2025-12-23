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
    symbol: '$',
    position: 'before',
    decimalPlaces: 2,
    compactDisplay: false,
    compactThreshold: 10000
  },
  set: (val) => emit('update:modelValue', val)
})

const currencySymbols = [
  { label: '$ Dollar', value: '$' },
  { label: '€ Euro', value: '€' },
  { label: '£ Pound', value: '£' },
  { label: '¥ Yen', value: '¥' },
  { label: '₹ Rupee', value: '₹' },
  { label: '₽ Ruble', value: '₽' }
]

const symbolPositions = [
  { label: 'Before ($100)', value: 'before' },
  { label: 'After (100€)', value: 'after' }
]

// Removed decimalOptions - using number input instead
</script>

<template>
  <div class="currency-field-config">
    <!-- Currency Symbol -->
    <el-form-item label="Currency Symbol">
      <el-select
        v-model="config.symbol"
        placeholder="Select symbol"
        style="width: 100%"
      >
        <el-option
          v-for="item in currencySymbols"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </el-form-item>
    
    <!-- Symbol Position -->
    <el-form-item label="Symbol Position">
      <el-select
        v-model="config.position"
        placeholder="Select position"
        style="width: 100%"
      >
        <el-option
          v-for="item in symbolPositions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </el-form-item>
    
    <!-- Decimal Places -->
    <el-form-item label="Decimal Places">
      <el-input-number
        v-model="config.decimalPlaces"
        :min="0"
        :max="10"
        :controls="true"
        placeholder="2"
        style="width: 100%"
      />
      <template #extra>
        <span class="form-tip">Number of decimal places (0-10)</span>
      </template>
    </el-form-item>
    
    <!-- Compact Display -->
    <el-form-item label="Compact Display">
      <div style="display: flex; align-items: center; gap: 8px;">
        <el-switch v-model="config.compactDisplay" />
        <span style="font-size: 12px; color: var(--el-text-color-secondary)">
          Display large numbers as 1.2K, 1.5M, 2.3B, etc.
        </span>
      </div>
    </el-form-item>
    
    <!-- Compact Threshold -->
    <el-form-item v-if="config.compactDisplay" label="Compact Threshold">
      <el-input-number
        v-model="config.compactThreshold"
        :min="1000"
        :step="1000"
        :controls="false"
        placeholder="10000"
        style="width: 100%"
      />
      <template #extra>
        <span class="form-tip">Start compact display at this value</span>
      </template>
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
        placeholder="0.00"
      />
    </el-form-item>
  </div>
</template>

<style scoped>
.currency-field-config {
  width: 100%;
}

.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>

