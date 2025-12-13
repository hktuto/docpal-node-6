<script setup lang="ts">
/**
 * AppDatabase Component
 * 
 * Shows database details and list of tables
 * Provides database context to children using Symbol key
 */

import { DatabaseKey, type Database, type DatabaseContext } from '~/types/context';

const props = defineProps<{
  databaseId: string;
}>();

// State
const database = ref<Database | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

// Fetch database from API
const fetchDatabase = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    // TODO: Replace with real API call
    // const data = await databaseApi.get(props.databaseId);
    
    // Mock data for now
    database.value = {
      id: props.databaseId,
      name: 'Sales Database',
      company_id: '00000000-0000-0000-0000-000000000002',
      created_by: '00000000-0000-0000-0000-000000000001',
      created_at: new Date().toISOString(),
      deleted_at: null
    };
  } catch (e: any) {
    error.value = e.message || 'Failed to load database';
    console.error('Failed to fetch database:', e);
  } finally {
    loading.value = false;
  }
};

// Refresh method
const refresh = async () => {
  await fetchDatabase();
};

// Fetch on mount
onMounted(() => {
  fetchDatabase();
});

// Provide database context with Symbol key (type-safe!)
const databaseContext: DatabaseContext = {
  database: readonly(database),
  loading: readonly(loading),
  error: readonly(error),
  refresh
};

provide(DatabaseKey, databaseContext);
</script>

<template>
  <div class="app-database">
    <div class="database-header">
      <div v-if="loading">Loading database...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <template v-else>
        <h1>Database: {{ database?.name }}</h1>
        <p>ID: {{ databaseId }}</p>
        <button @click="refresh">Refresh</button>
      </template>
    </div>
    
    <div class="database-content">
      <p>Database component - to be implemented</p>
      <p>Will show list of tables, create table button, etc.</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-database {
  padding: var(--app-space-l);
}

.database-header {
  margin-bottom: var(--app-space-xl);
  
  h1 {
    font-size: var(--app-font-size-xxl);
    font-weight: var(--app-font-weight-title);
    color: var(--app-text-color-primary);
    margin-bottom: var(--app-space-s);
  }
  
  p {
    color: var(--app-text-color-secondary);
    font-size: var(--app-font-size-s);
  }
  
  button {
    margin-top: var(--app-space-m);
    padding: var(--app-space-s) var(--app-space-m);
    background: var(--app-primary-color);
    color: white;
    border: none;
    border-radius: var(--app-border-radius-m);
    cursor: pointer;
    font-size: var(--app-font-size-s);
    
    &:hover {
      background: var(--app-primary-4);
    }
  }
}

.database-content {
  padding: var(--app-space-xl);
  background: var(--app-paper);
  border-radius: var(--app-border-radius-m);
  border: 1px solid var(--app-border-color);
  box-shadow: var(--app-shadow-s);
}

.error {
  color: var(--app-error-color);
  padding: var(--app-space-m);
  background: var(--app-error-alpha-10);
  border: 1px solid var(--app-error-1);
  border-radius: var(--app-border-radius-m);
}
</style>

