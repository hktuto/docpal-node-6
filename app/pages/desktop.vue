<script lang="ts" setup>
import { useDebounceFn, useMagicKeys, whenever, useMouse } from '@vueuse/core'
import UserMenu from '~/components/common/menu/UserMenu.vue'
const dockerContainerRef = ref<HTMLElement | null>(null)

const { x:mouseX, y:mouseY } = useMouse({touch: false })

definePageMeta({
  layout: 'desktop',
})

useHead({
  title: 'Desktop - DocPal'
})

// Desktop mode is now auto-detected in layouts when pages load in iframes
// No manual state management needed here

interface TabState {
  id: string
  url: string
  title: string
  icon?: string
  currentPageTitle?: string
}

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
  isAnimating?: boolean // For smooth snap animations
  isOpening?: boolean // For open animation
  isClosing?: boolean // For close animation
  isShaking?: boolean // For shake animation
  // Multi-tab support (optional for backward compatibility)
  tabs?: TabState[]
  activeTabId?: string
}

// Tab ID counter (shared across all windows)
let tabIdCounter = 0
const generateTabId = () => `tab-${tabIdCounter++}`

type MenuItem = {
    label?: string
    icon?: string
    url?: string
    component?: Component
    action?: () => void
    hidden?: () => boolean
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

const settingMenu: MenuItem[] = [
  
  {
    label:"Tab Mode",
    icon:"lucide:layout-list",
    action:() => {
      navigateTo("/tabs")
    }
  },
  {
    component: UserMenu,
  },
]

// Window management
const windows = ref<WindowState[]>([])
const nextZIndex = ref(1000)
const windowIdCounter = ref(0)

// Initialize tab counter from localStorage
if (process.client) {
  try {
    const saved = localStorage.getItem('desktopTabIdCounter')
    if (saved) {
      tabIdCounter = parseInt(saved, 10)
    }
  } catch (e) {
    // Ignore
  }
}

// Compute focused window (highest z-index among non-minimized windows)
const focusedWindowId = computed(() => {
  const visibleWindows = windows.value.filter(w => !w.isMinimized)
  if (visibleWindows.length === 0) return null
  
  return visibleWindows.reduce((maxWindow, window) => 
    window.zIndex > maxWindow.zIndex ? window : maxWindow
  ).id
})

// Dock visibility management
const isDockVisible = ref(true)
// calculate the offset of the docker container
const dockerContainerOffset = ref({ x: 0, y: 0 })
const circleSize = 300 // Circle diameter in pixels

watch(() => [isDockVisible.value, mouseX.value, mouseY.value], () => {
  if (!dockerContainerRef.value || !isDockVisible.value) return
  
  // Get dock container's position and dimensions
  const dockRect = dockerContainerRef.value.getBoundingClientRect()
  
  // Convert global mouse position to position relative to dock container
  const relativeX = mouseX.value - dockRect.left
  const relativeY = mouseY.value - dockRect.top
  
  // Center the circle on mouse position (subtract half of circle size)
  const circleX = relativeX - circleSize / 2
  const circleY = relativeY - circleSize / 2
  
  // Apply min/max constraints to keep circle partially visible
  // Allow circle to go slightly outside but keep at least 30% visible
  const minVisibleAmount = circleSize * 0.3
  const minX = -circleSize + minVisibleAmount
  const maxX = dockRect.width - minVisibleAmount
  const minY = -circleSize + minVisibleAmount
  const maxY = dockRect.height - minVisibleAmount
  
  // Clamp values within range
  dockerContainerOffset.value = {
    x: Math.max(minX, Math.min(maxX, circleX)),
    y: Math.max(minY, Math.min(maxY, circleY))
  }
}, {
  immediate: true
})
const isDockForceVisible = ref(false) // When mouse hovers at bottom
const dockHideTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const DOCK_HEIGHT = 100 // Approximate dock height
const HOVER_THRESHOLD = 50 // Pixels from bottom to trigger show
const bouncingDockItems = ref(new Set<string>()) // Track bouncing dock items

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
  
  // Enable animation for smooth snap
  window.isAnimating = true
  
  // Apply snap position
  window.x = position.x
  window.y = position.y
  window.width = position.width
  window.height = position.height
  window.isMaximized = (zone === 'top') // Top edge = maximize
  
  // Disable animation after transition completes
  setTimeout(() => {
    window.isAnimating = false
  }, 300)
  
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
// open a new url in a new window
const openUrl = (url: string) => {
  openWindow({
    label: url.split('/').pop() || 'Page',
    icon: 'lucide:file',
    url: url
  })
}
// Open a new window (with tabs support)
const openWindow = (item: MenuItem, openInTab: boolean = false) => {
  // If openInTab is true, try to open in focused window
  if (openInTab) {
    const focusedWindow = getFocusedWindow()
    if (focusedWindow) {
      addTabToWindow(focusedWindow.id, item)
      return
    }
  }
  
  // Trigger dock bounce animation
  bouncingDockItems.value.add(item.label as string)
  setTimeout(() => {
    bouncingDockItems.value.delete(item.label as string)
  }, 600)
  
  const id = `window-${windowIdCounter.value++}`
  const tabId = generateTabId()
  
  // Calculate optimal size and position
  const { width, height } = calculateWindowSize()
  const { x, y } = calculateWindowPosition(width, height, windows.value.length)
  
  // Create window with tabs (always use tabs for new windows)
  const initialTab: TabState = {
    id: tabId,
    url: item.url || '',
    title: item.label || 'New Tab',
    icon: item.icon,
  }
  
  const newWindow: WindowState = {
    id,
    title: item.label || 'New Window', // Window title (fallback)
    icon: item.icon,
    url: item.url || '', // Keep for backward compatibility
    x,
    y,
    width,
    height,
    zIndex: nextZIndex.value++,
    isMaximized: false,
    isMinimized: false,
    isOpening: true, // Enable open animation
    tabs: [initialTab],
    activeTabId: tabId,
  }
  
  windows.value.push(newWindow)
  
  // Disable opening animation after it completes
  setTimeout(() => {
    newWindow.isOpening = false
  }, 300)
  
  checkDockOverlap()
  saveWindowsState()
}

// Add tab to existing window
const addTabToWindow = (windowId: string, item: MenuItem) => {
  const window = windows.value.find(w => w.id === windowId)
  if (!window) return
  
  // Initialize tabs if not present (migrate from single-tab mode)
  if (!window.tabs || !window.activeTabId) {
    const initialTabId = generateTabId()
    window.tabs = [{
      id: initialTabId,
      url: window.url,
      title: window.title,
      icon: window.icon,
      currentPageTitle: window.currentPageTitle,
    }]
    window.activeTabId = initialTabId
  }
  
  const tabId = generateTabId()
  const newTab: TabState = {
    id: tabId,
    url: item.url || '',
    title: item.label || 'New Tab',
    icon: item.icon,
  }
  
  window.tabs.push(newTab)
  window.activeTabId = tabId
  saveWindowsState()
}

// Switch active tab in window
const switchTab = (windowId: string, tabId: string) => {
  const window = windows.value.find(w => w.id === windowId)
  if (!window || !window.tabs) return
  
  const tab = window.tabs.find(t => t.id === tabId)
  if (!tab) return
  
  window.activeTabId = tabId
  saveWindowsState()
}

// Close tab
const closeTab = (windowId: string, tabId: string) => {
  const window = windows.value.find(w => w.id === windowId)
  if (!window || !window.tabs) return
  
  // Don't close if it's the last tab - close the window instead
  if (window.tabs.length === 1) {
    closeWindow(windowId)
    return
  }
  
  const tabIndex = window.tabs.findIndex(t => t.id === tabId)
  if (tabIndex === -1) return
  
  window.tabs.splice(tabIndex, 1)
  
  // If closing active tab, switch to another
  if (window.activeTabId === tabId) {
    const newActiveIndex = Math.min(tabIndex, window.tabs.length - 1)
    window.activeTabId = window.tabs[newActiveIndex]?.id || window.tabs[0]?.id
  }
  
  saveWindowsState()
}

// New tab in window
const newTab = (windowId: string) => {
  const window = windows.value.find(w => w.id === windowId)
  if (!window) return
  
  // Initialize tabs if not present
  if (!window.tabs || !window.activeTabId) {
    const initialTabId = generateTabId()
    window.tabs = [{
      id: initialTabId,
      url: window.url || '/',
      title: window.title || 'New Tab',
      icon: window.icon,
      currentPageTitle: window.currentPageTitle,
    }]
    window.activeTabId = initialTabId
  }
  
  const tabId = generateTabId()
  const newTabState: TabState = {
    id: tabId,
    url: '/', // Default to home
    title: 'New Tab',
    icon: 'lucide:file',
  }
  
  window.tabs.push(newTabState)
  window.activeTabId = tabId
  saveWindowsState()
}

// Update tab title
const updateTabTitle = (windowId: string, tabId: string, pageTitle: string) => {
  const window = windows.value.find(w => w.id === windowId)
  if (!window || !window.tabs) return
  
  const tab = window.tabs.find(t => t.id === tabId)
  if (tab) {
    tab.currentPageTitle = pageTitle
    saveWindowsState()
  }
}

// Update tab URL
const updateTabUrl = (windowId: string, tabId: string, url: string) => {
  const window = windows.value.find(w => w.id === windowId)
  if (!window || !window.tabs) return
  
  const tab = window.tabs.find(t => t.id === tabId)
  if (tab) {
    tab.url = url
    saveWindowsState()
  }
}

// Shake window for invalid action
const shakeWindow = (id: string) => {
  const window = windows.value.find(w => w.id === id)
  if (!window) return
  
  window.isShaking = true
  setTimeout(() => {
    window.isShaking = false
  }, 500)
}

// Close a window
const closeWindow = (id: string) => {
  const window = windows.value.find(w => w.id === id)
  if (!window) return
  
  // Trigger close animation
  window.isClosing = true
  
  // Wait for animation to complete before removing
  setTimeout(() => {
    const index = windows.value.findIndex(w => w.id === id)
    if (index !== -1) {
      windows.value.splice(index, 1)
      checkDockOverlap()
      saveWindowsState()
    }
  }, 250) // Slightly shorter than animation duration for snappier feel
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

// Update window URL when iframe navigates
const updateWindowUrl = (id: string, url: string) => {
  const window = windows.value.find(w => w.id === id)
  if (window) {
    window.url = url
    saveWindowsState() // Save immediately when URL changes
  }
}

// Handle keyboard shortcut commands from iframe
const handleShortcutCommand = (id: string, command: string) => {
  const window = windows.value.find(w => w.id === id)
  if (!window) return
  
  switch (command) {
    case 'snap-left':
      snapWindow(id, 'left')
      break
    case 'snap-right':
      snapWindow(id, 'right')
      break
    case 'maximize':
      if (!window.isMaximized) {
        toggleMaximize(id)
      }
      break
    case 'exit-snap':
      // Exit snap/fullscreen logic (same as down arrow)
      if (window.isMaximized) {
        toggleMaximize(id)
      } else if (window.savedState) {
        const saved = window.savedState
        window.isAnimating = true
        window.x = saved.x
        window.y = saved.y
        window.width = saved.width
        window.height = saved.height
        window.savedState = undefined
        setTimeout(() => {
          window.isAnimating = false
        }, 300)
        checkDockOverlap()
        saveWindowsState()
      } else {
        shakeWindow(id)
      }
      break
    case 'close-window':
      closeWindow(id)
      break
  }
}

// Handle open new window request (from Ctrl+Click or middle-click)
const handleOpenNewWindow = (url: string, openInTab: boolean = false) => {
  // Find matching menu item or create custom one
  const menuItem = menu.find(item => item.url === url)
  
  if (menuItem) {
    openWindow(menuItem, openInTab)
  } else {
    // Create custom window/tab for any URL
    const customItem: MenuItem = {
      label: url.split('/').pop() || 'Page',
      icon: 'lucide:file',
      url: url
    }
    openWindow(customItem, openInTab)
  }
}

// Context menu state
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuUrl = ref('')

// Handle navigate message from iframe (with modifiers)
interface NavigateMessage {
  type: 'navigate'
  url: string
  modifiers: {
    ctrl: boolean
    meta: boolean
    shift: boolean
    alt: boolean
    keys: string[]
  }
}

interface ShowContextMenuMessage {
  type: 'show-context-menu'
  url: string
  x: number
  y: number
}

const handleIframeMessage = (event: MessageEvent) => {
  if (!event.data || !event.data.type) return
  
  const message = event.data
  
  // Handle navigation with modifiers
  if (message.type === 'navigate') {
    const navMessage = message as NavigateMessage
    const { url, modifiers } = navMessage
    
    // Determine action based on modifiers
    const isCtrlOrMeta = modifiers.ctrl || modifiers.meta
    
    if (isCtrlOrMeta && modifiers.shift) {
      // Ctrl/Cmd + Shift = Open in new window
      handleOpenNewWindow(url, false)
    } else if (isCtrlOrMeta) {
      // Ctrl/Cmd = Open in new tab (of focused window)
      handleOpenNewWindow(url, true)
    }
    // Note: No modifiers case removed - iframe handles it with Vue Router (SPA navigation)
  }
  
  // Handle context menu request
  if (message.type === 'show-context-menu') {
    const contextMessage = message as ShowContextMenuMessage
    contextMenuUrl.value = contextMessage.url
    contextMenuX.value = contextMessage.x
    contextMenuY.value = contextMessage.y
    contextMenuVisible.value = true
  }
}

// Handle context menu navigation
const handleContextMenuNavigate = (url: string, target: 'current' | 'tab' | 'window') => {
  switch (target) {
    case 'current':
      // Navigate current tab - update URL directly
      // TabContent's intelligent watcher will handle it without reload if iframe is already at this URL
      const focusedWindow = windows.value.find(w => w.id === focusedWindowId.value)
      if (focusedWindow && focusedWindow.tabs && focusedWindow.activeTabId) {
        const activeTab = focusedWindow.tabs.find(t => t.id === focusedWindow.activeTabId)
        if (activeTab) {
          activeTab.url = url
          saveWindowsState()
        }
      }
      break
    case 'tab':
      // Open in new tab
      handleOpenNewWindow(url, true)
      break
    case 'window':
      // Open in new window
      handleOpenNewWindow(url, false)
      break
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
    url: win.url, // Keep for backward compatibility
    x: win.x,
    y: win.y,
    width: win.width,
    height: win.height,
    isMaximized: win.isMaximized,
    isMinimized: win.isMinimized,
    savedState: win.savedState,
    currentPageTitle: win.currentPageTitle,
    // Include tabs if present
    tabs: win.tabs,
    activeTabId: win.activeTabId,
  }))
  
  localStorage.setItem('desktopWindows', JSON.stringify(state))
  localStorage.setItem('desktopNextZIndex', String(nextZIndex.value))
  localStorage.setItem('desktopWindowIdCounter', String(windowIdCounter.value))
  localStorage.setItem('desktopTabIdCounter', String(tabIdCounter))
}, 500)

