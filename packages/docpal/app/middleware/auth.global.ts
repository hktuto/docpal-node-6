/**
 * Global Auth Middleware
 * 
 * Runs on every route change
 * - Restores session if token exists
 * - Redirects to /login if not authenticated
 */

export default defineNuxtRouteMiddleware(async (to, from) => {
  const { isAuthenticated, restoreSession } = useAuth();
  
  // Skip auth check for auth pages
  if (to.path === '/login' || to.path === '/register' || to.path === '/forgot-password') {
    return;
  }
  
  // Try to restore session on first load
  if (process.client && !isAuthenticated.value) {
    await restoreSession();
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated.value) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath }
    });
  }
});

