<script lang="ts" setup>

definePageMeta({
  layout: 'desktop',
})

useHead({
  title: 'Desktop - DocPal'
})

interface WindowState {
  id: string
  title: string
  currentPageTitle?: string
  icon?: string
  url: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  isMaximized: boolean
  isMinimized: boolean
  savedState?: { x: number, y: number, width: number, height: number }
}

type MenuItem = {
    label: string
    icon: string
    url: string
}

const menu: MenuItem[] = [
  {
        label: 'Home',
        icon: 'lucide:house',
        url: '/',
    },
    {
        label: 'Workspaces',
        icon: 'lucide:database',
        url: '/workspaces',
    },{
        label: "Chat",
        icon: 'lucide:message-circle',
        url: '/chat',
    },{
        label: "Calendar",
        icon: 'lucide:calendar',
        url: '/calendar',
    },{
        label: "Files",
        icon: 'lucide:folder',
        url: '/files',
    }
]

// Window management
const windows = ref<WindowState[]>([])
const nextZIndex = ref(1000)
const windowIdCounter = ref(0)

// Calculate optimal window size based on viewport
const calculateWindowSize = () => {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // Use 75% of viewport size, but with min/max constraints
  const width = Math.min(Math.max(viewportWidth * 0.75, 800), viewportWidth - 100)
  const height = Math.min(Math.max(viewportHeight * 0.75, 500), viewportHeight - 100)
  
  return { width, height }
}

// Calculate centered position with cascade offset
const calculateWindowPosition = (width: number, height: number, windowCount: number) => {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // Center position
  let x = (viewportWidth - width) / 2
  let y = (viewportHeight - height) / 2
  
  // Add cascade offset for multiple windows
  const cascadeOffset = windowCount * 30
  x += cascadeOffset
  y += cascadeOffset
  
  // Ensure window stays within viewport
  x = Math.max(20, Math.min(x, viewportWidth - width - 20))
  y = Math.max(20, Math.min(y, viewportHeight - height - 20))
  
  return { x, y }
}

// Open a new window
const openWindow = (item: MenuItem) => {
  const id = `window-${windowIdCounter.value++}`
  
  // Calculate optimal size and position
  const { width, height } = calculateWindowSize()
  const { x, y } = calculateWindowPosition(width, height, windows.value.length)
  
  const newWindow: WindowState = {
    id,
    title: item.label,
    icon: item.icon,
    url: item.url,
    x,
    y,
    width,
    height,
    zIndex: nextZIndex.value++,
    isMaximized: false,
    isMinimized: false,
  }
  
  windows.value.push(newWindow)
}

// Close a window
const closeWindow = (id: string) => {
  const index = windows.value.findIndex(w => w.id === id)
  if (index !== -1) {
    windows.value.splice(index, 1)
  }
}

// Focus a window (bring to front)
const focusWindow = (id: string) => {
  const window = windows.value.find(w => w.id === id)
  if (window) {
    window.zIndex = nextZIndex.value++
  }
}

// Update window position
const updateWindowPosition = (id: string, x: number, y: number) => {
  const window = windows.value.find(w => w.id === id)
  if (window) {
    window.x = x
    window.y = y
  }
}

// Update window size
const updateWindowSize = (id: string, width: number, height: number) => {
  const window = windows.value.find(w => w.id === id)
  if (window) {
    window.width = width
    window.height = height
  }
}

// Minimize window to dock
const minimizeWindow = (id: string) => {
  const window = windows.value.find(w => w.id === id)
  if (!window) return
  
  window.isMinimized = true
}

// Restore window from dock
const restoreWindow = (id: string) => {
  const win = windows.value.find(w => w.id === id)
  if (!win) return
  
  win.isMinimized = false
  win.zIndex = nextZIndex.value++
  
  // Ensure window is still within viewport when restored
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  if (win.x + win.width > viewportWidth) {
    win.x = Math.max(20, viewportWidth - win.width - 20)
  }
  if (win.y + win.height > viewportHeight) {
    win.y = Math.max(20, viewportHeight - win.height - 20)
  }
  if (win.x < 0) win.x = 20
  if (win.y < 0) win.y = 20
}

// Toggle maximize/restore
const toggleMaximize = (id: string) => {
  const window = windows.value.find(w => w.id === id)
  if (!window) return
  
  // If minimized, restore first
  if (window.isMinimized) {
    window.isMinimized = false
  }
  
  if (window.isMaximized) {
    // Restore
    if (window.savedState) {
      window.x = window.savedState.x
      window.y = window.savedState.y
      window.width = window.savedState.width
      window.height = window.savedState.height
    }
    window.isMaximized = false
  } else {
    // Maximize
    window.savedState = {
      x: window.x,
      y: window.y,
      width: window.width,
      height: window.height,
    }
    window.isMaximized = true
  }
}

