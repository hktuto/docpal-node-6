<script setup lang="ts">
/**
 * Auth Layout
 * 
 * Simple centered layout for login/register pages
 */
</script>

<template>
  <div class="auth-layout">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.auth-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

