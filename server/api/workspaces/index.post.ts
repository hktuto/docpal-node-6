import { db } from 'hub:db'
import { workspaces } from 'hub:db:schema'
import { eq, and } from 'drizzle-orm'
import { generateSlug } from '#shared/utils/slug'
import { auditWorkspaceOperation } from '~~/server/utils/audit'
import { successResponse } from '~~/server/utils/response'
import { requireCompany } from '~~/server/utils/auth/getCurrentUser'

/**
 * Create a new workspace in the current company
 */
export default defineEventHandler(async (event) => {
  const user = requireCompany(event)
  const body = await readBody(event)
  const companyId = user.company.id
  
  // Generate base slug from name if not provided
  let slug = body.slug || generateSlug(body.name)
  
  // Check if slug already exists for this company, if so, append number
  let counter = 1
  let finalSlug = slug
  while (true) {
    const existing = await db
      .select()
      .from(workspaces)
      .where(and(
        eq(workspaces.companyId, companyId),
        eq(workspaces.slug, finalSlug)
      ))
      .limit(1)
    
    if (existing.length === 0) break
    
    finalSlug = `${slug}-${counter}`
    counter++
  }
  
  const [workspace] = await db.insert(workspaces).values({
    name: body.name,
    slug: finalSlug,
    icon: body.icon,
    description: body.description,
    companyId,
  }).returning()
  
  // Audit log workspace creation
  await auditWorkspaceOperation(event, 'create', workspace.id, companyId, user.id, {
    after: {
      name: workspace.name,
      slug: workspace.slug,
      icon: workspace.icon,
      description: workspace.description,
    },
  })
  
  return successResponse(workspace, { message: 'Workspace created successfully' })
})

