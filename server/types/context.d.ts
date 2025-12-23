import type { CurrentUser } from '~~/server/utils/auth/getCurrentUser'
import type { Workspace } from '#shared/types/db'

declare module 'h3' {
  interface H3EventContext {
    // Set by 00.auth.ts middleware
    user?: CurrentUser // Includes user.company if session has a company
    
    // Set by 1.workspace.ts middleware (for /api/workspaces/:workspaceSlug/* routes)
    workspace?: Workspace
    workspaceId?: string
  }
}

export {}
