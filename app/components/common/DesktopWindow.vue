<script setup lang="ts">
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

interface Props {
  window: WindowState
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
  dragMove: [id: string, x: number, y: number]
  dragEnd: [id: string, x: number, y: number]
  unsnap: [id: string, cursorX: number, cursorY: number]
}>()

// Dragging state
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragStartWindowX = ref(0)
const dragStartWindowY = ref(0)
const dragOffset = ref({ x: 0, y: 0 })

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
  
  // Check if window is snapped (has saved state but not maximized = snapped to edge/corner)
  const isSnapped = props.window.savedState && !props.window.isMaximized
  
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
  } else if (isSnapped) {
    // Window is snapped (edge/corner) - restore original size
    emit('unsnap', props.window.id, e.clientX, e.clientY)
    
    // Wait for unsnap to complete
    nextTick(() => {
      dragStartWindowX.value = props.window.x
      dragStartWindowY.value = props.window.y
    })
  } else {
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
    
    // Clear dragging state and transform BEFORE emitting events
    isDragging.value = false
    dragOffset.value = { x: 0, y: 0 }
    
    // Emit drag end event (snap detection happens here and may override position)
    emit('dragEnd', props.window.id, finalX, finalY)
    
    // Update position on next tick (after snap has a chance to override)
    nextTick(() => {
      // If window position wasn't changed by snap, apply our drag position
      if (props.window.x === dragStartWindowX.value && props.window.y === dragStartWindowY.value) {
        emit('updatePosition', props.window.id, newX, newY)
      }
      // If snap changed the position, it's already updated and we don't override
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

// Double-click on title bar to maximize
const handleTitleBarDoubleClick = () => {
  if (!props.window.isMaximized) {
    emit('toggleMaximize', props.window.id)
  }
}

// Iframe ref and title tracking
const iframeRef = ref<HTMLIFrameElement | null>(null)
let titleCheckInterval: number | null = null

const checkIframeTitle = () => {
  if (!iframeRef.value) return
  
  try {
    const iframeDocument = iframeRef.value.contentDocument || iframeRef.value.contentWindow?.document
    if (iframeDocument && iframeDocument.title) {
      const newTitle = iframeDocument.title
      if (newTitle && newTitle !== props.window.currentPageTitle) {
        emit('updatePageTitle', props.window.id, newTitle)
      }
    }
  } catch (e) {
    // Cross-origin restriction - silently ignore
    // This happens when iframe loads content from different domain
  }
}

const handleIframeLoad = () => {
  checkIframeTitle()
  
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
      'resizing': isResizing
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
        :src="window.url" 
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
  position: fixed;
  display: flex;
  flex-direction: column;
  border-radius: var(--app-border-radius-m);
  overflow: hidden;
  box-shadow: var(--app-shadow-s);
  transition: box-shadow 0.2s ease;
  will-change: transform;
  background: var(--app-accent-color);
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

.desktop-window:hover {
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.4);
}

.window-titlebar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--app-space-xs) var(--app-space-s);
  background: rgba(255, 255, 255, 0.1);
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

