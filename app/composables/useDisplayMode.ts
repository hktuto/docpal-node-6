/**
 * Display Mode Composable
 * Automatically detects if running inside an iframe (desktop mode)
 */
import { useBreakpoints } from '@vueuse/core'

export function useDisplayMode() {
  const route = useRoute()
  
  // Auto-detect: if page is in iframe, it's desktop mode
  const isDesktopMode = computed(() => {
    return route.path === '/desktop' || window.self !== window.top
  })
  
  // Detect tab mode: route is /tabs
  const isTabMode = computed(() => {
    return route.path === '/tabs'
  })
  
  // Use VueUse breakpoints for reactive mobile detection
  const breakpoints = useBreakpoints({
    tablet: 768,
    desktop: 1024,
  })
  
  // Detect mobile device (< 768px) - returns a computed ref
  const isMobile = breakpoints.smaller('tablet')
  
  // Whether to show navigation (hidden in desktop mode, shown in standalone and tab mode)
  const shouldShowNavigation = computed(() => !isDesktopMode.value)
  
  return {
    isDesktopMode,
    isTabMode,
    isMobile,
    shouldShowNavigation
  }
}

// For backwards compatibility - returns computed that auto-detects iframe
export const useIsDesktopMode = () => {
  const { isDesktopMode } = useDisplayMode()
  return isDesktopMode
}

