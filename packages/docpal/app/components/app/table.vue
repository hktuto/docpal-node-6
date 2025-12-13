<script setup lang="ts">
/**
 * AppTable Component
 * 
 * Shows table with records
 * Provides table context to children
 * 
 * TODO: Fetch real table data and implement UI
 */

const props = defineProps<{
  databaseId: string;
  tableId: string;
  viewId?: string;
}>();

// Get database context from parent
const database = inject('database');

// TODO: Fetch table from API
const table = ref({
  id: props.tableId,
  name: 'Loading...',
  columns: []
});

// Provide table context for children
provide('table', readonly(table));
</script>

<template>
  <div class="app-table">
    <div class="table-header">
      <h1>Table: {{ table.name }}</h1>
      <p>Database ID: {{ databaseId }}</p>
      <p>Table ID: {{ tableId }}</p>
      <p v-if="viewId">View ID: {{ viewId }}</p>
    </div>
    
    <div class="table-content">
      <p>Table component - to be implemented</p>
      <p>Will show table data, views, filters, etc.</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-table {
  padding: var(--spacing-lg, 24px);
}

.table-header {
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

.table-content {
  padding: var(--spacing-xl, 32px);
  background: var(--bg-primary, #ffffff);
  border-radius: var(--border-radius, 6px);
  border: 1px solid var(--border-color, #e2e8f0);
}
</style>

