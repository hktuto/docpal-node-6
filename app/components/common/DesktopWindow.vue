<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import TabHeader from './DesktopWindow/TabHeader.vue'
import TabContent from './DesktopWindow/TabContent.vue'

export interface TabState {
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

interface Props {
  window: WindowState
  isFocused?: boolean
  disableMinimize?: boolean // Disable minimize button
  cardMode?: boolean // Card mode: disable drag/resize, show as card
}

const props = defineProps<Props>()

const cardMode = computed(() => props.cardMode ?? false)
const emit = defineEmits<{
  close: [id: string]
  focus: [id: string]
  minimize: [id: string]
  updatePosition: [id: string, x: number, y: number]
  updateSize: [id: string, width: number, height: number]
  toggleMaximize: [id: string]
  updatePageTitle: [id: string, pageTitle: string]
  updateUrl: [id: string, url: string]
  dragMove: [id: string, x: number, y: number]
  dragEnd: [id: string, x: number, y: number]
  unsnap: [id: string, cursorX: number, cursorY: number]
  shortcutCommand: [id: string, command: string]
  openNewWindow: [url: string]
  // Tab operations
  'switch-tab': [windowId: string, tabId: string]
  'close-tab': [windowId: string, tabId: string]
  'new-tab': [windowId: string]
  'update-tab-title': [windowId: string, tabId: string, title: string]
  'update-tab-url': [windowId: string, tabId: string, url: string]
}>()

// Check if window uses tabs
const hasTabs = computed(() => {
  return props.window.tabs && props.window.tabs.length > 0 && props.window.activeTabId
})

// Get active tab
const activeTab = computed(() => {
  if (!hasTabs.value) return null
  return props.window.tabs!.find(t => t.id === props.window.activeTabId!)
})

// Get display title/icon (from active tab if tabs exist, otherwise from window)
const displayTitle = computed(() => {
  if (hasTabs.value && activeTab.value) {
    return activeTab.value.currentPageTitle || activeTab.value.title
  }
  return props.window.currentPageTitle || props.window.title
})

const displayIcon = computed(() => {
  if (hasTabs.value && activeTab.value) {
    return activeTab.value.icon
  }
  return props.window.icon
})

const displayUrl = computed(() => {
  if (hasTabs.value && activeTab.value) {
    return activeTab.value.url
  }
  return props.window.url
})

// Dragging state
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragStartWindowX = ref(0)
const dragStartWindowY = ref(0)
const dragOffset = ref({ x: 0, y: 0 })
const hasUnsnapOccurred = ref(false) // Track if unsnap happened during this drag
const UNSNAP_THRESHOLD = 5 // Pixels to move before triggering unsnap

// Resizing state
const isResizing = ref(false)
const resizeHandle = ref<string>('')
const resizeStartX = ref(0)
const resizeStartY = ref(0)
const resizeStartWidth = ref(0)
const resizeStartHeight = ref(0)
const resizeStartLeft = ref(0)
const resizeStartTop = ref(0)

// Saved state for maximize/restore
const savedState = ref<{ x: number, y: number, width: number, height: number } | null>(null)

// Start dragging
const startDrag = (e: MouseEvent) => {
  // Don't allow dragging in card mode
  if (props.cardMode) return
  
  isDragging.value = true
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
  hasUnsnapOccurred.value = false // Reset unsnap flag
  
  // If window is maximized, restore it first and position under cursor
  if (props.window.isMaximized) {
    emit('toggleMaximize', props.window.id)
    
    // Wait for maximize toggle to complete
    nextTick(() => {
      // Position window so cursor is in the middle of title bar
      const newX = e.clientX - (props.window.width / 2)
      const newY = e.clientY - 20 // Approximate title bar half height
      
      dragStartWindowX.value = newX
      dragStartWindowY.value = newY
      
      // Update window position immediately
      emit('updatePosition', props.window.id, newX, newY)
    })
  } else {
    // For snapped windows, don't unsnap yet - wait for actual drag movement
    dragStartWindowX.value = props.window.x
    dragStartWindowY.value = props.window.y
  }
  
  dragOffset.value = { x: 0, y: 0 }
  
  emit('focus', props.window.id)
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  
  e.preventDefault()
}

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return
  