// Load windows state from localStorage
// Open default home window for first-time users
const openDefaultHomeWindow = () => {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // Calculate centered position with comfortable size
  const width = Math.min(900, viewportWidth - 200)
  const height = Math.min(600, viewportHeight - 200)
  const x = (viewportWidth - width) / 2
  const y = Math.max(50, (viewportHeight - height) / 2 - 50) // Slightly above center
  
  const defaultWindow: MenuItem = {
    label: 'Home',
    icon: 'lucide:home',
    url: '/'
  }
  
  // Create window with custom position
  const id = `window-${windowIdCounter.value++}`
  
  const tabId = generateTabId()
  const initialTab: TabState = {
    id: tabId,
    url: defaultWindow.url as string,
    title: defaultWindow.label as string,
    icon: defaultWindow.icon,
  }
  
  windows.value.push({
    id,
    title: defaultWindow.label as string,
    currentPageTitle: undefined,
    icon: defaultWindow.icon as string,
    url: defaultWindow.url as string, // Keep for backward compatibility
    x,
    y,
    width,
    height,
    zIndex: nextZIndex.value++,
    isMaximized: false,
    isMinimized: false,
    isOpening: true, // Trigger open animation
    tabs: [initialTab],
    activeTabId: tabId,
  })
  
  // Clear opening animation after a short delay
  setTimeout(() => {
    const win = windows.value.find(w => w.id === id)
    if (win) win.isOpening = false
  }, 300)
  
  // Save to localStorage
  saveWindowsState()
}

