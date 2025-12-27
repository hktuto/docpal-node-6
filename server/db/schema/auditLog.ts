import { pgTable, text, uuid, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { companies } from './company'
import { users } from './user'

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(), // 'create', 'update', 'delete', 'login', 'logout', 'invite', etc.
  entityType: text('entity_type').notNull(), // 'table', 'row', 'user', 'company', etc.
  entityId: text('entity_id'),
  changes: jsonb('changes'), // { before: {...}, after: {...} }
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

