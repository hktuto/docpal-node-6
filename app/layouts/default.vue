<script setup lang="ts">
const { isDesktopMode, isMobile } = useDisplayMode()

const expandState = ref(false)
const mobileMenuOpen = ref(false)

function toggleExpand() {
  expandState.value = !expandState.value
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
}

// Setup desktop shortcuts (will send postMessage to parent if in iframe)
useDesktopShortcuts()

// Close mobile menu when route changes
const route = useRoute()
watch(() => route.path, () => {
  if (isMobile.value) {
    closeMobileMenu()
  }
})
</script>

<template>
    <div class="appContainer" :class="{ 'desktop-mode': isDesktopMode, 'mobile': isMobile }">
       <!-- Mobile: Hamburger button -->
       <button 
         v-if="isMobile && !isDesktopMode" 
         class="mobile-menu-toggle"
         @click="toggleMobileMenu"
         aria-label="Toggle menu"
       >
         <Icon name="lucide:menu" />
       </button>
       
       <!-- Desktop: Sidebar -->
       <aside v-if="!isDesktopMode && !isMobile" class="sidebar">
         <CommonMenu v-model:expandState="expandState" />
       </aside>
       
       <!-- Mobile: Drawer menu -->
       <CommonMenu 
         v-if="!isDesktopMode && isMobile"
         v-model:expandState="expandState"
         v-model:mobileOpen="mobileMenuOpen"
         @close="closeMobileMenu"
       />
       
       <main :class="{ 'no-sidebar': isDesktopMode || (isMobile && !mobileMenuOpen) }">
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

/* Mobile hamburger button */
.mobile-menu-toggle {
  position: fixed;
  top: var(--app-space-m);
  left: var(--app-space-m);
  z-index: 9999;
  background: var(--app-bg-color);
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-border-radius-m);
  padding: var(--app-space-s);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-text-color-primary);
  box-shadow: var(--app-shadow-s);
  transition: all 0.2s;
  
  &:hover {
    background: var(--app-fill-color-light);
    border-color: var(--app-primary-color);
  }
  
  &:active {
    transform: scale(0.95);
  }
}

/* Mobile: Adjust main padding */
.appContainer.mobile main {
  padding-top: calc(var(--app-space-m) * 2 + 40px); /* Space for hamburger button */
  padding-left: var(--app-space-m);
  padding-right: var(--app-space-m);
  padding-bottom: var(--app-space-m);
}

/* Desktop: Hide hamburger button */
@media (min-width: 768px) {
  .mobile-menu-toggle {
    display: none;
  }
  
  .appContainer.mobile main {
    padding-top: 20px;
  }
}
</style>