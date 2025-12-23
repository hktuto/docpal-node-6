/**
 * Display Mode Composable
 * Manages the application's display mode (desktop vs normal)
 */
export const useIsDesktopMode = () => useState('isDesktopMode', () => false)
export function useDisplayMode() {
  // Global state that persists across navigation
  const isDesktopMode = useIsDesktopMode()
  
  // Detect mobile device
  const isMobile = computed(() => {
    if (!process.client) return false
    return window.innerWidth < 768
  })
  
  // Helper to enable desktop mode
  const enableDesktopMode = () => {
    isDesktopMode.value = true
  }
  
  // Helper to disable desktop mode
  const disableDesktopMode = () => {
    isDesktopMode.value = false
  }
  
  // Toggle desktop mode
  const toggleDesktopMode = () => {
    isDesktopMode.value = !isDesktopMode.value
  }
  
  return {
    isDesktopMode,
    isMobile,
    enableDesktopMode,
    disableDesktopMode,
    toggleDesktopMode
  }
}

