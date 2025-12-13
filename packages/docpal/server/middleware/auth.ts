/**
 * Auth Middleware (POC)
 * 
 * For POC: Injects fixed admin user context into all requests
 * For Production: Validate JWT token and inject real user context
 * 
 * This middleware runs on EVERY API request and sets event.context.auth
 * which can be accessed in all endpoint handlers.
 */

export default defineEventHandler((event) => {
  const path = event.path;
  
  // Skip auth injection for auth endpoints (they handle their own logic)
  if (path?.startsWith('/api/auth/')) {
    return;
  }
  
  // POC: Always inject fixed admin user context
  // In production: 
  // 1. Read Authorization header
  // 2. Validate JWT token
  // 3. Extract user ID from token
  // 4. Query database for user
  // 5. Inject real user into context
  
  event.context.auth = {
    userId: '00000000-0000-0000-0000-000000000001',
    companyId: '00000000-0000-0000-0000-000000000002',
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      username: 'admin',
      email: 'admin@docpal.local'
    }
  };
});

