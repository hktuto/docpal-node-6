import { db } from 'hub:db'
import { apps } from 'hub:db:schema'
import { eq, and } from 'drizzle-orm'

/**
 * App Context Middleware
 * 
 * Runs on app-specific routes to:
 * 1. Extract appSlug from URL
 * 2. Load app data (scoped to company)
 * 3. Attach to event.context
 * 
 * Only runs for routes matching: /api/apps/:appSlug/*
 */
export default defineEventHandler(async (event) => {
  const path = event.path

  // Only run for app-specific routes
  const appRouteMatch = path.match(/^\/api\/apps\/([^\/]+)/)
  if (!appRouteMatch) {
    return // Not an app route, skip
  }

  const appSlug = appRouteMatch[1]
  console.log(`[App Middleware] Processing: ${path}, slug: ${appSlug}`)

  const companyId = event.context.companyId

  // Company context should be set by previous middleware
  if (!companyId) {
    console.error('[App Middleware] Company context not set by 1.company.ts middleware!')
    throw createError({
      statusCode: 500,
      message: 'Company context not found. Middleware order issue.',
    })
  }

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

  // If app not found, return 404 early
  if (!app) {
    console.error(`[App Middleware] App '${appSlug}' not found in company ${companyId}`)
    throw createError({
      statusCode: 404,
      message: `App '${appSlug}' not found in your company.`,
    })
  }

  // Attach to event context
  event.context.app = app
  event.context.appId = app.id

  console.log(`[App Middleware] ✓ Set context: ${app.slug} (${app.id}) in company ${companyId}`)
})

