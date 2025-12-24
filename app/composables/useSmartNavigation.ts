import { useMagicKeys } from '@vueuse/core'

/**
 * Smart navigation composable that handles Ctrl/Cmd + Click
 * Use this for buttons and programmatic navigation that should support opening in new window/tab
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
  const { isDesktopMode, isTabMode } = useDisplayMode()
  const keys = useMagicKeys()
  
  // Helper to get current modifiers
  const getCurrentModifiers = () => ({
    ctrl: keys.ctrl?.value ?? false,
    meta: keys.meta?.value ?? false,
    shift: keys.shift?.value ?? false,
    alt: keys.alt?.value ?? false,
    keys: Array.from(keys.current)
  })
  
  // Helper to check if in iframe mode
  const isInIframeMode = () => {
    const inIframe = window.self !== window.top
    const isSpecialMode = isDesktopMode.value || isTabMode.value
    return inIframe && isSpecialMode
  }
  
  /**
   * Navigate to a path
   * In iframe mode: sends message to parent with modifiers
   * In standalone mode: uses router directly
   * 
   * @param path - The path to navigate to
   * @param event - Optional mouse event (not used anymore, kept for compatibility)
   */
  const navigateTo = (path: string, event?: MouseEvent) => {
    // If in iframe mode, send message to parent (plugin will intercept router navigation)
    // Just use router.push and let the plugin handle it
    if (isInIframeMode()) {
      // The navigation-interception plugin will catch this and send postMessage
      router.push(path)
    } else {
      // Normal navigation in standalone mode
      router.push(path)
    }
  }
  
  /**
   * Navigate to a path with options
   * Supports all vue-router push options
   */
  const navigateToWithOptions = (
    to: string | { path: string; query?: Record<string, any> },
    event?: MouseEvent
  ) => {
    // Same logic - let the plugin handle iframe interception
    router.push(to)
  }
  
  /**
   * Manually send navigation message with custom modifiers
   * Use this when you need fine control over modifier state
   */
  const sendNavigateMessage = (path: string, customModifiers?: {
    ctrl?: boolean
    meta?: boolean
    shift?: boolean
    alt?: boolean
  }) => {
    const modifiers = customModifiers || getCurrentModifiers()
    
    window.parent.postMessage({
      type: 'navigate',
      url: path,
      modifiers
    }, '*')
  }
  
  return {
    navigateTo,
    navigateToWithOptions,
    sendNavigateMessage,
    getCurrentModifiers,
    isInIframeMode
  }
}

