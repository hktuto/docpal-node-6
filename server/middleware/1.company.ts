import { db } from 'hub:db'
import { companies } from 'hub:db:schema'
import { eq } from 'drizzle-orm'

/**
 * Company Context Middleware
 * 
 * Runs on ALL requests to:
 * 1. Determine the active company (from cookie/header/session)
 * 2. Load company data
 * 3. Attach to event.context for use in all routes
 * 
 * Phase 1: Uses dummy company or header
 * Phase 2+: Will use real session/auth
 */
export default defineEventHandler(async (event) => {
  // Skip middleware for non-API routes
  const path = event.path
  if (!path.startsWith('/api/')) {
    return
  }

  console.log(`[Company Middleware] Processing: ${path}`)

  // Phase 1: Get company from cookie/header or use dummy
  // Phase 2+: Get from session (await requireUserSession(event))
  const companyId = getCookie(event, 'active_company_id') 
    || getHeader(event, 'x-company-id')
    || '00000000-0000-0000-0000-000000000001' // Dummy company for Phase 1

  console.log(`[Company Middleware] Company ID: ${companyId}`)

  // Load company data (cached in production)
  const company = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1)
    .then(rows => rows[0])

  // If company not found, return 404 early
  if (!company) {
    console.error(`[Company Middleware] Company not found: ${companyId}`)
    throw createError({
      statusCode: 404,
      message: `Company not found: ${companyId}. Please select a valid company.`,
    })
  }

  // Attach to event context for all downstream handlers
  event.context.company = company
  event.context.companyId = company.id

  console.log(`[Company Middleware] ✓ Set context: ${company.slug} (${company.id})`)
})

