import { useMagicKeys } from '@vueuse/core'

/**
 * Navigation Interception Plugin
 * 
 * This plugin intercepts all navigation attempts in iframe mode (desktop/tab mode)
 * and sends them to the parent window via postMessage with current keyboard modifiers.
 * 
 * Coverage:
 * 1. Router navigation (NuxtLink, router.push, navigateTo)
 * 2. Direct <a href> clicks (including dynamic content, v-html, etc.)
 * 3. Context menu on links
 */
export default defineNuxtPlugin(() => {
  const router = useRouter()
  const { isDesktopMode, isTabMode } = useDisplayMode()
  
  // Get magic keys for modifier tracking
  const keys = useMagicKeys()
  
  // Helper to get current modifiers
  const getCurrentModifiers = () => ({
    ctrl: keys.ctrl?.value ?? false,
    meta: keys.meta?.value ?? false,
    shift: keys.shift?.value ?? false,
    alt: keys.alt?.value ?? false,
    keys: Array.from(keys.current) // All pressed keys for future custom hotkeys
  })
  
  // Helper to check if in iframe mode
  const isInIframeMode = () => {
    const inIframe = window.self !== window.top
    const isSpecialMode = isDesktopMode.value || isTabMode.value
    return inIframe && isSpecialMode
  }
  
  // 1. Intercept Router Navigation (catches NuxtLink, router.push, navigateTo)
  router.beforeEach((to, from, next) => {
    if (isInIframeMode()) {
      const modifiers = getCurrentModifiers()
      const hasModifiers = modifiers.ctrl || modifiers.meta || modifiers.shift || modifiers.alt
      
      // Only intercept if modifiers are pressed
      if (hasModifiers) {
        next(false) // Block the navigation
        
        // Send to parent with current modifiers
        window.parent.postMessage({
          type: 'navigate',
          url: to.fullPath,
          modifiers
        }, '*')
        
        return
      }
      
      // No modifiers - allow normal SPA navigation within iframe
      next()
      return
    }
    
    next() // Allow normal navigation in standalone mode
  })
  
  // 2. Intercept Direct Link Clicks (catches <a href>, v-html, markdown, etc.)
  const handleDirectLinkClick = (e: MouseEvent) => {
    // Find if click was on an <a> tag
    const link = (e.target as HTMLElement).closest('a[href]')
    if (!link) return
    
    const href = link.getAttribute('href')
    
    // Ignore external links, anchors, and already handled by NuxtLink
    if (!href || 
        href.startsWith('http://') || 
        href.startsWith('https://') ||
        href.startsWith('//') ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:')) {
      return
    }
    
    // Ignore if it's a NuxtLink (router will handle it)
    if (link.hasAttribute('data-nuxt-link') || link.closest('[data-nuxt-link]')) {
      return
    }
    
    // Get current modifiers
    const modifiers = getCurrentModifiers()
    const hasModifiers = modifiers.ctrl || modifiers.meta || modifiers.shift || modifiers.alt
    
    // In iframe mode with modifiers, send to parent
    if (isInIframeMode() && hasModifiers) {
      e.preventDefault()
      e.stopPropagation()
      
      window.parent.postMessage({
        type: 'navigate',
        url: href,
        modifiers
      }, '*')
    } else if (isInIframeMode()) {
      // In iframe mode without modifiers, use router for SPA navigation
      e.preventDefault()
      router.push(href)
    } else {
      // In standalone mode, use router for SPA navigation
      e.preventDefault()
      router.push(href)
    }
  }
  
  // 3. Context Menu for Links
  const handleContextMenu = (e: MouseEvent) => {
    // Only handle in iframe mode
    if (!isInIframeMode()) return
    
    const link = (e.target as HTMLElement).closest('a[href], [data-nav]')
    if (!link) return
    
    const href = link.getAttribute('href') || (link as HTMLElement).dataset.nav
    
    // Ignore external links and anchors
    if (!href || 
        href.startsWith('http://') || 
        href.startsWith('https://') ||
        href.startsWith('//') ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:')) {
      return
    }
    
    e.preventDefault()
    e.stopPropagation()
    
    // Send context menu request to parent
    window.parent.postMessage({
      type: 'show-context-menu',
      url: href,
      x: e.clientX,
      y: e.clientY
    }, '*')
  }
  
  // Register event listeners
  if (process.client) {
    // Use capture phase to intercept before other handlers
    document.addEventListener('click', handleDirectLinkClick, true)
    document.addEventListener('contextmenu', handleContextMenu, true)
  }
  
  // Provide helper functions for manual use
  return {
    provide: {
      navigationInterception: {
        getCurrentModifiers,
        isInIframeMode
      }
    }
  }
})

