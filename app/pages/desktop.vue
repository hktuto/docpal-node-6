<script lang="ts" setup>
import { useDebounceFn } from '@vueuse/core'

definePageMeta({
  layout: 'desktop',
})

useHead({
  title: 'Desktop - DocPal'
})

// Desktop mode is now auto-detected in layouts when pages load in iframes
// No manual state management needed here

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

// Dock visibility management
const isDockVisible = ref(true)
const isDockForceVisible = ref(false) // When mouse hovers at bottom
const dockHideTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const DOCK_HEIGHT = 100 // Approximate dock height
const HOVER_THRESHOLD = 50 // Pixels from bottom to trigger show

// Window snapping
type SnapZone = 'left' | 'right' | 'top' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null
const snapPreviewZone = ref<SnapZone>(null)
const SNAP_THRESHOLD = 20 // Pixels from edge to trigger snap

// Check snap zones during drag
const checkSnapZone = (x: number, y: number): SnapZone => {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const threshold = SNAP_THRESHOLD
  
  // Check corners first (more specific)
  if (x < threshold && y < threshold) return 'top-left'
  if (x > viewportWidth - threshold && y < threshold) return 'top-right'
  if (x < threshold && y > viewportHeight - threshold) return 'bottom-left'
  if (x > viewportWidth - threshold && y > viewportHeight - threshold) return 'bottom-right'
  
  // Check edges
  if (x < threshold) return 'left'
  if (x > viewportWidth - threshold) return 'right'
  if (y < threshold) return 'top'
  
  return null
}

// Get snap position for a zone
const getSnapPosition = (zone: SnapZone) => {
  if (!zone) return null
  
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  const positions = {
    'left': { x: 0, y: 0, width: viewportWidth / 2, height: viewportHeight },
    'right': { x: viewportWidth / 2, y: 0, width: viewportWidth / 2, height: viewportHeight },
    'top': { x: 0, y: 0, width: viewportWidth, height: viewportHeight }, // Maximize
    'top-left': { x: 0, y: 0, width: viewportWidth / 2, height: viewportHeight / 2 },
    'top-right': { x: viewportWidth / 2, y: 0, width: viewportWidth / 2, height: viewportHeight / 2 },
    'bottom-left': { x: 0, y: viewportHeight / 2, width: viewportWidth / 2, height: viewportHeight / 2 },
    'bottom-right': { x: viewportWidth / 2, y: viewportHeight / 2, width: viewportWidth / 2, height: viewportHeight / 2 },
  }
  
  return positions[zone]
}

// Apply snap to window
const snapWindow = (id: string, zone: SnapZone) => {
  const window = windows.value.find(w => w.id === id)
  if (!window || !zone) return
  
  const position = getSnapPosition(zone)
  if (!position) return
  
  // Save current position for un-snap
  if (!window.savedState) {
    window.savedState = {
      x: window.x,
      y: window.y,
      width: window.width,
      height: window.height
    }
  }
  
  // Apply snap position
  window.x = position.x
  window.y = position.y
  window.width = position.width
  window.height = position.height
  window.isMaximized = (zone === 'top') // Top edge = maximize
  
  checkDockOverlap()
  saveWindowsState()
}

// Check if any window overlaps with dock area
const checkDockOverlap = () => {
  if (isDockForceVisible.value) return // Mouse hovering, keep visible
  
  const viewportHeight = window.innerHeight
  const dockTopEdge = viewportHeight - DOCK_HEIGHT
  
  // Check if any window is maximized
  const hasMaximized = windows.value.some(win => !win.isMinimized && win.isMaximized)
  if (hasMaximized) {
    isDockVisible.value = false
    return
  }
  
  // Check if any visible, non-minimized window overlaps with dock area
  const hasOverlap = windows.value.some(win => {
    if (win.isMinimized) return false
    const windowBottom = win.y + win.height
    return windowBottom > dockTopEdge
  })
  
  isDockVisible.value = !hasOverlap
}

// Calculate optimal window size based on viewport
const calculateWindowSize = () => {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // Use 75% of viewport size, but with min/max constraints
  // Reserve space for dock
  const width = Math.min(Math.max(viewportWidth * 0.75, 800), viewportWidth - 100)
  const height = Math.min(Math.max(viewportHeight * 0.75, 500), viewportHeight - DOCK_HEIGHT - 40)
  
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
  checkDockOverlap()
  saveWindowsState()
}

