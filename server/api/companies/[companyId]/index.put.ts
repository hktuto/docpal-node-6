import { db } from 'hub:db'
import { companies, companyMembers } from 'hub:db:schema'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth/getCurrentUser'
import { generateSlug } from '#shared/utils/slug'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const companyId = getRouterParam(event, 'companyId')!
  const body = await readBody(event)
  const { name, description, logo } = body

  // Check if user is admin or owner
  const [membership] = await db
    .select()
    .from(companyMembers)
    .where(
      and(
        eq(companyMembers.companyId, companyId),
        eq(companyMembers.userId, user.id)
      )
    )
    .limit(1)

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    throw createError({
      statusCode: 403,
      message: 'You do not have permission to update this company',
    })
  }

  // Prepare update data
  const updateData: any = {
    updatedAt: new Date(),
  }

  if (name) {
    updateData.name = name
    updateData.slug = generateSlug(name)
  }

  if (description !== undefined) {
    updateData.description = description
  }

  if (logo !== undefined) {
    updateData.logo = logo
  }

  // Update company
  const [company] = await db
    .update(companies)
    .set(updateData)
    .where(eq(companies.id, companyId))
    .returning()

  return successResponse({
    company: {
      id: company.id,
      name: company.name,
      slug: company.slug,
      description: company.description,
      logo: company.logo,
    },
  })
})

