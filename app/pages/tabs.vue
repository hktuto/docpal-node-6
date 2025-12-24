<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import CommonDesktopWindow from '~/components/common/DesktopWindow.vue'

definePageMeta({
  layout: false, // Handle layout ourselves
})

useHead({
  title: 'Tab Mode - DocPal'
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
  isAnimating?: boolean
  isOpening?: boolean
  isClosing?: boolean
  isShaking?: boolean
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
    url: win.url,
    x: win.x,
    y: win.y,
    width: win.width,
    height: win.height,
    isMaximized: win.isMaximized,
    isMinimized: win.isMinimized,
    savedState: win.savedState,
    currentPageTitle: win.currentPageTitle,
  }))
  
  localStorage.setItem('desktopWindows', JSON.stringify(state))
  localStorage.setItem('desktopWindowIdCounter', String(windowIdCounter.value))
}, 500)

// Open or focus a window
const openWindow = (item: MenuItem) => {
  // Check if window already exists
  const existingWindow = windows.value.find(w => w.url === item.url)
  
  if (existingWindow) {
    // Focus existing window
    focusedWindowId.value = existingWindow.id
  } else {
    // Create new window
    const id = `window-${windowIdCounter.value++}`
    const newWindow: WindowState = {
      id,
      title: item.label,
      icon: item.icon,
      url: item.url,
      x: 0,
      y: 0,
      width: DEFAULT_CARD_WIDTH,
      height: window.innerHeight - 40, // Full height minus some padding
      zIndex: 0,
      isMaximized: false,
      isMinimized: false,
      isOpening: true,
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

// Handle menu item click (from CommonMenu)
const handleMenuClick = (item: MenuItem) => {
  openWindow(item)
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
  const menuItem = menu.find(m => m.url === url) || {
    label: 'Page',
    icon: 'lucide:file',
    url: url
  }
  openWindow(menuItem)
}

// Initialize
onMounted(() => {
  loadWindowsState()
  nextTick(() => {
    handleOpenQueryParam()
  })
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
</template>

<style lang="scss" scoped>
.tab-mode-page {
  height: 100dvh;
  overflow: hidden;
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