// Close a window
const closeWindow = (id: string) => {
  const index = windows.value.findIndex(w => w.id === id)
  if (index !== -1) {
    windows.value.splice(index, 1)
    checkDockOverlap()
    saveWindowsState()
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
    checkDockOverlap()
    saveWindowsState()
  }
}

// Handle drag move for snap preview
const handleWindowDragMove = (id: string, x: number, y: number) => {
  // Check if near edge to show snap preview
  const zone = checkSnapZone(x, y)
  snapPreviewZone.value = zone
}

// Handle drag end for snapping
const handleWindowDragEnd = (id: string, x: number, y: number) => {
  const zone = snapPreviewZone.value
  
  // Clear preview
  snapPreviewZone.value = null
  
  if (zone) {
    // Snap to zone (this will override the normal position update)
    snapWindow(id, zone)
    return true // Indicate snap occurred
  }
  
  return false // No snap
}

// Handle unsnap - restore window to original size
const handleWindowUnsnap = (id: string, cursorX: number, cursorY: number) => {
  const window = windows.value.find(w => w.id === id)
  if (!window || !window.savedState) return
  
  // Restore original size
  const originalSize = window.savedState
  window.width = originalSize.width
  window.height = originalSize.height
  
  // Position window so cursor is at the same relative position in the title bar
  // Assume cursor was in the middle of the title bar when snapped
  const newX = cursorX - (window.width / 2)
  const newY = cursorY - 20 // Approximate title bar half height
  
  window.x = newX
  window.y = newY
  
  // Clear saved state
  window.savedState = undefined
  
  checkDockOverlap()
  saveWindowsState()
}

// Update window size
const updateWindowSize = (id: string, width: number, height: number) => {
  const window = windows.value.find(w => w.id === id)
  if (window) {
    window.width = width
    window.height = height
    checkDockOverlap()
    saveWindowsState()
  }
}