  // Safety check: if mouse button is not pressed, treat as drag end
  // This handles cases where mouseup event was missed (e.g., mouse left browser)
  if (e.buttons === 0) {
    stopDrag()
    return
  }
  
  const deltaX = e.clientX - dragStartX.value
  const deltaY = e.clientY - dragStartY.value
  
  // Check if window is snapped and should be unsnapped
  const isSnapped = props.window.savedState && !props.window.isMaximized
  if (isSnapped && !hasUnsnapOccurred.value) {
    // Check if moved beyond threshold
    const distanceMoved = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    if (distanceMoved > UNSNAP_THRESHOLD) {
      // Trigger unsnap
      hasUnsnapOccurred.value = true
      emit('unsnap', props.window.id, e.clientX, e.clientY)
      
      // Wait for unsnap to complete, then update start positions
      nextTick(() => {
        dragStartWindowX.value = props.window.x
        dragStartWindowY.value = props.window.y
        dragStartX.value = e.clientX
        dragStartY.value = e.clientY
        dragOffset.value = { x: 0, y: 0 }
      })
      return // Skip this frame
    }
  }
  
  // Update offset for transform (no reactivity overhead)
  dragOffset.value = { x: deltaX, y: deltaY }
  
  // Emit drag move event for snap detection (use cursor position, not window position)
  emit('dragMove', props.window.id, e.clientX, e.clientY)
}

