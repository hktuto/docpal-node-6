import { successResponse } from '~~/server/utils/response'

/**
 * Get app by slug (scoped to company)
 * 
 * App data is already loaded and validated by middleware.
 * This handler just returns it!
 */
export default defineEventHandler(async (event) => {
  // App context is set by 2.app.ts middleware
  const app = event.context.app
  
  if (!app) {
    throw createError({
      statusCode: 500,
      message: 'App context not found. Middleware error.',
    })
  }
  
  return successResponse(app)
})