const loadWindowsState = () => {
  if (!process.client) return
  
  try {
    const savedWindows = localStorage.getItem('desktopWindows')
    const savedNextZIndex = localStorage.getItem('desktopNextZIndex')
    const savedIdCounter = localStorage.getItem('desktopWindowIdCounter')
    
    if (savedWindows) {
      const parsed = JSON.parse(savedWindows)
      if (parsed.length > 0) {
        // Load saved windows
        windows.value = parsed.map((win: any, index: number) => ({
          ...win,
          zIndex: 1000 + index // Re-assign z-index in order
        }))
      } else {
        // No saved windows - open default home window
        openDefaultHomeWindow()
      }
    } else {
      // No localStorage data at all - first time user
      openDefaultHomeWindow()
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
    // On error, also open default window for better UX
    openDefaultHomeWindow()
  }
}

// Dock trigger zone handlers (better than mousemove - works even when iframe has focus)
const handleDockTriggerEnter = () => {
  // Mouse entered the trigger zone at bottom - force show dock
  isDockForceVisible.value = true
  isDockVisible.value = true
  
  // Clear any pending hide timeout
  if (dockHideTimeout.value) {
    clearTimeout(dockHideTimeout.value)
    dockHideTimeout.value = null
  }
}

const handleDockTriggerLeave = () => {
  // Mouse left the trigger zone - schedule hide check
  if (dockHideTimeout.value) {
    clearTimeout(dockHideTimeout.value)
  }
  
  dockHideTimeout.value = setTimeout(() => {
    isDockForceVisible.value = false
    checkDockOverlap() // Re-check if dock should be hidden due to overlap
  }, 1000)
}

// Dock container mouse handlers - keep dock visible when mouse is on dock itself
const handleDockMouseEnter = () => {
  // Mouse is on the dock - keep it visible and cancel any pending hide
  isDockForceVisible.value = true
  isDockVisible.value = true
  
  if (dockHideTimeout.value) {
    clearTimeout(dockHideTimeout.value)
    dockHideTimeout.value = null
  }
}

const handleDockMouseLeave = () => {
  // Mouse left the dock - schedule hide
  if (dockHideTimeout.value) {
    clearTimeout(dockHideTimeout.value)
  }
  
  dockHideTimeout.value = setTimeout(() => {
    isDockForceVisible.value = false
    checkDockOverlap()
  }, 500) // Shorter delay when leaving dock directly
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

// Get focused window helper
const getFocusedWindow = () => {
  const visibleWindows = windows.value.filter(w => !w.isMinimized)
  if (visibleWindows.length === 0) return null
  return visibleWindows.sort((a, b) => b.zIndex - a.zIndex)[0]
}

// Setup keyboard shortcuts with useMagicKeys
const keys = useMagicKeys({
  passive: false,
  onEventFired(e) {
    // Prevent default for our shortcuts
    const focusedWindow = getFocusedWindow()
    if (!focusedWindow) return
    
    // Check for our specific key combinations
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.type === 'keydown') {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault()
      }
    }
    if (e.key === 'Escape' || ((e.metaKey || e.ctrlKey) && e.key === 'w')) {
      e.preventDefault()
    }
  },
})

