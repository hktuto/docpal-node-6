import { db } from 'hub:db'
import { appTemplates } from 'hub:db:schema'
import { eq, and, or } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth/getCurrentUser'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const templateId = getRouterParam(event, 'templateId')

  if (!templateId) {
    throw createError({
      statusCode: 400,
      message: 'Template ID is required'
    })
  }

  try {
    // Fetch template
    const [template] = await db
      .select()
      .from(appTemplates)
      .where(eq(appTemplates.id, templateId))
      .limit(1)

    if (!template) {
      throw createError({
        statusCode: 404,
        message: 'Template not found'
      })
    }

    // Check access permissions
    const hasAccess = 
      template.visibility === 'system' ||
      template.visibility === 'public' ||
      (template.visibility === 'company' && template.companyId === user.company?.id) ||
      (template.visibility === 'personal' && template.createdBy === user.id)

    if (!hasAccess) {
      throw createError({
        statusCode: 403,
        message: 'You do not have permission to access this template'
      })
    }

    return successResponse(template)
  } catch (error: any) {
    if (error.statusCode) throw error
    
    console.error('Error fetching template:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch template'
    })
  }
})

