<script setup lang="ts">
/**
 * AppDatabase Component
 * 
 * Shows database details and list of tables
 * Provides database context to children
 * 
 * TODO: Fetch real database data and implement UI
 */

const props = defineProps<{
  databaseId: string;
}>();

// TODO: Fetch database from API
const database = ref({
  id: props.databaseId,
  name: 'Loading...',
  tables: []
});

// Provide database context for children
provide('database', readonly(database));
</script>

<template>
  <div class="app-database">
    <div class="database-header">
      <h1>Database: {{ database.name }}</h1>
      <p>ID: {{ databaseId }}</p>
    </div>
    
    <div class="database-content">
      <p>Database component - to be implemented</p>
      <p>Will show list of tables, create table button, etc.</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-database {
  padding: var(--spacing-lg, 24px);
}

.database-header {
  margin-bottom: var(--spacing-xl, 32px);
  
  h1 {
    font-size: var(--font-size-2xl, 24px);
    margin-bottom: var(--spacing-sm, 8px);
  }
  
  p {
    color: var(--text-secondary, #475569);
    font-size: var(--font-size-sm, 14px);
  }
}

.database-content {
  padding: var(--spacing-xl, 32px);
  background: var(--bg-primary, #ffffff);
  border-radius: var(--border-radius, 6px);
  border: 1px solid var(--border-color, #e2e8f0);
}
</style>

