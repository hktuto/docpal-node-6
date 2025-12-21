import { getCurrentUser } from '~~/server/utils/auth/getCurrentUser'

/**
 * Auth middleware - runs on all requests
 * Attaches user to event.context if valid session exists
 * Does NOT throw errors - routes decide if auth is required
 */

// Routes that don't need auth check (public routes)
const PUBLIC_PATHS = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/magic-link/send',
  '/api/auth/magic-link/verify',
  '/api/companies/invites/accept', // Can accept invite after login
]

// Check if path starts with any public prefix
const PUBLIC_PREFIXES = [
  '/api/public/', // All public API endpoints
  '/_nuxt/',      // Nuxt assets
  '/favicon.ico',
]

export default defineEventHandler(async (event) => {
  const path = event.path

  // Skip auth check for public paths
  if (PUBLIC_PATHS.includes(path)) {
    return
  }

  // Skip auth check for public prefixes
  if (PUBLIC_PREFIXES.some(prefix => path.startsWith(prefix))) {
    return
  }

  // Try to get session token
  const cookieToken = getCookie(event, 'session_token')
  const authHeader = getHeader(event, 'Authorization')
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  
  const token = cookieToken || headerToken

  if (!token) {
    // No token - user is not authenticated (this is OK for optional auth)
    return
  }

  // Get user from session
  try {
    const user = await getCurrentUser(token)
    
    if (user) {
      // Attach user to context for use in routes and other middleware
      event.context.user = user
    }
  } catch (error) {
    // Session lookup failed - don't throw error, just log it
    console.error('Auth middleware error:', error)
  }
})

