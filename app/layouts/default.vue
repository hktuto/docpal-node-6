<script setup lang="ts">
const isDesktopMode = useIsDesktopMode()

const expandState = ref(false)

function toggleExpand() {
  expandState.value = !expandState.value
}

// Setup desktop shortcuts (will send postMessage to parent if in iframe)
useDesktopShortcuts()
</script>

<template>
    <div class="appContainer" :class="{ 'desktop-mode': isDesktopMode }">
       <aside v-if="!isDesktopMode" class="sidebar">
         <CommonMenu v-model:expandState="expandState" />
       </aside>
       <main :class="{ 'no-sidebar': isDesktopMode }">
            <slot />
       </main>
    </div>    
</template>

<style scoped>
.appContainer {
  display: flex;
  height: 100dvh;
  overflow: hidden;
  position: relative;
}

.sidebar {

  background: var(--app-bg-color);
  border-right: 1px solid var(--app-border-color);
}

main {
  flex: 1;
  padding: 20px;
  height: 100%;
  overflow: auto;
}

main.no-sidebar {
  width: 100%;
  padding: 0;
}
</style>