const stopDrag = () => {
  if (isDragging.value && (dragOffset.value.x !== 0 || dragOffset.value.y !== 0)) {
    // Get final cursor position for snap detection
    const finalX = dragStartX.value + dragOffset.value.x
    const finalY = dragStartY.value + dragOffset.value.y
    
    // Calculate new position from drag
    const newX = dragStartWindowX.value + dragOffset.value.x
    const newY = dragStartWindowY.value + dragOffset.value.y
    
    // IMPORTANT: Update actual position BEFORE clearing transform
    // This prevents visual jump when snapping
    emit('updatePosition', props.window.id, newX, newY)
    
    // Wait for position update, then clear transform and trigger snap
    nextTick(() => {
      // Clear dragging state and transform
      isDragging.value = false
      dragOffset.value = { x: 0, y: 0 }
      
      // Emit drag end event (snap detection happens here and may override position)
      emit('dragEnd', props.window.id, finalX, finalY)
    })
  } else {
    isDragging.value = false
    dragOffset.value = { x: 0, y: 0 }
  }
  
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// Start resizing
const startResize = (handle: string, e: MouseEvent) => {
  // Don't allow resizing in card mode or when maximized
  if (props.cardMode || props.window.isMaximized) return
  
  isResizing.value = true
  resizeHandle.value = handle
  resizeStartX.value = e.clientX
  resizeStartY.value = e.clientY
  resizeStartWidth.value = props.window.width
  resizeStartHeight.value = props.window.height
  resizeStartLeft.value = props.window.x
  resizeStartTop.value = props.window.y
  
  emit('focus', props.window.id)
  
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  
  e.preventDefault()
  e.stopPropagation()
}

const onResize = (e: MouseEvent) => {
  if (!isResizing.value) return
  
  // Safety check: if mouse button is not pressed, treat as resize end
  if (e.buttons === 0) {
    stopResize()
    return
  }
  
  const deltaX = e.clientX - resizeStartX.value
  const deltaY = e.clientY - resizeStartY.value
  
  let newWidth = resizeStartWidth.value
  let newHeight = resizeStartHeight.value
  let newX = resizeStartLeft.value
  let newY = resizeStartTop.value
  
  const minWidth = 300
  const minHeight = 200
  
  // Handle different resize directions
  if (resizeHandle.value.includes('e')) {
    newWidth = Math.max(minWidth, resizeStartWidth.value + deltaX)
  }
  if (resizeHandle.value.includes('w')) {
    newWidth = Math.max(minWidth, resizeStartWidth.value - deltaX)
    if (newWidth > minWidth) {
      newX = resizeStartLeft.value + deltaX
    }
  }
  if (resizeHandle.value.includes('s')) {
    newHeight = Math.max(minHeight, resizeStartHeight.value + deltaY)
  }
  if (resizeHandle.value.includes('n')) {
    newHeight = Math.max(minHeight, resizeStartHeight.value - deltaY)
    if (newHeight > minHeight) {
      newY = resizeStartTop.value + deltaY
    }
  }
  
  // Apply directly (no transitions during resize thanks to CSS)
  emit('updateSize', props.window.id, newWidth, newHeight)
  if (newX !== resizeStartLeft.value || newY !== resizeStartTop.value) {
    emit('updatePosition', props.window.id, newX, newY)
  }
}

const stopResize = () => {
  isResizing.value = false
  resizeHandle.value = ''
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}

const handleClose = () => {
  emit('close', props.window.id)
}

const handleMinimize = () => {
  emit('minimize', props.window.id)
}

const handleMaximize = () => {
  emit('toggleMaximize', props.window.id)
}

const handleFocus = () => {
  emit('focus', props.window.id)
}

// Copy URL to clipboard
const { copy, copied } = useClipboard()
const handleCopyUrl = () => {
  // Get the full URL (construct from window location if relative)
  const urlToCopy = displayUrl.value
  const url = urlToCopy.startsWith('http') 
    ? urlToCopy 
    : `${window.location.origin}${urlToCopy}`
  copy(url)
}

// Open current page in standalone mode (exit desktop)
const handleOpenStandalone = (event: MouseEvent) => {
  const url = displayUrl.value
  
  // Ctrl/Cmd+Click: Open in new tab
  if (event.ctrlKey || event.metaKey) {
    window.open(url, '_blank')
  } else {
    // Default: Replace current page (exit desktop mode)
    window.top!.location.href = url
  }
}

// Tab handlers
const handleSwitchTab = (tabId: string) => {
  emit('switch-tab', props.window.id, tabId)
}

const handleCloseTab = (tabId: string) => {
  emit('close-tab', props.window.id, tabId)
}

const handleNewTab = () => {
  emit('new-tab', props.window.id)
}

const handleTabUpdateTitle = (tabId: string, pageTitle: string) => {
  emit('update-tab-title', props.window.id, tabId, pageTitle)
}

const handleTabUpdateUrl = (tabId: string, url: string) => {
  emit('update-tab-url', props.window.id, tabId, url)
}

// Double-click on title bar to maximize
const handleTitleBarDoubleClick = () => {
  // Don't allow maximize in card mode
  if (props.cardMode) return
  if (!props.window.isMaximized) {
    emit('toggleMaximize', props.window.id)
  }
}

// Legacy iframe support (for backward compatibility - single tab mode)
const iframeRef = ref<HTMLIFrameElement | null>(null)
let titleCheckInterval: number | null = null

// Use initial URL for iframe src - don't reload when window.url changes
const initialSrc = computed(() => displayUrl.value)

// Track if iframe is clicked to update focus (legacy mode only)
const setupIframeFocusDetection = () => {
  if (!iframeRef.value?.contentWindow || hasTabs.value) return
  
  try {
    iframeRef.value.contentWindow.addEventListener('mousedown', () => {
      emit('focus', props.window.id)
    })
    
    iframeRef.value.contentWindow.addEventListener('focus', () => {
      emit('focus', props.window.id)
    })
  } catch (e) {
    // Cross-origin iframe - can't access, that's ok
  }
}

// Listen for messages from iframe (legacy mode only)
const handleIframeMessage = (event: MessageEvent) => {
  if (hasTabs.value) return // Tabs handle their own messages
  
  if (event.source !== iframeRef.value?.contentWindow) return
  if (!event.data) return
  
  if (event.data.type === 'desktop-shortcut') {
    emit('shortcutCommand', props.window.id, event.data.command)
  }
  
  if (event.data.type === 'open-new-window') {
    emit('openNewWindow', event.data.url)
  }
}

// Setup message listener (legacy mode)
onMounted(() => {
  if (!hasTabs.value) {
    window.addEventListener('message', handleIframeMessage)
  }
  
  // Listen for tab content events
  window.addEventListener('desktop-window-shortcut', handleTabShortcut as EventListener)
  window.addEventListener('desktop-window-open-new', handleTabOpenNew as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('message', handleIframeMessage)
  window.removeEventListener('desktop-window-shortcut', handleTabShortcut as EventListener)
  window.removeEventListener('desktop-window-open-new', handleTabOpenNew as EventListener)
  
  if (titleCheckInterval) {
    clearInterval(titleCheckInterval)
  }
})

const handleTabShortcut = (event: CustomEvent) => {
  if (event.detail.tabId && hasTabs.value) {
    emit('shortcutCommand', props.window.id, event.detail.command)
  }
}

const handleTabOpenNew = (event: CustomEvent) => {
  if (event.detail.url) {
    emit('openNewWindow', event.detail.url)
  }
}

// Legacy title checking (single tab mode only)
const checkIframeTitle = () => {
  if (hasTabs.value || !iframeRef.value) return
  
  try {
    const iframeDocument = iframeRef.value.contentDocument || iframeRef.value.contentWindow?.document
    if (iframeDocument) {
      if (iframeDocument.title) {
        const newTitle = iframeDocument.title
        if (newTitle && newTitle !== props.window.currentPageTitle) {
          emit('updatePageTitle', props.window.id, newTitle)
        }
      }
      
      const currentUrl = iframeDocument.location.href
      const currentPath = iframeDocument.location.pathname + iframeDocument.location.search + iframeDocument.location.hash
      
      const isValidPath = currentPath && 
                          currentPath !== '/' && 
                          currentPath !== '/blank' && 
                          !currentUrl.includes('about:blank') &&
                          currentPath !== props.window.url
      
      if (isValidPath) {
        emit('updateUrl', props.window.id, currentPath)
      }
    }
  } catch (e) {
    // Cross-origin restriction
  }
}

const handleIframeLoad = () => {
  if (hasTabs.value) return // Tabs handle their own loading
  
  checkIframeTitle()
  setupIframeFocusDetection()
  
  if (titleCheckInterval) {
    clearInterval(titleCheckInterval)
  }
  titleCheckInterval = window.setInterval(checkIframeTitle, 1000)
}

// Start checking when component mounts
onMounted(() => {
  if (iframeRef.value) {
    handleIframeLoad()
  }
})

// Cleanup on unmount
onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  
  if (titleCheckInterval) {
    clearInterval(titleCheckInterval)
  }
})
</script>

