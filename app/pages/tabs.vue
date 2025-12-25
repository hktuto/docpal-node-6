<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import CommonDesktopWindow from '~/components/common/DesktopWindow.vue'

definePageMeta({
  layout: false, // Handle layout ourselves
})

useHead({
  title: 'Tab Mode - DocPal'
})

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
  isAnimating?: boolean
  isOpening?: boolean
  isClosing?: boolean
  isShaking?: boolean
  // Multi-tab support (optional for backward compatibility)
  tabs?: TabState[]
  activeTabId?: string
}

// Tab ID counter (shared across all windows)
let tabIdCounter = 0
const generateTabId = () => `tab-${tabIdCounter++}`

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
  },
  {
    label: "Chat",
    icon: 'lucide:message-circle',
    url: '/chat',
  },
  {
    label: "Calendar",
    icon: 'lucide:calendar',
    url: '/calendar',
  },
  {
    label: "Files",
    icon: 'lucide:folder',
    url: '/files',
  }
]

const expandState = ref(false)

// Window management (shared with desktop mode)
const windows = ref<WindowState[]>([])
const windowIdCounter = ref(0)
const focusedWindowId = ref<string | null>(null)

// Default window width for card mode
const DEFAULT_CARD_WIDTH = 600
const MIN_WINDOW_WIDTH = 280
const MAX_WINDOW_WIDTH = 720

// Load windows from localStorage (shared with desktop mode)
const loadWindowsState = () => {
  if (!process.client) return
  
  try {
    const saved = localStorage.getItem('desktopWindows')
    const savedCounter = localStorage.getItem('desktopWindowIdCounter')
    
    if (saved) {
      const parsed = JSON.parse(saved)
      windows.value = parsed
      
      // Set first window as focused if none selected
      if (windows.value.length > 0 && !focusedWindowId.value) {
        const firstWindow = windows.value[0]
        if (firstWindow) {
          focusedWindowId.value = firstWindow.id
        }
      }
    }
    
    if (savedCounter) {
      windowIdCounter.value = parseInt(savedCounter, 10)
    }
    
    // Load tab counter
    const savedTabCounter = localStorage.getItem('desktopTabIdCounter')
    if (savedTabCounter) {
      tabIdCounter = parseInt(savedTabCounter, 10)
    }
  } catch (e) {
    console.error('Failed to load windows state:', e)
  }
}

// Save windows state to localStorage (shared with desktop mode)
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
  localStorage.setItem('desktopWindowIdCounter', String(windowIdCounter.value))
  localStorage.setItem('desktopTabIdCounter', String(tabIdCounter))
}, 500)



// Open or focus a window (opens in new tab if focused window exists)
const openWindow = (item: MenuItem, openInTab: boolean = false) => {
  // If openInTab is true and we have a focused window, add tab to it
  if (openInTab && focusedWindowId.value) {
    const focusedWindow = windows.value.find(w => w.id === focusedWindowId.value)
    if (focusedWindow) {
      addTabToWindow(focusedWindow.id, item)
      return
    }
  }
  
  // Check if window already exists (by URL - for backward compatibility)
  const existingWindow = windows.value.find(w => {
    // Check tabs if present
    if (w.tabs && w.activeTabId) {
      const activeTab = w.tabs.find(t => t.id === w.activeTabId)
      return activeTab?.url === item.url
    }
    // Legacy: check window.url
    return w.url === item.url
  })
  
  if (existingWindow) {
    // Focus existing window
    focusedWindowId.value = existingWindow.id
  } else {
    // Create new window with tabs
    const id = `window-${windowIdCounter.value++}`
    const tabId = generateTabId()
    
    const initialTab: TabState = {
      id: tabId,
      url: item.url,
      title: item.label,
      icon: item.icon,
    }
    
    const newWindow: WindowState = {
      id,
      title: item.label,
      icon: item.icon,
      url: item.url, // Keep for backward compatibility
      x: 0,
      y: 0,
      width: DEFAULT_CARD_WIDTH,
      height: window.innerHeight,
      zIndex: 0,
      isMaximized: false,
      isMinimized: false,
      isOpening: true,
      tabs: [initialTab],
      activeTabId: tabId,
    }
    
    windows.value.push(newWindow)
    focusedWindowId.value = id
    
    // Clear opening animation
    setTimeout(() => {
      const win = windows.value.find(w => w.id === id)
      if (win) win.isOpening = false
    }, 300)
  }
  
  saveWindowsState()
}

