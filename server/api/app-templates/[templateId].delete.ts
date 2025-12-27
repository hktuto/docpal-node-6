import { db } from 'hub:db'
import { appTemplates } from 'hub:db:schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth/getCurrentUser'
import { successResponse } from '~~/server/utils/response'
import { auditTemplateOperation } from '~~/server/utils/audit'

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

    // Check permissions
    // Can delete if: creator or company admin (for company templates)
    const isCreator = template.createdBy === user.id
    const isCompanyAdmin = user.company?.role === 'admin' && template.companyId === user.company?.id
    
    const canDelete = isCreator || isCompanyAdmin

    if (!canDelete) {
      throw createError({
        statusCode: 403,
        message: 'You do not have permission to delete this template'
      })
    }

    // Delete template
    await db
      .delete(appTemplates)
      .where(eq(appTemplates.id, templateId))

    // Log audit
    await auditTemplateOperation(
      event,
      'delete',
      templateId,
      user.id,
      template.companyId || undefined,
      {
        before: {
          name: template.name,
          visibility: template.visibility
        }
      }
    )

    return successResponse({
      message: 'Template deleted successfully'
    })
  } catch (error: any) {
    if (error.statusCode) throw error
    
    console.error('Error deleting template:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete template'
    })
  }
})