// Snap left: Cmd/Ctrl + Shift + ←
whenever(() => keys.Meta_Shift_ArrowLeft?.value || keys.Ctrl_Shift_ArrowLeft?.value, () => {
  const focusedWindow = getFocusedWindow()
  if (focusedWindow) snapWindow(focusedWindow.id, 'left')
})

// Snap right: Cmd/Ctrl + Shift + →
whenever(() => keys.Meta_Shift_ArrowRight?.value || keys.Ctrl_Shift_ArrowRight?.value, () => {
  const focusedWindow = getFocusedWindow()
  if (focusedWindow) snapWindow(focusedWindow.id, 'right')
})

// Maximize: Cmd/Ctrl + Shift + ↑
whenever(() => keys.Meta_Shift_ArrowUp?.value || keys.Ctrl_Shift_ArrowUp?.value, () => {
  const focusedWindow = getFocusedWindow()
  if (focusedWindow && !focusedWindow.isMaximized) {
    toggleMaximize(focusedWindow.id)
  }
})

// Exit snap/fullscreen: Cmd/Ctrl + Shift + ↓
whenever(() => keys.Meta_Shift_ArrowDown?.value || keys.Ctrl_Shift_ArrowDown?.value, () => {
  const focusedWindow = getFocusedWindow()
  if (!focusedWindow) return
  
  // If maximized, restore from maximize
  if (focusedWindow.isMaximized) {
    toggleMaximize(focusedWindow.id)
    return
  }
  
  // If snapped (has saved state), unsnap to original size
  if (focusedWindow.savedState) {
    const saved = focusedWindow.savedState
    
    // Enable animation for smooth restore
    focusedWindow.isAnimating = true
    
    // Restore original size and position
    focusedWindow.x = saved.x
    focusedWindow.y = saved.y
    focusedWindow.width = saved.width
    focusedWindow.height = saved.height
    focusedWindow.savedState = undefined
    
    // Disable animation after transition
    setTimeout(() => {
      focusedWindow.isAnimating = false
    }, 300)
    
    checkDockOverlap()
    saveWindowsState()
    return
  }
  
  // If not maximized or snapped, shake to indicate no action
  shakeWindow(focusedWindow.id)
})

