/**
 * Display Mode Composable
 * Automatically detects if running inside an iframe (desktop mode)
 */
export function useDisplayMode() {
  // Auto-detect: if page is in iframe, it's desktop mode
  const isDesktopMode = computed(() => {
    if (!process.client) return false
    return window.self !== window.top
  })
  
  // Detect mobile device
  const isMobile = computed(() => {
    if (!process.client) return false
    return window.innerWidth < 768
  })
  
  // Whether to show navigation (hidden in desktop mode)
  const shouldShowNavigation = computed(() => !isDesktopMode.value)
  
  return {
    isDesktopMode,
    isMobile,
    shouldShowNavigation
  }
}

// For backwards compatibility - returns computed that auto-detects iframe
export const useIsDesktopMode = () => {
  const { isDesktopMode } = useDisplayMode()
  return isDesktopMode
}

