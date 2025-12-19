/**
 * Admin route middleware
 * Protects /admin routes - only allow access to admin users
 * 
 * For Phase 1: Simple check (can be enhanced in Phase 2 with real auth)
 */
export default defineNuxtRouteMiddleware((to, from) => {
  // TODO: In Phase 2, check user role from session
  // For now, allow access (Phase 1 has no real auth)
  
  // Example Phase 2 implementation:
  // const user = useUser()
  // if (!user || user.role !== 'admin') {
  //   return navigateTo('/')
  // }
  
  // For Phase 1, just log that admin route was accessed
  if (import.meta.dev) {
    console.log('[Admin Middleware] Accessing admin route:', to.path)
  }
})


