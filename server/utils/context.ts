import type { H3Event } from 'h3'
import type { Company, App } from '#shared/types/db'

/**
 * Get current company from event context
 * Company is set by 1.company.ts middleware
 * 
 * @throws Error if company context not found
 */
export function requireCompany(event: H3Event): Company {
  const company = event.context.company

  if (!company) {
    throw createError({
      statusCode: 500,
      message: 'Company context not found. Middleware error.',
    })
  }

  return company
}

/**
 * Get current company ID from event context
 * 
 * @throws Error if company context not found
 */
export function requireCompanyId(event: H3Event): string {
  const companyId = event.context.companyId

  if (!companyId) {
    throw createError({
      statusCode: 500,
      message: 'Company context not found. Middleware error.',
    })
  }

  return companyId
}

/**
 * Get current app from event context
 * App is set by 2.app.ts middleware (only on /api/apps/:slug/* routes)
 * 
 * @throws Error if app context not found
 */
export function requireApp(event: H3Event): App {
  const app = event.context.app

  if (!app) {
    throw createError({
      statusCode: 500,
      message: 'App context not found. Middleware error.',
    })
  }

  return app
}

/**
 * Get current app ID from event context
 * 
 * @throws Error if app context not found
 */
export function requireAppId(event: H3Event): string {
  const appId = event.context.appId

  if (!appId) {
    throw createError({
      statusCode: 500,
      message: 'App context not found. Middleware error.',
    })
  }

  return appId
}

