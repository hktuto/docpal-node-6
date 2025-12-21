import { db } from 'hub:db'
import { companies, companyMembers } from 'hub:db:schema'
import { requireAuth } from '~~/server/utils/auth/getCurrentUser'
import { updateSessionCompany } from '~~/server/utils/auth/session'
import { generateSlug } from '#shared/utils/slug'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const { name, description, logo } = body

  // Validate input
  if (!name) {
    throw createError({
      statusCode: 400,
      message: 'Company name is required',
    })
  }

  // Generate slug
  const slug = generateSlug(name)

  // Create company
  const [company] = await db
    .insert(companies)
    .values({
      name,
      slug,
      description: description || null,
      logo: logo || null,
      createdBy: user.id,
    })
    .returning()

  // Add user as owner
  await db
    .insert(companyMembers)
    .values({
      companyId: company.id,
      userId: user.id,
      role: 'owner',
    })

  // Switch session to new company
  await updateSessionCompany(user.session.id, company.id)

  return successResponse({
    company: {
      id: company.id,
      name: company.name,
      slug: company.slug,
      description: company.description,
      logo: company.logo,
      role: 'owner',
    },
  })
})

