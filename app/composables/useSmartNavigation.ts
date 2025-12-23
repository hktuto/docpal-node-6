import type { OpenNewWindowMessage } from './useDesktopShortcuts'

/**
 * Smart navigation composable that handles Ctrl/Cmd + Click
 * Use this for buttons and programmatic navigation that should support opening in new window
 * 
 * @example
 * ```vue
 * <template>
 *   <el-button @click="navigateTo('/chat', $event)">Go to Chat</el-button>
 * </template>
 * 
 * <script setup>
 * const { navigateTo } = useSmartNavigation()
 * </script>
 * ```
 */
export function useSmartNavigation() {
  const router = useRouter()
  const { isDesktopMode } = useDisplayMode()
  
  /**
   * Navigate to a path, or open in new window if Ctrl/Cmd pressed
   * @param path - The path to navigate to
   * @param event - Optional mouse event to check for Ctrl/Cmd/Middle-click
   */
  const navigateTo = (path: string, event?: MouseEvent) => {
    // Check if Ctrl/Cmd pressed, middle-click, or explicitly requested new window
    const shouldOpenNewWindow = event && (
      event.ctrlKey || 
      event.metaKey || 
      event.button === 1 // Middle-click
    )
    
    // If in desktop mode and modifier pressed, open new window
    if (isDesktopMode.value && shouldOpenNewWindow) {
      const message: OpenNewWindowMessage = {
        type: 'open-new-window',
        url: path
      }
      window.parent.postMessage(message, '*')
      return
    }
    console.log('navigateTo', path)
    // Normal navigation
    router.push(path)
  }
  
  /**
   * Navigate to a path with options
   * Supports all vue-router push options
   */
  const navigateToWithOptions = (
    to: string | { path: string; query?: Record<string, any> },
    event?: MouseEvent
  ) => {
    const path = typeof to === 'string' ? to : to.path
    const fullPath = typeof to === 'string' ? to : router.resolve(to).fullPath
    
    const shouldOpenNewWindow = event && (
      event.ctrlKey || 
      event.metaKey || 
      event.button === 1
    )
    
    if (isDesktopMode.value && shouldOpenNewWindow) {
      const message: OpenNewWindowMessage = {
        type: 'open-new-window',
        url: fullPath
      }
      window.parent.postMessage(message, '*')
      return
    }
    
    router.push(to)
  }
  
  return {
    navigateTo,
    navigateToWithOptions
  }
}

