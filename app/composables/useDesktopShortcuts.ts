import { useMagicKeys, whenever } from '@vueuse/core'

export type DesktopShortcutCommand = 
  | 'snap-left'
  | 'snap-right'
  | 'maximize'
  | 'exit-snap'
  | 'close-window'

export interface DesktopShortcutMessage {
  type: 'desktop-shortcut'
  command: DesktopShortcutCommand
}

export interface OpenNewWindowMessage {
  type: 'open-new-window'
  url: string
}

/**
 * Composable for handling desktop keyboard shortcuts
 * Works both in parent (desktop.vue) and child (iframe) contexts
 */
export function useDesktopShortcuts() {
  const { isDesktopMode } = useDisplayMode()
  
  // Function to send command to parent (when in iframe)
  const sendToParent = (command: DesktopShortcutCommand) => {
    if (process.client && window.parent && window.parent !== window) {
      const message: DesktopShortcutMessage = {
        type: 'desktop-shortcut',
        command
      }
      window.parent.postMessage(message, '*')
    }
  }
  
  // Setup keyboard shortcuts
  const keys = useMagicKeys({
    passive: false,
    onEventFired(e) {
      // Prevent default for our shortcuts
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
    if (isDesktopMode.value) {
      sendToParent('snap-left')
    }
  })
  
  // Snap right: Cmd/Ctrl + Shift + →
  whenever(() => keys.Meta_Shift_ArrowRight?.value || keys.Ctrl_Shift_ArrowRight?.value, () => {
    if (isDesktopMode.value) {
      sendToParent('snap-right')
    }
  })
  
  // Maximize: Cmd/Ctrl + Shift + ↑
  whenever(() => keys.Meta_Shift_ArrowUp?.value || keys.Ctrl_Shift_ArrowUp?.value, () => {
    if (isDesktopMode.value) {
      sendToParent('maximize')
    }
  })
  
  // Exit snap/fullscreen: Cmd/Ctrl + Shift + ↓
  whenever(() => keys.Meta_Shift_ArrowDown?.value || keys.Ctrl_Shift_ArrowDown?.value, () => {
    if (isDesktopMode.value) {
      sendToParent('exit-snap')
    }
  })
  
  // Close: Escape or Cmd/Ctrl + W
  whenever(() => keys.Escape?.value || keys.Meta_W?.value || keys.Ctrl_W?.value, () => {
    if (isDesktopMode.value) {
      sendToParent('close-window')
    }
  })
  
  // Global click listener for Ctrl/Cmd + Click on links
  if (process.client && isDesktopMode.value) {
    const handleLinkClick = (e: MouseEvent) => {
      // Check if Ctrl/Cmd pressed or middle-click
      if (!(e.ctrlKey || e.metaKey || e.button === 1)) return
      
      // Find closest link element
      const link = (e.target as HTMLElement)?.closest('a')
      if (!link) return
      
      // Get URL from href attribute
      const href = link.getAttribute('href')
      if (!href) return
      
      // Only handle internal links (relative paths)
      if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
        return // Let external links open normally in new tab
      }
      
      // Prevent default navigation
      e.preventDefault()
      e.stopPropagation()
      
      // Send message to parent to open new window
      const message: OpenNewWindowMessage = {
        type: 'open-new-window',
        url: href
      }
      window.parent.postMessage(message, '*')
    }
    
    // Use capture phase to intercept before other handlers
    document.addEventListener('click', handleLinkClick, true)
    document.addEventListener('auxclick', handleLinkClick, true) // For middle-click
    
    // Cleanup on unmount
    onBeforeUnmount(() => {
      document.removeEventListener('click', handleLinkClick, true)
      document.removeEventListener('auxclick', handleLinkClick, true)
    })
  }
}