// Minimize window to dock
const minimizeWindow = (id: string) => {
  const window = windows.value.find(w => w.id === id)
  if (!window) return
  
  window.isMinimized = true
  checkDockOverlap()
  saveWindowsState()
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
  
  checkDockOverlap()
  saveWindowsState()
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
  
  checkDockOverlap()
  saveWindowsState()
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

// Save windows state to localStorage (debounced)
const saveWindowsState = useDebounceFn(() => {
  if (!process.client) return
  
  const state = windows.value.map(win => ({
    id: win.id,
    title: win.title,
    icon: win.icon,
    url: win.url,
    x: win.x,
    y: win.y,
    width: win.width,
    height: win.height,
    isMaximized: win.isMaximized,
    isMinimized: win.isMinimized,
    savedState: win.savedState,
    currentPageTitle: win.currentPageTitle
  }))
  
  localStorage.setItem('desktopWindows', JSON.stringify(state))
  localStorage.setItem('desktopNextZIndex', String(nextZIndex.value))
  localStorage.setItem('desktopWindowIdCounter', String(windowIdCounter.value))
}, 500)

// Load windows state from localStorage
const loadWindowsState = () => {
  if (!process.client) return
  
  try {
    const savedWindows = localStorage.getItem('desktopWindows')
    const savedNextZIndex = localStorage.getItem('desktopNextZIndex')
    const savedIdCounter = localStorage.getItem('desktopWindowIdCounter')
    
    if (savedWindows) {
      const parsed = JSON.parse(savedWindows)
      windows.value = parsed.map((win: any, index: number) => ({
        ...win,
        zIndex: 1000 + index // Re-assign z-index in order
      }))
    }
    
    if (savedNextZIndex) {
      nextZIndex.value = parseInt(savedNextZIndex)
    }
    
    if (savedIdCounter) {
      windowIdCounter.value = parseInt(savedIdCounter)
    }
    
    // Check overlap after loading
    nextTick(() => {
      checkDockOverlap()
    })
  } catch (e) {
    console.error('Failed to load windows state:', e)
  }
}

// Mouse movement handler for dock auto-show
const handleMouseMove = (e: MouseEvent) => {
  const bottomDistance = window.innerHeight - e.clientY
  
  if (bottomDistance <= HOVER_THRESHOLD) {
    // Mouse near bottom - force show dock
    isDockForceVisible.value = true
    isDockVisible.value = true
    
    // Clear any pending hide timeout
    if (dockHideTimeout.value) {
      clearTimeout(dockHideTimeout.value)
      dockHideTimeout.value = null
    }
  } else if (isDockForceVisible.value) {
    // Mouse moved away - schedule hide check
    if (dockHideTimeout.value) {
      clearTimeout(dockHideTimeout.value)
    }
    
    dockHideTimeout.value = setTimeout(() => {
      isDockForceVisible.value = false
      checkDockOverlap() // Re-check if dock should be hidden due to overlap
    }, 1000)
  }
}

// Handle viewport resize - keep windows within bounds
const handleViewportResize = () => {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const minVisible = 100 // Keep at least 100px visible
  
  windows.value.forEach(win => {
    if (win.isMaximized || win.isMinimized) return
    
    // Adjust width/height if window is larger than viewport
    if (win.width > viewportWidth - 40) {
      win.width = Math.max(300, viewportWidth - 40)
    }
    if (win.height > viewportHeight - 40) {
      win.height = Math.max(200, viewportHeight - 40)
    }
    
    // Ensure window is not completely off-screen
    // Keep at least minVisible pixels visible
    const maxX = viewportWidth - minVisible
    const maxY = viewportHeight - minVisible
    
    // Adjust X position
    if (win.x > maxX) {
      win.x = maxX
    }
    if (win.x + win.width < minVisible) {
      win.x = minVisible - win.width
    }
    
    // Adjust Y position
    if (win.y > maxY) {
      win.y = maxY
    }
    if (win.y + win.height < minVisible) {
      win.y = minVisible - win.height
    }
    
    // Ensure minimum position
    if (win.x < -win.width + minVisible) {
      win.x = -win.width + minVisible
    }
    if (win.y < 0) {
      win.y = 0
    }
  })
  
  checkDockOverlap()
}

// Debounced resize handler
let resizeTimeout: ReturnType<typeof setTimeout> | null = null
const debouncedResize = () => {
  if (resizeTimeout) clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(handleViewportResize, 150)
}

// Listen for viewport resize and mouse movement
onMounted(() => {
  window.addEventListener('resize', debouncedResize)
  document.addEventListener('mousemove', handleMouseMove)
  
  // Load saved windows state
  loadWindowsState()
})

onUnmounted(() => {
  window.removeEventListener('resize', debouncedResize)
  document.removeEventListener('mousemove', handleMouseMove)
  if (resizeTimeout) clearTimeout(resizeTimeout)
  if (dockHideTimeout.value) clearTimeout(dockHideTimeout.value)
})

</script>

<template>
  <div class="desktop-container">
    <!-- Snap Preview Overlay -->
    <div 
      v-if="snapPreviewZone"
      class="snap-preview"
      :class="snapPreviewZone"
    />
    
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
      @drag-move="handleWindowDragMove"
      @drag-end="handleWindowDragEnd"
      @unsnap="handleWindowUnsnap"
    />
    
    <!-- Dock Menu -->
    <div 
      class="floatingMenuDockContainer glass"
      :class="{ 'dock-hidden': !isDockVisible }"
    >
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

/* Snap Preview Overlay */
.snap-preview {
  position: fixed;
  background: rgba(59, 130, 246, 0.2);
  border: 3px solid rgba(59, 130, 246, 0.6);
  pointer-events: none;
  z-index: 9998;
  transition: all 0.15s ease;
  border-radius: 8px;
}

.snap-preview.left {
  left: 0;
  top: 0;
  width: 50%;
  height: 100%;
}

.snap-preview.right {
  right: 0;
  top: 0;
  width: 50%;
  height: 100%;
}

.snap-preview.top {
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}

.snap-preview.top-left {
  left: 0;
  top: 0;
  width: 50%;
  height: 50%;
}

.snap-preview.top-right {
  right: 0;
  top: 0;
  width: 50%;
  height: 50%;
}

.snap-preview.bottom-left {
  left: 0;
  bottom: 0;
  width: 50%;
  height: 50%;
}

.snap-preview.bottom-right {
  right: 0;
  bottom: 0;
  width: 50%;
  height: 50%;
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
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
  transform: translateY(0);
  opacity: 1;
}

.floatingMenuDockContainer.dock-hidden {
  transform: translateY(calc(100% + var(--app-space-m)));
  opacity: 0;
  pointer-events: none;
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