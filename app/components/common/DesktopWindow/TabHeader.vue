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
  copied?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'switch-tab': [tabId: string]
  'close-tab': [tabId: string]
  'new-tab': [],
  'copy-url': []
  'open-standalone': [event: MouseEvent]
}>()



const displayTitle = (tab: TabState) => {
  return tab.currentPageTitle || tab.title
}
</script>

<template>
  <div class="tab-header">
    <div class="header-left">
      <slot name="header-left" />
    </div>
    <div class="tabs-container">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-item"
        :class="{ active: tab.id === activeTabId }"
        @click.stop="emit('switch-tab', tab.id)"
        @mousedown.stop
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
        <button 
          v-if="tab.id === activeTabId"
            class="tab-close" 
            @click.stop="emit('copy-url')"
            :title="copied ? 'Copied!' : 'Copy URL'"
          >
            <Icon v-if="!copied" name="lucide:link" />
            <Icon v-else name="lucide:check" />
          </button>
          <!-- Open Standalone Button -->
          <button 
            v-if="tab.id === activeTabId"
            class="tab-close" 
            @click.stop="(e: MouseEvent) => emit('open-standalone', e)"
            title="Open in Standalone Mode (Ctrl+Click for new tab)"
          >
            <Icon name="lucide:external-link" />
          </button>
      </div>
    </div>
    <button class="new-tab-button" @click="emit('new-tab')" title="New tab">
      <Icon name="lucide:plus" />
    </button>
    <div class="space"></div>
    <!-- Slot for window controls (minimize, maximize, close, etc.) -->
    <div class="window-controls-slot">
      <slot name="window-controls" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.tab-header {
  --header-bg: var(--app-grey-850);
  --text-color: var(--app-text-color-primary);
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
  background: var(--header-bg);
  border-bottom: 1px solid var(--app-border-color);
  height: var(--app-header-height, 40px);
  flex-shrink: 0;
  position: relative;
  padding-inline: var(--app-space-xxs) var(--app-space-xs);
}

.tabs-container {
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  height: 100%;
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
.space{
  flex: 1 0 auto;
}
.tab-item {
  display: flex;
  align-items: center;
  gap: var(--app-space-xs);
  padding: 0 var(--app-space-s);
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  min-width: 120px;
  max-width: 240px;
  position: relative;
  
  &:hover {
  }
  
  &.active {
    background: var(--app-primary-2);
    --text-color: var(--app-paper);
    border-top-left-radius: var(--app-border-radius-s);
    border-top-right-radius: var(--app-border-radius-s);
    // border-bottom: 2px solid var(--app-primary-color);
  }
  
  .tab-icon {
    flex-shrink: 0;
    width: 14px;
    height: 14px;
    color: var(--text-color);
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
    color: var(--text-color);
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
  color: var(--text-color);
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