<template>
  <div 
    class="desktop-window"
    :class="{ 
      'maximized': window.isMaximized && !cardMode,
      'minimized': window.isMinimized,
      'dragging': isDragging,
      'resizing': isResizing,
      'focused': isFocused,
      'animating': window.isAnimating,
      'opening': window.isOpening,
      'closing': window.isClosing,
      'shaking': window.isShaking,
      'card-mode': cardMode
    }"
    :style="{
      left: cardMode ? 'auto' : (window.isMaximized ? '0' : `${window.x}px`),
      top: cardMode ? 'auto' : (window.isMaximized ? '0' : `${window.y}px`),
      width: cardMode ? '100%' : (window.isMaximized ? '100vw' : `${window.width}px`),
      height: cardMode ? '100%' : (window.isMaximized ? '100vh' : `${window.height}px`),
      transform: isDragging && !cardMode ? `translate(${dragOffset.x}px, ${dragOffset.y}px)` : 'none',
      zIndex: cardMode ? 'auto' : window.zIndex,
      visibility: window.isMinimized ? 'hidden' : 'visible',
      pointerEvents: window.isMinimized ? 'none' : 'auto',
    }"
    @mousedown="handleFocus"
  >
    <!-- Title Bar (legacy mode - no tabs) -->
    <div 
      v-if="!hasTabs"
      :class="{'window-titlebar':true, isMaximized:window.isMaximized && !cardMode}" 
      @mousedown="startDrag" 
      @dblclick="handleTitleBarDoubleClick"
    >
      <div class="window-title">
        <Icon v-if="displayIcon" :name="displayIcon" class="window-icon" />
        <span>{{ displayTitle }}</span>
        <!-- Copy URL Button -->
        <button 
          class="window-control-btn" 
          @click.stop="handleCopyUrl"
          :title="copied ? 'Copied!' : 'Copy URL'"
        >
          <Icon v-if="!copied" name="lucide:link" />
          <Icon v-else name="lucide:check" />
        </button>
        <!-- Open Standalone Button -->
        <button 
          class="window-control-btn" 
          @click.stop="handleOpenStandalone"
          title="Open in Standalone Mode (Ctrl+Click for new tab)"
        >
          <Icon name="lucide:external-link" />
        </button>
      </div>
      
      <div class="window-controls">
        <button 
          v-if="!props.disableMinimize"
          class="window-control-btn minimize" 
          @click.stop="handleMinimize"
        >
          <Icon name="lucide:minus" />
        </button>
        <button 
          v-if="!cardMode"
          class="window-control-btn maximize" 
          @click.stop="handleMaximize"
        >
          <Icon v-if="!window.isMaximized" name="lucide:square" />
          <Icon v-else name="lucide:copy" />
        </button>
        <button class="window-control-btn close" @click.stop="handleClose">
          <Icon name="lucide:x" />
        </button>
      </div>
    </div>

    <!-- Tab Header (with tabs - merged title bar) -->
    <div
      v-if="hasTabs"
      class="window-titlebar merged-with-tabs"
      @mousedown="startDrag" 
      @dblclick="handleTitleBarDoubleClick"
    >
      <TabHeader
        :tabs="window.tabs!"
        :active-tab-id="window.activeTabId!"
        :can-close="window.tabs!.length > 1"
        :copied="copied"
        @switch-tab="handleSwitchTab"
        @close-tab="handleCloseTab"
        @new-tab="handleNewTab"
        @copy-url="handleCopyUrl"
        @open-standalone="handleOpenStandalone"
      >
        <!-- Slot content: window title actions and controls -->
        <template #window-controls>
        <div class="window-title-actions">
          <!-- Copy URL Button -->
          
        </div>
        
        <div class="window-controls">
          <button 
            v-if="!props.disableMinimize"
            class="window-control-btn minimize" 
            @click.stop="handleMinimize"
          >
            <Icon name="lucide:minus" />
          </button>
          <button 
            v-if="!cardMode"
            class="window-control-btn maximize" 
            @click.stop="handleMaximize"
          >
            <Icon v-if="!window.isMaximized" name="lucide:square" />
            <Icon v-else name="lucide:copy" />
          </button>
          <button class="window-control-btn close" @click.stop="handleClose">
            <Icon name="lucide:x" />
          </button>
        </div>
      </template>
      </TabHeader>
    </div>

    <!-- Content Area -->
    <div class="window-content">
      <!-- Multi-tab mode -->
      <template v-if="hasTabs">
        <TabContent
          v-for="tab in window.tabs"
          :key="tab.id"
          :tab="tab"
          :is-active="tab.id === window.activeTabId"
          @update-page-title="handleTabUpdateTitle"
          @update-url="handleTabUpdateUrl"
          @focus="emit('focus', window.id)"
        />
      </template>
      
      <!-- Legacy single-tab mode (backward compatibility) -->
      <template v-else>
        <iframe 
          ref="iframeRef"
          :src="initialSrc" 
          frameborder="0"
          class="window-iframe"
          @load="handleIframeLoad"
        ></iframe>
      </template>
    </div>

    <!-- Resize Handles (only show when not maximized and not in card mode) -->
    <template v-if="!window.isMaximized && !cardMode">
      <div class="resize-handle n" @mousedown="startResize('n', $event)"></div>
      <div class="resize-handle s" @mousedown="startResize('s', $event)"></div>
      <div class="resize-handle e" @mousedown="startResize('e', $event)"></div>
      <div class="resize-handle w" @mousedown="startResize('w', $event)"></div>
      <div class="resize-handle ne" @mousedown="startResize('ne', $event)"></div>
      <div class="resize-handle nw" @mousedown="startResize('nw', $event)"></div>
      <div class="resize-handle se" @mousedown="startResize('se', $event)"></div>
      <div class="resize-handle sw" @mousedown="startResize('sw', $event)"></div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.desktop-window {
  --header-bg: var(--app-grey-850);
  position: fixed;
  display: flex;
  flex-direction: column;
  border-radius: var(--app-border-radius-m);
  overflow: hidden;
  box-shadow: var(--app-shadow-l);
  transition: box-shadow 0.2s ease, filter 0.2s ease, opacity 0.2s ease;
  will-change: transform;
  background: var(--header-bg);
  outline: 1px solid var(--app-info-color);
  /* Slightly dim unfocused windows by default */
  
  opacity: 0.95;
}

