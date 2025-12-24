<script setup lang="ts">
interface TabState {
  id: string
  url: string
  title: string
  icon?: string
  currentPageTitle?: string
}

interface Props {
  tabs: TabState[]
  activeTabId: string
  canClose?: boolean // Can close tabs (false if only one tab left)
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'switch-tab': [tabId: string]
  'close-tab': [tabId: string]
  'new-tab': []
}>()

const displayTitle = (tab: TabState) => {
  return tab.currentPageTitle || tab.title
}
</script>

<template>
  <div class="tab-header">
    <div class="tabs-container">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-item"
        :class="{ active: tab.id === activeTabId }"
        @click="emit('switch-tab', tab.id)"
      >
        <Icon v-if="tab.icon" :name="tab.icon" class="tab-icon" />
        <span class="tab-title">{{ displayTitle(tab) }}</span>
        <button
          v-if="props.canClose"
          class="tab-close"
          @click.stop="emit('close-tab', tab.id)"
          title="Close tab"
        >
          <Icon name="lucide:x" />
        </button>
      </button>
    </div>
    <button class="new-tab-button" @click="emit('new-tab')" title="New tab">
      <Icon name="lucide:plus" />
    </button>
    <!-- Slot for window controls (minimize, maximize, close, etc.) -->
    <div class="window-controls-slot">
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
.tab-header {
  display: flex;
  align-items: stretch;
  background: var(--header-bg, var(--app-accent-color));
  border-bottom: 1px solid var(--app-border-color);
  height: var(--app-header-height, 40px);
  flex-shrink: 0;
  position: relative;
}

.tabs-container {
  flex: 1;
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  
  // Hide scrollbar but keep functionality
  scrollbar-width: thin;
  scrollbar-color: var(--app-border-color) transparent;
  
  &::-webkit-scrollbar {
    height: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--app-border-color);
    border-radius: 2px;
  }
}

.tab-item {
  display: flex;
  align-items: center;
  gap: var(--app-space-xs);
  padding: 0 var(--app-space-s);
  background: rgba(0, 0, 0, 0.2);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  min-width: 120px;
  max-width: 240px;
  position: relative;
  
  &:hover {
    background: rgba(0, 0, 0, 0.3);
    color: rgba(255, 255, 255, 0.9);
  }
  
  &.active {
    background: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 1);
    border-bottom: 2px solid rgba(255, 255, 255, 0.5);
  }
  
  .tab-icon {
    flex-shrink: 0;
    width: 14px;
    height: 14px;
  }
  
  .tab-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: var(--app-font-size-s);
  }
  
  .tab-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    padding: 0;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    border-radius: 3px;
    opacity: 0.6;
    transition: all 0.2s ease;
    flex-shrink: 0;
    
    &:hover {
      background: rgba(255, 255, 255, 0.2);
      opacity: 1;
      color: rgba(255, 255, 255, 1);
    }
  }
}

.new-tab-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  padding: 0;
  border: none;
  background: transparent;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 1);
  }
}

.window-controls-slot {
  display: flex;
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
}
</style>

