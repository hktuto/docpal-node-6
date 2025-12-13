<script setup lang="ts">
/**
 * Catch-all Page
 * 
 * Main app entry point - handles all routes under /app/*
 * Routes:
 * - /app -> Show AppEntry with tabs
 * - /app/db_123/table_456/view_789 -> Parse and open that specific tab
 */

definePageMeta({
  layout: 'default'
});

const route = useRoute();
</script>

<template>
  <div class="app-page">
    <AppEntry :initial-route="route.path" />
  </div>
</template>

<style scoped lang="scss">
.app-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>

