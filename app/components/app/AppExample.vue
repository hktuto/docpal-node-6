<script setup lang="ts">
/**
 * Example component showing how to use app context
 * Any component within the app layout can access app data and methods
 */

// Simply call useAppContext() to get all app data and methods
const { 
  app,           // The app data
  appSlug,       // The app slug
  appName,       // The app name
  pending,       // Loading state
  refreshApp,    // Refresh app data
  updateApp,     // Update app
  getAppPath,    // Get path for app routes
} = useAppContext()

// Example: Update app name
async function updateName() {
  const result = await updateApp({ name: 'New Name' })
  if (result) {
    console.log('App name updated!')
  }
}

// Example: Navigate to a specific path
const tablesPath = computed(() => getAppPath('tables'))
</script>

<template>
  <div class="app-example">
    <h3>Current App: {{ appName }}</h3>
    <p>Slug: {{ appSlug }}</p>
    <p v-if="pending">Loading...</p>
    
    <div v-if="app">
      <p>Icon: {{ app.icon }}</p>
      <p>Description: {{ app.description }}</p>
      
      <NuxtLink :to="tablesPath">
        Go to Tables
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.app-example {
  padding: var(--app-space-m);
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-border-radius-m);
}
</style>