// Close: Escape or Cmd/Ctrl + W
whenever(() => keys.Escape?.value || keys.Meta_W?.value || keys.Ctrl_W?.value, () => {
  const focusedWindow = getFocusedWindow()
  if (focusedWindow) closeWindow(focusedWindow.id)
})

// Handle opening window from query param (e.g., ?open=/workspaces/...)
const handleOpenQueryParam = () => {
  const route = useRoute()
  const router = useRouter()
  const openPath = route.query.open
  
  if (openPath && typeof openPath === 'string') {
    // Check if a window with this URL already exists
    const existingWindow = windows.value.find(w => w.url === openPath && !w.isMinimized)
    
    if (existingWindow) {
      // Focus existing window
      focusWindow(existingWindow.id)
    } else {
      // Open new window
      const defaultWindow: MenuItem = {
        label: 'Page',
        icon: 'lucide:file',
        url: openPath
      }
      openWindow(defaultWindow)
    }
    
    // Clean up query param after handling
    router.replace({ query: {} })
  }
}

// Listen for viewport resize
onMounted(() => {
  window.addEventListener('resize', debouncedResize)
  
  // Listen for messages from iframes
  window.addEventListener('message', handleIframeMessage)
  
  // Load saved windows state first
  loadWindowsState()
  
  // Then handle query param (needs to be after loadWindowsState to check existing windows)
  nextTick(() => {
    handleOpenQueryParam()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', debouncedResize)
  window.removeEventListener('message', handleIframeMessage)
})

onUnmounted(() => {
  window.removeEventListener('resize', debouncedResize)
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
    >

    </div>
    
    <!-- Windows (render all, hide minimized with CSS to preserve iframe state) -->
    <CommonDesktopWindow
      v-for="window in windows"
      :key="window.id"
      :window="window"
      :is-focused="window.id === focusedWindowId"
      @close="closeWindow"
      @focus="focusWindow"
      @minimize="minimizeWindow"
      @update-position="updateWindowPosition"
      @update-size="updateWindowSize"
      @toggle-maximize="toggleMaximize"
      @update-page-title="updatePageTitle"
      @update-url="updateWindowUrl"
      @drag-move="handleWindowDragMove"
      @drag-end="handleWindowDragEnd"
      @unsnap="handleWindowUnsnap"
      @shortcut-command="handleShortcutCommand"
      @open-new-window="handleOpenNewWindow"
      @switch-tab="switchTab"
      @close-tab="closeTab"
      @new-tab="newTab"
      @update-tab-title="updateTabTitle"
      @update-tab-url="updateTabUrl"
    />
    
    <!-- Dock Trigger Zone (invisible area to show dock even when iframe has focus) -->
    <div 
      class="dock-trigger-zone"
      @mouseenter="handleDockTriggerEnter"
      @mouseleave="handleDockTriggerLeave"
    ></div>
    
    <!-- Dock Menu -->
    <div 
      class="floatingMenuDockContainer"
      ref="dockerContainerRef"
      :class="{ 'dock-hidden': !isDockVisible }"
      @mouseenter="handleDockMouseEnter"
      @mouseleave="handleDockMouseLeave"
    >
      <!-- App Icons -->
      <div 
        v-for="item in menu" 
        :key="item.label" 
        class="dockItem"
        :class="{ bouncing: bouncingDockItems.has(item.label as string) }"
        @click="openWindow(item)"
        :title="item.label"
      >
        <Icon v-if="item.icon" :name="item.icon" />
        <span>{{ item.label }}</span>
      </div>
      <div class="mouseOverCircle" 
      :style="{ 
        left: `${dockerContainerOffset.x}px`,
        top: `${dockerContainerOffset.y}px`,
        width: `${circleSize}px`,
        height: `${circleSize}px`
      }"></div>
      <div class="dockSeparator"> </div>
      <template v-for="(item,index) in settingMenu" :key="index">
        <component v-if="item.component" :is="item.component" :expandState="false" @openUrl="openUrl"/>
        <div 
          v-else-if="!item.hidden || !item.hidden()"
          class="dockItem"
          :class="{ bouncing: bouncingDockItems.has(item.label || '') }"
          @click="item.action ? item.action() : openWindow(item)"
          :title="item.label"
        >
          <Icon v-if="item.icon" :name="item.icon" />
          <span v-if="item.label">{{ item.label }}</span>
        </div>
      </template>
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
      </div>
    </div>
  </div>
  
  <!-- Context Menu -->
  <CommonContextMenu
    :visible="contextMenuVisible"
    :x="contextMenuX"
    :y="contextMenuY"
    :url="contextMenuUrl"
    @close="contextMenuVisible = false"
    @navigate="handleContextMenuNavigate"
  />
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

/* Dock Trigger Zone - invisible area at bottom to trigger dock visibility */
.dock-trigger-zone {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 5px; /* Very thin - just enough to detect mouse entry */
  z-index: 10000; /* Above everything including windows */
  background: transparent;
  pointer-events: auto; /* Capture mouse events even over iframes */
  cursor: default;
}

/* Snap Preview Overlay */
.snap-preview {
  position: fixed;
  background: rgba(59, 130, 246, 0.15);
  border: 3px solid rgba(59, 130, 246, 0.5);
  pointer-events: none;
  z-index: 9998;
  transition: all 0.15s ease;
  border-radius: 12px;
  animation: snap-appear 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 
    0 0 30px rgba(59, 130, 246, 0.4),
    inset 0 0 60px rgba(59, 130, 246, 0.15);
}
.mouseOverCircle{
  position: absolute;
  border-radius: 50%;
  background-image: radial-gradient(circle closest-side, rgba(255, 255, 255, 0.5) 0%, transparent 100%);
  pointer-events: none;
  z-index: -1;
}


@keyframes glow-pulse {
  0%, 100% { 
    opacity: 0.5;
    transform: scale(1);
  }
  50% { 
    opacity: 1;
    transform: scale(1.02);
  }
}

@keyframes snap-appear {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}



@keyframes label-bounce {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
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
  
  border: 1px solid rgba(255, 255, 255, 0.31);
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
  gap: var(--app-space-m);
  padding: var(--app-space-s) var(--app-space-m);
  border-radius: 16px;
  background: rgba(231, 231, 231, 0.3);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  z-index: 9999;
  position: relative;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
  transform: translateY(0);
  opacity: 1;
  overflow: hidden;
  isolation: isolate;

}
.user-menu{
    width: auto;
  }

.floatingMenuDockContainer.dock-hidden {
  transform: translateY(calc(100% + var(--app-space-m)));
  opacity: 0;
  pointer-events: none;
}

.dockItem {
  
  --color: var(--app-text-color-regular);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--app-space-xxs);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  min-width: 40px;
  color: var(--color);
  font-size: var(--app-font-size-s);
}

.dockItem:hover {
  /* background: rgba(255, 255, 255, 0.25); */
  --color: var(--app-text-color-primary);
  transform: scale(1.1);
  /* font-size: calc(var(--app-font-size-s) * 1.4); */
  /* box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3); */
}

.dockItem:active {
  transform: translateY(-6px) scale(1.02);
}

.dockItem.bouncing {
  animation: dock-bounce 1.0s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes dock-bounce {
  0%, 100% { 
    transform: translateY(0) scale(1);
  }
  20% { 
    transform: translateY(-20px) scale(1.05);
  }
  40% { 
    transform: translateY(-8px) scale(1.02);
  }
  60% { 
    transform: translateY(-15px) scale(1.04);
  }
  80% { 
    transform: translateY(-5px) scale(1.01);
  }
}

.dockItem span {
  font-weight: 500;
  color: var(--color);
  text-align: center;
  white-space: nowrap;
}

/* .dockItem :deep(svg) {
  width: var(--icon-size);
  height: var(--icon-size);
  color: var(--color);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
} */

.dockSeparator {
  width: 2px;
  height: 100%;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 1px;
  margin: 0 8px;
  align-self: center;
}

.dockItem.minimizedWindow {
  position: relative;
  /* background: rgba(255, 255, 255, 0.2); */
  /* border: 2px solid rgba(255, 255, 255, 0.4); */
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