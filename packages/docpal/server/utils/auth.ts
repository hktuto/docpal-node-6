/**
 * Auth Utility Functions
 * 
 * Helper functions for working with authentication in API endpoints
 */

import type { H3Event } from 'h3';

export interface AuthContext {
  userId: string;
  companyId: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

/**
 * Get the authenticated user from request context
 * Throws error if user is not authenticated (shouldn't happen in POC)
 */
export function getAuthUser(event: H3Event): AuthContext {
  const auth = event.context.auth as AuthContext | undefined;
  
  if (!auth) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - No auth context found'
    });
  }
  
  return auth;
}

/**
 * Get user ID from context (shorthand)
 */
export function getUserId(event: H3Event): string {
  return getAuthUser(event).userId;
}

/**
 * Get company ID from context (shorthand)
 */
export function getCompanyId(event: H3Event): string {
  return getAuthUser(event).companyId;
}

