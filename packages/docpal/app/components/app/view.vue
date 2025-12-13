<script setup lang="ts">
/**
 * AppView Component
 * 
 * Manages view state and renders appropriate widgets
 * Provides view context to children using Symbol key
 */

import { TableKey, ViewKey, type View, type ViewContext } from '~/types/context';

const props = defineProps<{
  viewId?: string;
}>();

// Inject table context from parent (type-safe!)
const tableContext = inject(TableKey);

// State
const view = ref<View | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

// Fetch view from API
const fetchView = async () => {
  if (!props.viewId) {
    // No view specified, use default or create one
    view.value = createDefaultView();
    loading.value = false;
    return;
  }
  
  loading.value = true;
  error.value = null;
  
  try {
    // TODO: Replace with real API call
    // const data = await viewApi.get(props.viewId);
    
    // Mock data for now
    view.value = {
      id: props.viewId,
      table_id: tableContext?.table.value?.id || '',
      name: 'Table View',
      config: {
        layout: 'grid',
        widgets: [
          {
            id: 'widget_1',
            type: 'table',
            title: 'All Records',
            position: { x: 0, y: 0, w: 12, h: 12 },
            config: {
              visible_columns: [],
              filters: [],
              sorts: []
            }
          }
        ]
      },
      is_default: true,
      created_by: '00000000-0000-0000-0000-000000000001',
      created_at: new Date().toISOString(),
      deleted_at: null
    };
  } catch (e: any) {
    error.value = e.message || 'Failed to load view';
    console.error('Failed to fetch view:', e);
  } finally {
    loading.value = false;
  }
};

// Create default view
const createDefaultView = (): View => {
  return {
    id: 'default',
    table_id: tableContext?.table.value?.id || '',
    name: 'Default View',
    config: {
      layout: 'grid',
      widgets: [
        {
          id: 'default_widget',
          type: 'table',
          title: '',
          position: { x: 0, y: 0, w: 12, h: 12 },
          config: {
            visible_columns: [],
            filters: [],
            sorts: []
          }
        }
      ]
    },
    is_default: true,
    created_by: '00000000-0000-0000-0000-000000000001',
    created_at: new Date().toISOString(),
    deleted_at: null
  };
};

// Refresh method
const refresh = async () => {
  await fetchView();
};

// Fetch on mount
onMounted(() => {
  fetchView();
});

// Watch for viewId changes
watch(() => props.viewId, () => {
  fetchView();
});

// Provide view context with Symbol key (type-safe!)
const viewContext: ViewContext = {
  view: readonly(view),
  loading: readonly(loading),
  error: readonly(error),
  refresh
};

provide(ViewKey, viewContext);
</script>

<template>
  <div class="app-view">
    <div v-if="loading">Loading view...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="view-container">
      <h2>View: {{ view?.name }}</h2>
      <p>Widgets: {{ view?.config.widgets.length }}</p>
      
      <!-- TODO: Render widgets based on view.config.widgets -->
      <div class="widgets">
        <div v-for="widget in view?.config.widgets" :key="widget.id" class="widget">
          <p>Widget: {{ widget.type }} - {{ widget.title }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-view {
  padding: var(--app-space-l);
}

.view-container {
  h2 {
    font-size: var(--app-font-size-xl);
    font-weight: var(--app-font-weight-title);
    color: var(--app-text-color-primary);
    margin-bottom: var(--app-space-m);
  }
  
  p {
    color: var(--app-text-color-secondary);
    font-size: var(--app-font-size-s);
  }
}

.widgets {
  display: grid;
  gap: var(--app-space-m);
  margin-top: var(--app-space-l);
}

.widget {
  padding: var(--app-space-l);
  background: var(--app-paper);
  border-radius: var(--app-border-radius-m);
  border: 1px solid var(--app-border-color);
  box-shadow: var(--app-shadow-s);
  
  p {
    color: var(--app-text-color-regular);
    font-size: var(--app-font-size-s);
  }
}

.error {
  color: var(--app-error-color);
  padding: var(--app-space-m);
  background: var(--app-error-alpha-10);
  border: 1px solid var(--app-error-1);
  border-radius: var(--app-border-radius-m);
}
</style>

