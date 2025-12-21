import { db } from 'hub:db'
import { auditLogs } from 'hub:db:schema'
import type { H3Event } from 'h3'

export type AuditAction = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'login' 
  | 'logout' 
  | 'invite' 
  | 'accept_invite'
  | 'switch_company'

export type AuditEntityType = 
  | 'user' 
  | 'company' 
  | 'app' 
  | 'table' 
  | 'row' 
  | 'column' 
  | 'view' 
  | 'workflow'
  | 'dashboard'
  | 'folder'

export interface AuditLogData {
  companyId?: string
  userId?: string
  action: AuditAction
  entityType: AuditEntityType
  entityId?: string
  changes?: {
    before?: any
    after?: any
  }
  ipAddress?: string
  userAgent?: string
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: AuditLogData) {
  try {
    await db.insert(auditLogs).values({
      companyId: data.companyId || null,
      userId: data.userId || null,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId || null,
      changes: data.changes || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    })
  } catch (error) {
    // Log error but don't fail the main operation
    console.error('Failed to create audit log:', error)
  }
}

/**
 * Create audit log from H3Event
 */
export async function auditFromEvent(
  event: H3Event,
  data: Omit<AuditLogData, 'ipAddress' | 'userAgent'>
) {
  const ipAddress = getRequestIP(event, { xForwardedFor: true })
  const userAgent = getHeader(event, 'user-agent')

  await createAuditLog({
    ...data,
    ipAddress,
    userAgent,
  })
}

/**
 * Helper functions for common audit scenarios
 */

export async function auditTableOperation(
  event: H3Event,
  action: 'create' | 'update' | 'delete',
  tableId: string,
  companyId: string,
  userId: string,
  changes?: { before?: any; after?: any }
) {
  await auditFromEvent(event, {
    companyId,
    userId,
    action,
    entityType: 'table',
    entityId: tableId,
    changes,
  })
}

export async function auditRowOperation(
  event: H3Event,
  action: 'create' | 'update' | 'delete',
  rowId: string,
  tableId: string,
  companyId: string,
  userId: string,
  changes?: { before?: any; after?: any }
) {
  await auditFromEvent(event, {
    companyId,
    userId,
    action,
    entityType: 'row',
    entityId: `${tableId}:${rowId}`,
    changes,
  })
}

export async function auditUserOperation(
  event: H3Event,
  action: AuditAction,
  userId: string,
  companyId?: string
) {
  await auditFromEvent(event, {
    companyId,
    userId,
    action,
    entityType: 'user',
    entityId: userId,
  })
}

export async function auditCompanyOperation(
  event: H3Event,
  action: 'create' | 'update' | 'delete',
  companyId: string,
  userId: string,
  changes?: { before?: any; after?: any }
) {
  await auditFromEvent(event, {
    companyId,
    userId,
    action,
    entityType: 'company',
    entityId: companyId,
    changes,
  })
}

