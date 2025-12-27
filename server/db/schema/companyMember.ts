import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core'
import { companies } from './company'
import { users } from './user'

export const companyMembers = pgTable('company_members', {
  id: uuid('id').primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'owner', 'admin', 'member'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

