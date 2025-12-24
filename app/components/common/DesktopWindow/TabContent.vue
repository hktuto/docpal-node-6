<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'

interface TabState {
  id: string
  url: string
  title: string
  icon?: string
  currentPageTitle?: string
}

interface Props {
  tab: TabState
  isActive: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update-page-title': [tabId: string, pageTitle: string]
  'update-url': [tabId: string, url: string]
  'focus': []
}>()

const iframeRef = ref<HTMLIFrameElement | null>(null)
let titleCheckInterval: number | null = null

// Use initial URL for iframe src
const initialSrc = ref(props.tab.url)

// Update iframe src when tab URL changes externally
watch(() => props.tab.url, (newUrl) => {
  if (initialSrc.value !== newUrl) {
    initialSrc.value = newUrl
  }
})

// Track if iframe is clicked to update focus
const setupIframeFocusDetection = () => {
  if (!iframeRef.value?.contentWindow) return
  
  try {
    iframeRef.value.contentWindow.addEventListener('mousedown', () => {
      emit('focus')
    })
    
    iframeRef.value.contentWindow.addEventListener('focus', () => {
      emit('focus')
    })
  } catch (e) {
    // Cross-origin iframe - can't access, that's ok
  }
}

// Listen for messages from iframe
const handleIframeMessage = (event: MessageEvent) => {
  if (event.source !== iframeRef.value?.contentWindow) return
  if (!event.data) return
  
  // Handle desktop shortcut commands
  if (event.data.type === 'desktop-shortcut') {
    // Emit to parent DesktopWindow component
    window.dispatchEvent(new CustomEvent('desktop-window-shortcut', {
      detail: { tabId: props.tab.id, command: event.data.command }
    }))
  }
  
  // Handle open new window/tab requests
  if (event.data.type === 'open-new-window') {
    window.dispatchEvent(new CustomEvent('desktop-window-open-new', {
      detail: { url: event.data.url }
    }))
  }
}

const checkIframeTitle = () => {
  if (!iframeRef.value) return
  
  try {
    const iframeDocument = iframeRef.value.contentDocument || iframeRef.value.contentWindow?.document
    if (iframeDocument) {
      // Update title if changed
      if (iframeDocument.title) {
        const newTitle = iframeDocument.title
        if (newTitle && newTitle !== props.tab.currentPageTitle) {
          emit('update-page-title', props.tab.id, newTitle)
        }
      }
      
      // Track URL changes for navigation persistence
      const currentUrl = iframeDocument.location.href
      const currentPath = iframeDocument.location.pathname + iframeDocument.location.search + iframeDocument.location.hash
      
      // Only update if it's a valid, different path
      const isValidPath = currentPath && 
                          currentPath !== '/' && 
                          currentPath !== '/blank' && 
                          !currentUrl.includes('about:blank') &&
                          currentPath !== props.tab.url
      
      if (isValidPath) {
        emit('update-url', props.tab.id, currentPath)
      }
    }
  } catch (e) {
    // Cross-origin restriction - silently ignore
  }
}

const handleIframeLoad = () => {
  if (!props.isActive) return // Only check if this tab is active
  
  checkIframeTitle()
  setupIframeFocusDetection()
  
  // Start periodic checking for title changes (e.g., SPAs)
  if (titleCheckInterval) {
    clearInterval(titleCheckInterval)
  }
  titleCheckInterval = window.setInterval(() => {
    if (props.isActive) {
      checkIframeTitle()
    }
  }, 1000)
}

// Setup message listener
onMounted(() => {
  window.addEventListener('message', handleIframeMessage)
  if (props.isActive && iframeRef.value) {
    handleIframeLoad()
  }
})

onUnmounted(() => {
  window.removeEventListener('message', handleIframeMessage)
  if (titleCheckInterval) {
    clearInterval(titleCheckInterval)
    titleCheckInterval = null
  }
})

// Watch for active state changes
watch(() => props.isActive, (isActive) => {
  if (isActive && iframeRef.value) {
    nextTick(() => {
      handleIframeLoad()
    })
  } else {
    // Stop checking when tab becomes inactive
    if (titleCheckInterval) {
      clearInterval(titleCheckInterval)
      titleCheckInterval = null
    }
  }
})
</script>

<template>
  <div 
    class="tab-content"
    :class="{ active: isActive }"
  >
    <iframe 
      v-if="isActive"
      ref="iframeRef"
      :src="initialSrc"
      frameborder="0"
      class="tab-iframe"
      @load="handleIframeLoad"
    ></iframe>
  </div>
</template>

<style scoped lang="scss">
.tab-content {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: none;
  
  &.active {
    display: block;
  }
}

.tab-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}
</style>

