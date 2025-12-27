import { db } from 'hub:db'
import { appTemplates } from 'hub:db:schema'
import { eq, and, or, isNull, ilike, sql } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth/getCurrentUser'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const query = getQuery(event)
  
  const {
    visibility = 'all', // 'all', 'system', 'company', 'personal'
    category,
    search,
    sort = 'popular' // 'popular', 'newest', 'name'
  } = query

  try {
    // Build where conditions
    const conditions = []
    
    // Visibility filtering with proper access control
    if (visibility === 'system') {
      conditions.push(eq(appTemplates.visibility, 'system'))
    } else if (visibility === 'company') {
      conditions.push(
        and(
          eq(appTemplates.visibility, 'company'),
          eq(appTemplates.companyId, user.company?.id)
        )
      )
    } else if (visibility === 'personal') {
      conditions.push(
        and(
          eq(appTemplates.visibility, 'personal'),
          eq(appTemplates.createdBy, user.id)
        )
      )
    } else {
      // 'all' - show templates user has access to
      conditions.push(
        or(
          eq(appTemplates.visibility, 'system'),
          eq(appTemplates.visibility, 'public'),
          and(
            eq(appTemplates.visibility, 'company'),
            eq(appTemplates.companyId, user.company?.id)
          ),
          and(
            eq(appTemplates.visibility, 'personal'),
            eq(appTemplates.createdBy, user.id)
          )
        )
      )
    }
    
    // Category filter
    if (category) {
      conditions.push(eq(appTemplates.category, category as string))
    }
    
    // Search filter (name, description, tags)
    if (search) {
      const searchTerm = `%${search}%`
      conditions.push(
        or(
          ilike(appTemplates.name, searchTerm),
          ilike(appTemplates.description, searchTerm),
          sql`${appTemplates.tags}::text ILIKE ${searchTerm}`
        )
      )
    }

    // Build query
    let queryBuilder = db
      .select({
        id: appTemplates.id,
        name: appTemplates.name,
        description: appTemplates.description,
        icon: appTemplates.icon,
        coverImage: appTemplates.coverImage,
        category: appTemplates.category,
        tags: appTemplates.tags,
        visibility: appTemplates.visibility,
        isFeatured: appTemplates.isFeatured,
        includesSampleData: appTemplates.includesSampleData,
        includesViews: appTemplates.includesViews,
        usageCount: appTemplates.usageCount,
        createdAt: appTemplates.createdAt,
        // Don't send full template definition in list view
      })
      .from(appTemplates)
      .where(and(...conditions))

    // Sorting
    if (sort === 'popular') {
      queryBuilder = queryBuilder.orderBy(sql`${appTemplates.usageCount} DESC, ${appTemplates.createdAt} DESC`)
    } else if (sort === 'newest') {
      queryBuilder = queryBuilder.orderBy(sql`${appTemplates.createdAt} DESC`)
    } else if (sort === 'name') {
      queryBuilder = queryBuilder.orderBy(sql`${appTemplates.name} ASC`)
    }

    const templates = await queryBuilder

    return successResponse(templates)
  } catch (error: any) {
    console.error('Error fetching app templates:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch app templates'
    })
  }
})

