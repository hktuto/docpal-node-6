<script setup lang="ts">
interface Props {
  modelValue: number | null | undefined
  maxStars?: number
  allowHalf?: boolean
  showNumber?: boolean
  color?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maxStars: 5,
  allowHalf: false,
  showNumber: true,
  color: '#fadb14',
  placeholder: 'Select rating',
  disabled: false,
  required: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void
}>()

const hoveredStar = ref<number | null>(null)
const errorMessage = ref('')

// Current displayed value (either actual value or hovered value)
const displayValue = computed(() => {
  if (hoveredStar.value !== null) {
    return hoveredStar.value
  }
  return props.modelValue || 0
})

function handleStarClick(starIndex: number) {
  if (props.disabled) return
  
  const value = starIndex
  
  // Validate
  if (value < 1 || value > props.maxStars) {
    errorMessage.value = `Rating must be between 1 and ${props.maxStars}`
    return
  }
  
  errorMessage.value = ''
  emit('update:modelValue', value)
}

function handleStarHover(starIndex: number) {
  if (props.disabled) return
  hoveredStar.value = starIndex
}

function handleMouseLeave() {
  hoveredStar.value = null
}

function clearRating() {
  if (props.disabled) return
  emit('update:modelValue', null)
}

// Determine if a star should be filled, half-filled, or empty
function getStarState(starIndex: number): 'full' | 'half' | 'empty' {
  const value = displayValue.value
  
  if (starIndex <= value) {
    return 'full'
  } else if (props.allowHalf && starIndex - 0.5 === value) {
    return 'half'
  } else {
    return 'empty'
  }
}

// Generate array of star indices
const stars = computed(() => {
  return Array.from({ length: props.maxStars }, (_, i) => i + 1)
})
</script>

<template>
  <div class="rating-input">
    <div class="rating-container" :class="{ disabled }">
      <div class="stars-wrapper" @mouseleave="handleMouseLeave">
        <button
          v-for="star in stars"
          :key="star"
          type="button"
          class="star-button"
          :class="{ 
            filled: getStarState(star) === 'full',
            half: getStarState(star) === 'half',
            empty: getStarState(star) === 'empty',
            hovered: hoveredStar !== null
          }"
          :disabled="disabled"
          @click="handleStarClick(star)"
          @mouseenter="handleStarHover(star)"
        >
          <Icon 
            v-if="getStarState(star) === 'full'"
            name="lucide:star" 
            :style="{ color: color }"
            size="20"
            class="star-icon"
          />
          <Icon 
            v-else-if="getStarState(star) === 'half'"
            name="lucide:star-half" 
            :style="{ color: color }"
            size="20"
            class="star-icon"
          />
          <Icon 
            v-else
            name="lucide:star" 
            size="20"
            class="star-icon star-empty"
          />
        </button>
      </div>
      
      <span v-if="showNumber && modelValue" class="rating-number">
        {{ modelValue }} / {{ maxStars }}
      </span>
      
      <span v-else-if="!modelValue" class="rating-placeholder">
        {{ placeholder }}
      </span>
      
      <button
        v-if="modelValue && !disabled"
        type="button"
        class="clear-button"
        @click="clearRating"
      >
        <Icon name="lucide:x" size="14" />
      </button>
    </div>
    
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<style scoped>
.rating-input {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rating-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 6px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  transition: border-color 0.2s ease;
}

.rating-container:hover:not(.disabled) {
  border-color: var(--el-color-primary);
}

.rating-container.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--el-fill-color-light);
}

.stars-wrapper {
  display: flex;
  gap: 4px;
}

.star-button {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  transition: transform 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.star-button:not(:disabled):hover {
  transform: scale(1.2);
}

.star-button:disabled {
  cursor: not-allowed;
}

.star-icon {
  transition: color 0.2s ease;
}

.star-empty {
  color: var(--el-border-color-darker);
}

.star-button.filled .star-icon,
.star-button.half .star-icon {
  fill: currentColor;
}

.rating-number {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.rating-placeholder {
  font-size: 14px;
  color: var(--el-text-color-placeholder);
}

.clear-button {
  background: none;
  border: none;
  padding: 4px;
  margin-left: auto;
  cursor: pointer;
  color: var(--el-text-color-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.clear-button:hover {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
}

.error-message {
  font-size: 12px;
  color: var(--el-color-danger);
  margin-top: 4px;
}
</style>

