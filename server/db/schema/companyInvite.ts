import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core'
import { companies } from './company'
import { users } from './user'

export const companyInvites = pgTable('company_invites', {
  id: uuid('id').primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role').notNull(), // 'admin', 'member'
  inviteCode: text('invite_code').notNull().unique(),
  invitedBy: uuid('invited_by').notNull().references(() => users.id),
  acceptedAt: timestamp('accepted_at'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

