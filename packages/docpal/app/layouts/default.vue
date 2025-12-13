<script setup lang="ts">
/**
 * Default Layout
 * 
 * Main app layout (will add sidebar later)
 * For now, just a simple wrapper
 */
</script>

<template>
  <div class="default-layout">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.default-layout {
  min-height: 100vh;
  background: var(--app-bg-color-page);
}
</style>

