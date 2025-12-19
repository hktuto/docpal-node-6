import { db } from 'hub:db'
import { apps } from 'hub:db:schema'
import { eq, and } from 'drizzle-orm'
import { generateSlug } from '#shared/utils/slug'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  // For Phase 1: use dummy company ID
  const dummyCompanyId = '00000000-0000-0000-0000-000000000001'
  
  // Generate base slug from name if not provided
  let slug = body.slug || generateSlug(body.name)
  
  // Check if slug already exists for this company, if so, append number
  let counter = 1
  let finalSlug = slug
  while (true) {
    const existing = await db
      .select()
      .from(apps)
      .where(and(
        eq(apps.companyId, dummyCompanyId),
        eq(apps.slug, finalSlug)
      ))
      .limit(1)
    
    if (existing.length === 0) break
    
    finalSlug = `${slug}-${counter}`
    counter++
  }
  
  const [app] = await db.insert(apps).values({
    name: body.name,
    slug: finalSlug,
    icon: body.icon,
    description: body.description,
    companyId: dummyCompanyId,
  }).returning()
  
  return app
})

