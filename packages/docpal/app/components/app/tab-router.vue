<script setup lang="ts">
/**
 * AppTabRouter Component
 * 
 * Routes to the correct component based on tab type
 * - database: Shows AppDatabase
 * - table: Shows AppTable (which includes AppView)
 */

interface Tab {
  id: string;
  type: 'database' | 'table';
  label: string;
  databaseId?: string;
  tableId?: string;
  viewId?: string;
}

const props = defineProps<{
  tab: Tab;
}>();
</script>

<template>
  <div class="app-tab-router">
    <AppDatabase
      v-if="tab.type === 'database'"
      :database-id="tab.databaseId!"
    />
    
    <AppTable
      v-else-if="tab.type === 'table'"
      :database-id="tab.databaseId!"
      :table-id="tab.tableId!"
      :view-id="tab.viewId"
    />
    
    <div v-else class="error-state">
      Unknown tab type: {{ tab.type }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-tab-router {
  height: 100%;
}

.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-danger, #ef4444);
}
</style>

