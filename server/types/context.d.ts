import type { CurrentUser } from '~~/server/utils/auth/getCurrentUser'
import type { App } from '#shared/types/db'

declare module 'h3' {
  interface H3EventContext {
    // Set by 00.auth.ts middleware
    user?: CurrentUser // Includes user.company if session has a company
    
    // Set by 1.app.ts middleware (for /api/apps/:appSlug/* routes)
    app?: App
    appId?: string
  }
}

export {}
