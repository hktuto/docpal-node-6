/**
 * Guest middleware - only allow non-authenticated users
 * Redirects authenticated users to /apps
 */
export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuth()

  // Fetch user if not already loaded
  if (!auth.user.value) {
    await auth.fetchUser()
  }

  // If authenticated, redirect to apps
  if (auth.isAuthenticated.value) {
    return navigateTo('/apps')
  }
})

