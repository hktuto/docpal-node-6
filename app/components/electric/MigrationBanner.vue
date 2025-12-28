<template>
  <Transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="opacity-0 -translate-y-full"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-full"
  >
    <div
      v-if="isMigrating"
      class="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg z-[9999]"
      role="alert"
    >
      <div class="max-w-7xl mx-auto px-4 py-4">
        <div class="flex items-center justify-center space-x-4">
          <!-- Spinner -->
          <svg
            class="animate-spin h-6 w-6 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>

          <!-- Message -->
          <div class="flex-1">
            <p class="font-semibold text-lg">Updating database schema...</p>
            <p class="text-sm text-blue-100 mt-1">
              This will only take a moment. Please don't close the app.
            </p>
          </div>

          <!-- Progress dots (animated) -->
          <div class="hidden sm:flex space-x-1">
            <div
              v-for="i in 3"
              :key="i"
              class="w-2 h-2 bg-white rounded-full animate-pulse"
              :style="{ animationDelay: `${i * 200}ms` }"
            />
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const isMigrating = ref(false)

onMounted(() => {
  // Listen for migration events
  window.addEventListener('electric:migration:start', () => {
    isMigrating.value = true
  })

  window.addEventListener('electric:migration:complete', () => {
    isMigrating.value = false
  })
})

onUnmounted(() => {
  // Clean up listeners
  window.removeEventListener('electric:migration:start', () => {})
  window.removeEventListener('electric:migration:complete', () => {})
})
</script>