// Update window page title
const updatePageTitle = (id: string, pageTitle: string) => {
  const window = windows.value.find(w => w.id === id)
  if (window) {
    window.currentPageTitle = pageTitle
  }
}

// Get minimized windows for dock indicators
const minimizedWindows = computed(() => {
  return windows.value.filter(w => w.isMinimized)
})

// Handle viewport resize - keep windows within bounds
const handleViewportResize = () => {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  windows.value.forEach(win => {
    if (win.isMaximized || win.isMinimized) return
    
    // Adjust width/height if window is larger than viewport
    if (win.width > viewportWidth - 40) {
      win.width = viewportWidth - 40
    }
    if (win.height > viewportHeight - 40) {
      win.height = viewportHeight - 40
    }
    
    // Adjust position if window is off-screen
    if (win.x + win.width > viewportWidth) {
      win.x = Math.max(20, viewportWidth - win.width - 20)
    }
    if (win.y + win.height > viewportHeight) {
      win.y = Math.max(20, viewportHeight - win.height - 20)
    }
    if (win.x < 0) win.x = 20
    if (win.y < 0) win.y = 20
  })
}

// Debounced resize handler
let resizeTimeout: ReturnType<typeof setTimeout> | null = null
const debouncedResize = () => {
  if (resizeTimeout) clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(handleViewportResize, 150)
}

// Listen for viewport resize
onMounted(() => {
  window.addEventListener('resize', debouncedResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', debouncedResize)
  if (resizeTimeout) clearTimeout(resizeTimeout)
})

</script>

<template>
  <div class="desktop-container">
    <!-- Windows (render all, hide minimized with CSS to preserve iframe state) -->
    <CommonDesktopWindow
      v-for="window in windows"
      :key="window.id"
      :window="window"
      @close="closeWindow"
      @focus="focusWindow"
      @minimize="minimizeWindow"
      @update-position="updateWindowPosition"
      @update-size="updateWindowSize"
      @toggle-maximize="toggleMaximize"
      @update-page-title="updatePageTitle"
    />
    
    <!-- Dock Menu -->
    <div class="floatingMenuDockContainer glass">
      <!-- App Icons -->
      <div 
        v-for="item in menu" 
        :key="item.label" 
        class="dockItem"
        @click="openWindow(item)"
        :title="item.label"
      >
        <Icon :name="item.icon" />
        <span>{{ item.label }}</span>
      </div>
      
      <!-- Separator (if there are minimized windows) -->
      <div v-if="minimizedWindows.length > 0" class="dockSeparator"></div>
      
      <!-- Minimized Windows -->
      <div 
        v-for="window in minimizedWindows" 
        :key="`minimized-${window.id}`" 
        class="dockItem minimizedWindow"
        @click="restoreWindow(window.id)"
        :title="`${window.currentPageTitle || window.title} (click to restore)`"
      >
        <Icon v-if="window.icon" :name="window.icon" />
        <Icon v-else name="lucide:window" />
        <span>{{ window.currentPageTitle || window.title }}</span>
        <div class="minimizedIndicator"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.desktop-container {
  display: flex;
  flex-flow: column nowrap;
  height: 100vh;
  width: 100vw;
  justify-content: flex-end;
  align-items: center;
  padding: var(--app-space-m);
  position: relative;
  overflow: hidden;
  /* background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); */
}

.floatingMenuDockContainer {
  display: flex;
  flex-direction: row;
  gap: var(--app-space-s);
  padding: 12px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  z-index: 9999;
  position: relative;
}

.dockItem {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  min-width: 70px;
}

.dockItem:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-8px) scale(1.05);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
}

.dockItem:active {
  transform: translateY(-6px) scale(1.02);
}

.dockItem span {
  font-size: 12px;
  font-weight: 500;
  color: white;
  text-align: center;
  white-space: nowrap;
}

.dockItem :deep(svg) {
  width: 28px;
  height: 28px;
  color: white;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.dockSeparator {
  width: 2px;
  height: 50px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 1px;
  margin: 0 8px;
  align-self: center;
}

.dockItem.minimizedWindow {
  position: relative;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.4);
}

.dockItem.minimizedWindow:hover {
  background: rgba(255, 255, 255, 0.35);
}

.minimizedIndicator {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 6px;
  background: #2ed573;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(46, 213, 115, 0.8);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }
  50% {
    opacity: 0.6;
    transform: translateX(-50%) scale(1.2);
  }
}
</style>