.desktop-window.card-mode {
  position: relative;
  flex-shrink: 0;
  height: 100%;
}

/* Focused window - full brightness */
.desktop-window.focused {
  opacity: 1;
  --header-bg: var(--app-grey-850);
  outline: 1px solid var(--app-primary-2);
}



.desktop-window.maximized {
  border-radius: 0;
  transition: all 0.3s ease;
  --app-header-height: 28px;
}

.desktop-window.minimized {
  /* Keep iframe alive but hidden - preserves navigation state */
  visibility: hidden !important;
  pointer-events: none !important;
  /* Optionally reduce resource usage when hidden */
  opacity: 0;
}

/* Disable all transitions during drag/resize for smooth GPU-accelerated movement */
.desktop-window.dragging,
.desktop-window.resizing {
  transition: none !important;
  cursor: move;
}

.desktop-window.resizing {
  cursor: inherit; /* Use resize cursor from handle */
}

/* Enable smooth animations when snapping */
.desktop-window.animating {
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              top 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.2s ease,
              filter 0.2s ease,
              opacity 0.2s ease !important;
}

/* Window open animation - fade + scale in */
.desktop-window.opening {
  animation: window-open 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes window-open {
  from {
    opacity: 0;
    transform: scale(0.85) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Window close animation - fade + scale out */
.desktop-window.closing {
  animation: window-close 0.3s ease forwards;
  pointer-events: none; /* Prevent interaction during close */
}

@keyframes window-close {
  to {
    opacity: 0;
    transform: scale(0.85) translateY(20px);
  }
}

/* Window shake animation - for invalid actions */
.desktop-window.shaking {
  animation: window-shake 0.5s ease;
}

@keyframes window-shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
  20%, 40%, 60%, 80% { transform: translateX(8px); }
}

.window-titlebar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--app-space-xs) var(--app-space-s);
  background: var(--header-bg);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  cursor: move;
  user-select: none;
  &.isMaximized:not(:hover){
    padding: var(--app-space-xs);
    .window-title {
      font-size: var(--app-font-size-xs);
    }
    .window-control-btn {
      width: 12px;
      height: 12px;
    }
    .window-icon{
      width: 12px;
      height: 12px;

    }
  }
  
  // Merged with tabs - adjust styling
  &.merged-with-tabs {
    padding: 5px 0 0 0 ;
    --header-bg: var(--app-grey-850);
    height: var(--app-header-height);
    
    :deep(.tab-header) {
      width: 100%;
      height: 100%;
    }
    
    :deep(.window-title-actions) {
      display: flex;
      align-items: center;
      gap: var(--app-space-xs);
    }
    
    :deep(.window-controls) {
      display: flex;
      align-items: center;
    }  }
}

