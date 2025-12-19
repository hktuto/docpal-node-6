import { db } from 'hub:db'
import { users, companies, apps } from 'hub:db:schema'
import { sql } from 'drizzle-orm'

/**
 * GET /api/admin/stats
 * Returns system statistics for admin dashboard
 */
export default defineEventHandler(async (event) => {
  // TODO: In Phase 2, check if user is admin
  // For Phase 1, allow access
  
  try {
    // Get counts from database
    const [userCount, companyCount, appCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(companies),
      db.select({ count: sql<number>`count(*)` }).from(apps),
    ])
    
    return {
      totalUsers: Number(userCount[0]?.count || 0),
      totalCompanies: Number(companyCount[0]?.count || 0),
      totalApps: Number(appCount[0]?.count || 0),
      totalTables: 0, // TODO: Count dynamic tables when implemented
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch admin stats',
      message: error.message,
    })
  }
})


