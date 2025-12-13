<script setup lang="ts">
/**
 * AppTable Component
 * 
 * Shows table with records
 * Provides table context to children using Symbol key
 */

import { DatabaseKey, TableKey, type Table, type TableContext, type Column } from '~/types/context';

const props = defineProps<{
  databaseId: string;
  tableId: string;
  viewId?: string;
}>();

// Inject database context from parent (type-safe!)
const databaseContext = inject(DatabaseKey);

// State
const table = ref<Table | null>(null);
const columns = ref<Column[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

// Fetch table from API
const fetchTable = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    // TODO: Replace with real API call
    // const data = await tableApi.get(props.tableId);
    
    // Mock data for now
    table.value = {
      id: props.tableId,
      database_id: props.databaseId,
      name: 'Customers',
      metadata: {},
      created_by: '00000000-0000-0000-0000-000000000001',
      created_at: new Date().toISOString(),
      deleted_at: null
    };
    
    // Mock columns
    columns.value = [
      {
        id: 'col_1',
        table_id: props.tableId,
        name: 'Name',
        type: 'text',
        options: {},
        constraints: {},
        order_index: 0,
        created_at: new Date().toISOString()
      },
      {
        id: 'col_2',
        table_id: props.tableId,
        name: 'Email',
        type: 'text',
        options: {},
        constraints: {},
        order_index: 1,
        created_at: new Date().toISOString()
      }
    ];
  } catch (e: any) {
    error.value = e.message || 'Failed to load table';
    console.error('Failed to fetch table:', e);
  } finally {
    loading.value = false;
  }
};

// Refresh method
const refresh = async () => {
  await fetchTable();
};

// Fetch on mount
onMounted(() => {
  fetchTable();
});

// Provide table context with Symbol key (type-safe!)
const tableContext: TableContext = {
  table: readonly(table),
  columns: readonly(columns),
  loading: readonly(loading),
  error: readonly(error),
  refresh
};

provide(TableKey, tableContext);
</script>

<template>
  <div class="app-table">
    <div class="table-header">
      <div v-if="loading">Loading table...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <template v-else>
        <h1>Table: {{ table?.name }}</h1>
        <p>Database: {{ databaseContext?.database.value?.name }}</p>
        <p>Columns: {{ columns.length }}</p>
        <p v-if="viewId">View ID: {{ viewId }}</p>
      </template>
    </div>
    
    <div class="table-content">
      <p>Table component - to be implemented</p>
      <p>Will show table data, views, filters, etc.</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-table {
  padding: var(--app-space-l);
}

.table-header {
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
    margin-bottom: var(--app-space-xxs);
  }
}

.table-content {
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

