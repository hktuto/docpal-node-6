/**
 * Global auth middleware - runs on all routes
 * Fetches user and redirects to login if accessing protected routes while unauthenticated
 */

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/verify',
  '/auth/invite',
]


// Check if a route is public
function isPublicRoute(path: string): boolean {
  // Exact match
  if (PUBLIC_ROUTES.includes(path)) {
    return true
  }

  
  return false
}

export default defineNuxtRouteMiddleware(async (to) => {
  // Skip if accessing a public route
  if (isPublicRoute(to.path)) {
    return
  }

  const auth = useAuth()

  // Fetch user if not already loaded
  if (!auth.user.value && !auth.loading.value) {
    await auth.fetchUser()
  }

  // If not authenticated and trying to access a protected route, redirect to login
  if (!auth.isAuthenticated.value) {
    return navigateTo({
      path: '/auth/login',
      query: { redirect: to.fullPath },
    })
  }
})

