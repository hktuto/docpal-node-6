<script setup lang="ts">
import { useClipboard } from '@vueuse/core'

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

interface Props {
  window: WindowState
  isFocused?: boolean
}

const props = defineProps<Props>()
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
}>()

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
  if (props.window.isMaximized) return
  
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
  const url = props.window.url.startsWith('http') 
    ? props.window.url 
    : `${window.location.origin}${props.window.url}`
  copy(url)
}

// Double-click on title bar to maximize
const handleTitleBarDoubleClick = () => {
  if (!props.window.isMaximized) {
    emit('toggleMaximize', props.window.id)
  }
}

// Iframe ref and title tracking
const iframeRef = ref<HTMLIFrameElement | null>(null)
let titleCheckInterval: number | null = null

// Use initial URL for iframe src - don't reload when window.url changes
// window.url is updated for persistence, but iframe navigates internally
const initialSrc = ref(props.window.url)

// Only update iframe src when window is first created or from external change
// (e.g., loading from localStorage), not from internal navigation
watch(() => props.window.url, (newUrl) => {
  // Only update if iframe hasn't loaded yet or if this is a new window
  if (!iframeRef.value || initialSrc.value === newUrl) return
  
  // Check if this is truly an external change (not from our internal tracking)
  try {
    const iframeDocument = iframeRef.value.contentDocument
    if (iframeDocument) {
      const currentPath = iframeDocument.location.pathname + iframeDocument.location.search + iframeDocument.location.hash
      // Only reload if URL is actually different from what iframe is showing
      if (currentPath !== newUrl) {
        initialSrc.value = newUrl
      }
    }
  } catch (e) {
    // Cross-origin or not loaded, safe to update
    initialSrc.value = newUrl
  }
})

// Track if iframe is clicked to update focus
const setupIframeFocusDetection = () => {
  if (!iframeRef.value?.contentWindow) return
  
  try {
    // Add click listener to iframe content to detect focus
    iframeRef.value.contentWindow.addEventListener('mousedown', () => {
      emit('focus', props.window.id)
    })
    
    // Also detect when iframe gets focus
    iframeRef.value.contentWindow.addEventListener('focus', () => {
      emit('focus', props.window.id)
    })
  } catch (e) {
    // Cross-origin iframe - can't access, that's ok
  }
}

// Listen for messages from iframe (shortcuts and new window requests)
const handleIframeMessage = (event: MessageEvent) => {
  // Verify message is from our iframe
  if (event.source !== iframeRef.value?.contentWindow) return
  
  if (!event.data) return
  
  // Handle desktop shortcut commands
  if (event.data.type === 'desktop-shortcut') {
    const command = event.data.command
    emit('shortcutCommand', props.window.id, command)
  }
  
  // Handle open new window requests (Ctrl+Click)
  if (event.data.type === 'open-new-window') {
    const url = event.data.url
    emit('openNewWindow', url)
  }
}

// Setup message listener
onMounted(() => {
  window.addEventListener('message', handleIframeMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', handleIframeMessage)
})

const checkIframeTitle = () => {
  if (!iframeRef.value) return
  
  try {
    const iframeDocument = iframeRef.value.contentDocument || iframeRef.value.contentWindow?.document
    if (iframeDocument) {
      // Update title if changed
      if (iframeDocument.title) {
        const newTitle = iframeDocument.title
        if (newTitle && newTitle !== props.window.currentPageTitle) {
          emit('updatePageTitle', props.window.id, newTitle)
        }
      }
      
      // Track URL changes for navigation persistence
      const currentUrl = iframeDocument.location.href
      const currentPath = iframeDocument.location.pathname + iframeDocument.location.search + iframeDocument.location.hash
      
      // Only update if it's a valid, different path
      // Ignore: blank pages, about:blank, same URL, or just '/'
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
    // Cross-origin restriction - silently ignore
    // This happens when iframe loads content from different domain
  }
}

const handleIframeLoad = () => {
  checkIframeTitle()
  setupIframeFocusDetection() // Setup click detection for focus
  
  // Start periodic checking for title changes (e.g., SPAs)
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
      'maximized': window.isMaximized,
      'minimized': window.isMinimized,
      'dragging': isDragging,
      'resizing': isResizing,
      'focused': isFocused,
      'animating': window.isAnimating,
      'opening': window.isOpening,
      'closing': window.isClosing,
      'shaking': window.isShaking
    }"
    :style="{
      left: window.isMaximized ? '0' : `${window.x}px`,
      top: window.isMaximized ? '0' : `${window.y}px`,
      width: window.isMaximized ? '100vw' : `${window.width}px`,
      height: window.isMaximized ? '100vh' : `${window.height}px`,
      transform: isDragging ? `translate(${dragOffset.x}px, ${dragOffset.y}px)` : 'none',
      zIndex: window.zIndex,
      visibility: window.isMinimized ? 'hidden' : 'visible',
      pointerEvents: window.isMinimized ? 'none' : 'auto',
    }"
    @mousedown="handleFocus"
  >
    <!-- Title Bar -->
    <div :class="{'window-titlebar':true, isMaximized:window.isMaximized}" 
      @mousedown="startDrag" 
      @dblclick="handleTitleBarDoubleClick">
      <div class="window-title">
        <Icon v-if="window.icon" :name="window.icon" class="window-icon" />
        <span>{{ window.currentPageTitle || window.title }}</span>
        <!-- Copy URL Button -->
        <button 
          class="window-control-btn" 
          @click.stop="handleCopyUrl"
          :title="copied ? 'Copied!' : 'Copy URL'"
        >
          <Icon v-if="!copied" name="lucide:link" />
          <Icon v-else name="lucide:check" />
        </button>
      </div>
      
      
      
      <div class="window-controls">
        <button class="window-control-btn minimize" @click.stop="handleMinimize">
          <Icon name="lucide:minus" />
        </button>
        <button class="window-control-btn maximize" @click.stop="handleMaximize">
          <Icon v-if="!window.isMaximized" name="lucide:square" />
          <Icon v-else name="lucide:copy" />
        </button>
        <button class="window-control-btn close" @click.stop="handleClose">
          <Icon name="lucide:x" />
        </button>
      </div>
    </div>

    <!-- Content Area -->
    <div class="window-content">
      <iframe 
        ref="iframeRef"
        :src="initialSrc" 
        frameborder="0"
        class="window-iframe"
        @load="handleIframeLoad"
      ></iframe>
    </div>

    <!-- Resize Handles (only show when not maximized) -->
    <template v-if="!window.isMaximized">
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

<style scoped>
.desktop-window {
  --header-bg: var(--app-accent-color);
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

/* Focused window - full brightness */
.desktop-window.focused {
/* keep */
  opacity: 1;
  --header-bg: var(--app-accent-color);
  outline: 1px solid var(--app-accent-color);
}

.desktop-window.focused .window-titlebar {
  background: rgba(255, 255, 255, 0.15);
}

.desktop-window:not(.focused) .window-titlebar {
  background: rgba(255, 255, 255, 0.08);
}

.desktop-window.maximized {
  border-radius: 0;
  transition: all 0.3s ease;
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
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text, #fff);
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