.window-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--app-font-size-m);
  font-weight: 500;
  color: var(--color-text, #fff);
}

.window-icon {
  width: 16px;
  height: 16px;
}

.copy-url-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: rgba(255, 255, 255, 0.7);
  margin-left: auto;
  margin-right: 8px;
}

.copy-url-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  transform: scale(1.05);
}

.copy-url-btn :deep(svg) {
  width: 14px;
  height: 14px;
}

.window-controls {
  display: flex;
  gap: 8px;
}

.window-control-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
}

.window-control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.window-control-btn.close:hover {
  background: #ff4757;
  color: white;
}

.window-control-btn.maximize:hover {
  background: #2ed573;
  color: white;
}

.window-control-btn.minimize:hover {
  background: #ffa502;
  color: white;
}

.window-content {
  flex: 1;
  background: rgba(0, 0, 0, 0.2);
  overflow: hidden;
  position: relative;
}

.window-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}

/* Resize Handles */
.resize-handle {
  position: absolute;
  z-index: 10;
}

.resize-handle.n,
.resize-handle.s {
  left: 0;
  right: 0;
  height: 6px;
  cursor: ns-resize;
}

.resize-handle.n {
  top: 0;
}

.resize-handle.s {
  bottom: 0;
}

.resize-handle.e,
.resize-handle.w {
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: ew-resize;
}

.resize-handle.e {
  right: 0;
}

.resize-handle.w {
  left: 0;
}

.resize-handle.ne,
.resize-handle.nw,
.resize-handle.se,
.resize-handle.sw {
  width: 12px;
  height: 12px;
}

.resize-handle.ne {
  top: 0;
  right: 0;
  cursor: nesw-resize;
}

.resize-handle.nw {
  top: 0;
  left: 0;
  cursor: nwse-resize;
}

.resize-handle.se {
  bottom: 0;
  right: 0;
  cursor: nwse-resize;
}

.resize-handle.sw {
  bottom: 0;
  left: 0;
  cursor: nesw-resize;
}
</style>

