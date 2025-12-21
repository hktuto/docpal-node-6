import { db } from 'hub:db'
import { auditLogs, users } from 'hub:db:schema'
import { eq, and, desc } from 'drizzle-orm'
import { requireCompany } from '~~/server/utils/auth/getCurrentUser'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireCompany(event)
  const query = getQuery(event)
  
  const limit = parseInt(query.limit as string) || 50
  const offset = parseInt(query.offset as string) || 0
  const entityType = query.entityType as string
  const entityId = query.entityId as string
  const action = query.action as string

  // Build where conditions
  const conditions = [eq(auditLogs.companyId, user.company.id)]

  if (entityType) {
    conditions.push(eq(auditLogs.entityType, entityType))
  }

  if (entityId) {
    conditions.push(eq(auditLogs.entityId, entityId))
  }

  if (action) {
    conditions.push(eq(auditLogs.action, action))
  }

  // Get audit logs with user info
  const logs = await db
    .select({
      log: auditLogs,
      user: users,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset)

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(and(...conditions))

  return successResponse(
    {
      logs: logs.map(({ log, user }) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        changes: log.changes,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        } : null,
      })),
    },
    {
      pagination: {
        total: count,
        limit,
        offset,
      },
    }
  )
})

