<script setup lang="ts">
/**
 * Auth Layout
 * 
 * Simple centered layout for login/register pages
 */
</script>

<template>
    <ClientOnly>
      <div class="auth-layout">
        <slot />

          <UiLoadingBg />
      </div>
    </ClientOnly>
</template>

<style scoped lang="scss">
.auth-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

