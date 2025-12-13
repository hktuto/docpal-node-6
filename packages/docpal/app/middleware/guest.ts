/**
 * Guest Middleware
 * 
 * Redirects authenticated users away from auth pages
 */

export default defineNuxtRouteMiddleware((to, from) => {
  const { isAuthenticated } = useAuth();
  
  // If already authenticated, redirect to /app
  if (isAuthenticated.value) {
    return navigateTo('/app');
  }
});