// Add tab to existing window
const addTabToWindow = (windowId: string, item: MenuItem) => {
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
  const newTab: TabState = {
    id: tabId,
    url: item.url,
    title: item.label,
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

// Close a window
const closeWindow = (id: string) => {
  const index = windows.value.findIndex(w => w.id === id)
  if (index === -1) return
  
  windows.value.splice(index, 1)
  
  // If closing focused window, switch to another
  if (focusedWindowId.value === id) {
    if (windows.value.length > 0) {
      const nextIndex = Math.min(index, windows.value.length - 1)
      const nextWindow = windows.value[nextIndex]
      focusedWindowId.value = nextWindow ? nextWindow.id : null
    } else {
      focusedWindowId.value = null
    }
  }
  
  saveWindowsState()
}

// Focus a window
const focusWindow = (id: string) => {
  focusedWindowId.value = id
}

// Handle menu item click (from CommonMenu) - open in new tab
const handleMenuClick = (item: MenuItem, event: MouseEvent) => {
  // check if ctrl or cmd key is pressed, if ctrl || cmd && shift is pressed, open in new window,
  // if ctrl || cmd && !shift is pressed, open in new tab
  // if no key is pressed, open in current focused tab
  if (event.ctrlKey || event.metaKey) {
    if (event.shiftKey) {
      openWindow(item, false) // false = open in new window
    } else {
      openWindow(item, true) // true = open in tab of focused window
    }
  } else {
    openWindow(item, true) // true = open in tab of focused window
  }
}

// Handle open from query param
const handleOpenQueryParam = () => {
  const route = useRoute()
  const router = useRouter()
  const openPath = route.query.open
  
  if (openPath && typeof openPath === 'string') {
    const existingWindow = windows.value.find(w => w.url === openPath)
    
    if (existingWindow) {
      focusedWindowId.value = existingWindow.id
    } else {
      const menuItem = menu.find(m => m.url === openPath) || {
        label: 'Page',
        icon: 'lucide:file',
        url: openPath
      }
      openWindow(menuItem)
    }
    
    router.replace({ query: {} })
  }
}

// Watch window.width changes to save state (v-model:size handles the binding)
watch(() => windows.value.map(w => w.width), () => {
  saveWindowsState()
}, { deep: true })

// Window event handlers (required by DesktopWindow component)
const handleUpdatePosition = (id: string, x: number, y: number) => {
  // No-op in card mode (windows are in a row)
}

const handleUpdateSize = (id: string, width: number, height: number) => {
  const window = windows.value.find(w => w.id === id)
  if (window) {
    window.width = width
    window.height = height
    saveWindowsState()
  }
}

const handleToggleMaximize = (id: string) => {
  // No-op in card mode (maximize doesn't make sense)
}

const handleUpdatePageTitle = (id: string, pageTitle: string) => {
  const window = windows.value.find(w => w.id === id)
  if (window) {
    window.currentPageTitle = pageTitle
    saveWindowsState()
  }
}

const handleUpdateUrl = (id: string, url: string) => {
  const window = windows.value.find(w => w.id === id)
  if (window) {
    window.url = url
    saveWindowsState()
  }
}

const handleDragMove = () => {
  // No-op in card mode
}

const handleDragEnd = () => {
  // No-op in card mode
}

const handleUnsnap = () => {
  // No-op in card mode
}

const handleShortcutCommand = () => {
  // No-op in card mode
}

const handleOpenNewWindow = (url: string) => {
  // In tab mode, open in new tab of focused window
  const menuItem = menu.find(m => m.url === url) || {
    label: 'Page',
    icon: 'lucide:file',
    url: url
  }
  openWindow(menuItem, true) // true = open in tab
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
      const menuItem = menu.find(m => m.url === url) || {
        label: 'Page',
        icon: 'lucide:file',
        url: url
      }
      openWindow(menuItem, false)
    } else if (isCtrlOrMeta) {
      // Ctrl/Cmd = Open in new tab (of focused window)
      const menuItem = menu.find(m => m.url === url) || {
        label: 'Page',
        icon: 'lucide:file',
        url: url
      }
      openWindow(menuItem, true)
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
  const menuItem = menu.find(m => m.url === url) || {
    label: 'Page',
    icon: 'lucide:file',
    url: url
  }
  
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
      openWindow(menuItem, true)
      break
    case 'window':
      // Open in new window
      openWindow(menuItem, false)
      break
  }
}

// Initialize
onMounted(() => {
  // Listen for messages from iframes
  window.addEventListener('message', handleIframeMessage)
  
  loadWindowsState()
  nextTick(() => {
    handleOpenQueryParam()
  })
})

onUnmounted(() => {
  window.removeEventListener('message', handleIframeMessage)
})
</script>

<template>
  <div class="tab-mode-page">
    <div class="tab-mode-container">
      <!-- Left: CommonMenu -->
      <aside class="tab-mode-sidebar">
        <CommonMenu 
          v-model:expandState="expandState"
          :menu="menu"
          :force-desktop="true"
          @menuClick="handleMenuClick"
        />
      </aside>
      
      <!-- Right: Windows Row with Splitter -->
      <div class="tab-mode-content">
        <div v-if="windows.length > 0" class="windows-splitter-wrapper">
          <el-splitter 
            class="windows-splitter"
            direction="horizontal"
          >
            <el-splitter-panel
              v-for="(window, index) in windows"
              :key="window.id"
              v-model:size="window.width"
              :min="MIN_WINDOW_WIDTH"
            >
              <CommonDesktopWindow
                :window="window"
                :is-focused="window.id === focusedWindowId"
                :disable-minimize="true"
                :card-mode="true"
                @close="closeWindow"
                @focus="focusWindow"
                @minimize="() => {}"
                @update-position="handleUpdatePosition"
                @update-size="handleUpdateSize"
                @toggle-maximize="handleToggleMaximize"
                @update-page-title="handleUpdatePageTitle"
                @update-url="handleUpdateUrl"
                @drag-move="handleDragMove"
                @drag-end="handleDragEnd"
                @unsnap="handleUnsnap"
                @shortcut-command="handleShortcutCommand"
                @open-new-window="handleOpenNewWindow"
                @switch-tab="switchTab"
                @close-tab="closeTab"
                @new-tab="newTab"
                @update-tab-title="updateTabTitle"
                @update-tab-url="updateTabUrl"
              />
            </el-splitter-panel>
          </el-splitter>
        </div>
        
        <!-- Empty state -->
        <div v-if="windows.length === 0" class="windows-empty">
          <Icon name="lucide:layout" size="48" />
          <p>No windows open</p>
          <p class="windows-empty-hint">Click a menu item to open a window</p>
        </div>
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

<style lang="scss" scoped>
.tab-mode-page {
  height: 100dvh;
  overflow: hidden;
  background: var(--app-grey-950);
}

.tab-mode-container {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.tab-mode-sidebar {
  flex-shrink: 0;
  background: var(--app-bg-color);
  border-right: 1px solid var(--app-border-color);
}

.tab-mode-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.windows-splitter-wrapper {
  flex: 1;
  overflow: hidden;
  height: 100%;
}

.windows-splitter {
  height: 100%;
  
  :deep(.el-splitter__wrapper) {
    height: 100%;
  }
  
  :deep(.el-splitter-panel) {
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: var(--app-space-s);
  }
  
  :deep(.el-splitter__bar) {
    width: 4px;
    background: var(--app-border-color);
    cursor: col-resize;
    position: relative;
    
    &::before {
      content: '';
      position: absolute;
      left: -4px;
      right: -4px;
      top: 0;
      bottom: 0;
      background: transparent;
    }
    
    &:hover {
      background: var(--app-primary-color);
    }
  }
}

.windows-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--app-text-color-secondary);
  gap: var(--app-space-m);
  
  .windows-empty-hint {
    font-size: var(--app-font-size-s);
    color: var(--app-text-color-placeholder);
  }
}
</style>
