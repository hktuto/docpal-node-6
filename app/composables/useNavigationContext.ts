/**
 * Navigation Context Menu Composable
 * 
 * Provides utilities for showing context menus on links/buttons
 * Use this when you need manual control over navigation context menus
 */

export interface NavigationContextOptions {
  url: string
  x: number
  y: number
}

export function useNavigationContext() {
  const { isDesktopMode, isTabMode } = useDisplayMode()
  
  /**
   * Show context menu for a URL
   * In iframe mode, sends message to parent
   * In standalone mode, shows local context menu (TODO: implement standalone context menu)
   */
  const showContextMenu = (event: MouseEvent, url: string) => {
    const inIframe = window.self !== window.top
    const isSpecialMode = isDesktopMode.value || isTabMode.value
    
    if (inIframe && isSpecialMode) {
      // Send to parent window
      window.parent.postMessage({
        type: 'show-context-menu',
        url,
        x: event.clientX,
        y: event.clientY
      }, '*')
    } else {
      // TODO: Implement standalone context menu
      // For now, just log
      console.log('Context menu for:', url, 'at', event.clientX, event.clientY)
    }
  }
  
  return {
    showContextMenu
  }
}

