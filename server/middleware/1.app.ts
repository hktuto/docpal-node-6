import { db } from 'hub:db'
import { apps } from 'hub:db:schema'
import { eq, and } from 'drizzle-orm'

/**
 * App Context Middleware
 * 
 * Runs on app-specific routes to:
 * 1. Extract appSlug from URL
 * 2. Load app data (scoped to user's company)
 * 3. Attach to event.context
 * 
 * Only runs for routes matching: /api/apps/:appSlug/*
 * Requires auth middleware (00.auth.ts) to set user context
 */
export default defineEventHandler(async (event) => {
  const path = event.path

  // Only run for app-specific routes
  const appRouteMatch = path.match(/^\/api\/apps\/([^\/]+)/)
  if (!appRouteMatch) {
    return // Not an app route, skip
  }

  const appSlug = appRouteMatch[1]

  // Get user from context (set by auth middleware)
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required',
    })
  }

  if (!user.company) {
    throw createError({
      statusCode: 400,
      message: 'No company selected. Please select a company first.',
    })
  }

  const companyId = user.company.id

  // Load app data (scoped to company)
  const app = await db
    .select()
    .from(apps)
    .where(and(
      eq(apps.companyId, companyId),
      eq(apps.slug, appSlug)
    ))
    .limit(1)
    .then(rows => rows[0])

  if (!app) {
    throw createError({
      statusCode: 404,
      message: `App '${appSlug}' not found in your company.`,
    })
  }

  // Attach to event context
  event.context.app = app
  event.context.appId = app.id
})

