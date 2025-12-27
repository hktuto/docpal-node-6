import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core'
import { users } from './user'
import { companies } from './company'

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

