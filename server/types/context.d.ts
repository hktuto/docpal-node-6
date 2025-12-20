import type { Company, App } from '#shared/types/db'

/**
 * Extend H3Event context with company and app data
 * These are set by server middleware and available in all route handlers
 */
declare module 'h3' {
  interface H3EventContext {
    // Set by 1.company.ts middleware
    company?: Company
    companyId?: string

    // Set by 2.app.ts middleware (only on app routes)
    app?: App
    appId?: string

    // Phase 2+: Will add user/session context
    // user?: User
    // session?: Session
  }
}

export {}

