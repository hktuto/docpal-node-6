<script setup lang="ts">
/**
 * AppEntry Component
 * 
 * Main application entry point
 * - Manages tabs in localStorage
 * - Syncs URL with active tab
 * - Renders AppTabRouter for each tab
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
  initialRoute: string;
}>();

const tabs = ref<Tab[]>([]);
const activeTabId = ref<string | null>(null);

onMounted(() => {
  // Load tabs from localStorage
  if (process.client) {
    const savedTabs = localStorage.getItem('tabs');
    if (savedTabs) {
      try {
        tabs.value = JSON.parse(savedTabs);
      } catch (e) {
        console.error('Failed to parse saved tabs:', e);
      }
    }
    
    const savedActiveTabId = localStorage.getItem('activeTabId');
    if (savedActiveTabId) {
      activeTabId.value = savedActiveTabId;
    }
    
    // If URL has a route, parse and open that tab
    if (props.initialRoute && props.initialRoute !== '/app') {
      parseAndOpenRoute(props.initialRoute);
    }
  }
});

const parseAndOpenRoute = (path: string) => {
  // Parse path like /app/db_123/table_456/view_789
  const parts = path.split('/').filter(Boolean);
  
  if (parts.length < 2) return; // Just /app
  
  // parts[0] = 'app'
  // parts[1] = 'db_123' or database ID
  
  const databaseId = parts[1];
  const tableId = parts[2] || undefined;
  const viewId = parts[3] || undefined;
  
  // Check if tab already exists
  const existingTab = tabs.value.find(t => 
    t.databaseId === databaseId && t.tableId === tableId
  );
  
  if (existingTab) {
    switchTab(existingTab.id);
  } else {
    // Open new tab
    openTab({
      id: `tab_${Date.now()}`,
      type: tableId ? 'table' : 'database',
      label: tableId ? 'Table' : 'Database', // Will be updated with real names
      databaseId,
      tableId,
      viewId
    });
  }
};

const openTab = (tab: Tab) => {
  tabs.value.push(tab);
  activeTabId.value = tab.id;
  saveTabs();
  updateUrl(tab);
};

const closeTab = (tabId: string) => {
  const index = tabs.value.findIndex(t => t.id === tabId);
  if (index === -1) return;
  
  tabs.value.splice(index, 1);
  
  // If closing active tab, switch to another
  if (activeTabId.value === tabId) {
    if (tabs.value.length > 0) {
      const newActiveTab = tabs.value[Math.max(0, index - 1)];
      switchTab(newActiveTab.id);
    } else {
      activeTabId.value = null;
      navigateTo('/app');
    }
  }
  
  saveTabs();
};

const switchTab = (tabId: string) => {
  activeTabId.value = tabId;
  const tab = tabs.value.find(t => t.id === tabId);
  if (tab) {
    updateUrl(tab);
  }
  if (process.client) {
    localStorage.setItem('activeTabId', tabId);
  }
};

const saveTabs = () => {
  if (process.client) {
    localStorage.setItem('tabs', JSON.stringify(tabs.value));
  }
};

const updateUrl = (tab: Tab) => {
  let url = '/app';
  if (tab.databaseId) {
    url += `/${tab.databaseId}`;
  }
  if (tab.tableId) {
    url += `/${tab.tableId}`;
  }
  if (tab.viewId) {
    url += `/${tab.viewId}`;
  }
  
  navigateTo(url, { replace: true });
};

// Expose methods for child components to open tabs
provide('openTab', openTab);
provide('closeTab', closeTab);
provide('switchTab', switchTab);
</script>

<template>
  <div class="app-entry">
    <!-- Tab Bar -->
    <div v-if="tabs.length > 0" class="tab-bar">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab', { active: tab.id === activeTabId }]"
        @click="switchTab(tab.id)"
      >
        <span class="tab-label">{{ tab.label }}</span>
        <button class="tab-close" @click.stop="closeTab(tab.id)">×</button>
      </div>
    </div>
    
    <!-- Tab Content -->
    <div class="tab-content">
      <template v-if="tabs.length === 0">
        <!-- Empty State -->
        <div class="empty-state">
          <h2>Welcome to DocPal</h2>
          <p>Create or open a database to get started</p>
          <button class="primary-button">Create Database</button>
        </div>
      </template>
      
      <template v-else>
        <!-- Render active tab -->
        <AppTabRouter
          v-for="tab in tabs"
          v-show="tab.id === activeTabId"
          :key="tab.id"
          :tab="tab"
        />
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-entry {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tab-bar {
  display: flex;
  background: var(--bg-primary, #ffffff);
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  overflow-x: auto;
}

.tab {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  padding: var(--spacing-md, 16px) var(--spacing-lg, 24px);
  border-right: 1px solid var(--border-color, #e2e8f0);
  cursor: pointer;
  transition: background var(--transition-fast, 150ms ease);
  white-space: nowrap;
  
  &:hover {
    background: var(--bg-hover, #f1f5f9);
  }
  
  &.active {
    background: var(--bg-secondary, #f8fafc);
    border-bottom: 2px solid var(--color-primary, #3b82f6);
  }
}

.tab-label {
  font-size: var(--font-size-sm, 14px);
  color: var(--text-primary, #0f172a);
}

.tab-close {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 18px;
  color: var(--text-secondary, #475569);
  transition: all var(--transition-fast, 150ms ease);
  
  &:hover {
    background: var(--bg-active, #e2e8f0);
    color: var(--text-primary, #0f172a);
  }
}

.tab-content {
  flex: 1;
  overflow: auto;
}

.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-lg, 24px);
  text-align: center;
  padding: var(--spacing-2xl, 48px);
  
  h2 {
    font-size: var(--font-size-2xl, 24px);
    color: var(--text-primary, #0f172a);
  }
  
  p {
    font-size: var(--font-size-base, 16px);
    color: var(--text-secondary, #475569);
  }
}

.primary-button {
  padding: var(--spacing-md, 16px) var(--spacing-xl, 32px);
  background: var(--color-primary, #3b82f6);
  color: white;
  border: none;
  border-radius: var(--border-radius, 6px);
  font-size: var(--font-size-base, 16px);
  font-weight: var(--font-weight-medium, 500);
  cursor: pointer;
  transition: background var(--transition-fast, 150ms ease);
  
  &:hover {
    background: var(--color-primary-hover, #2563eb);
  }
}
</style>

