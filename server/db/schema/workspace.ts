import { pgTable, uuid, text, timestamp, jsonb, unique } from 'drizzle-orm/pg-core'
import { companies } from './company'
import type{ MenuItem } from '#shared/types/db'

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  icon: text('icon'),
  description: text('description'),
  menu: jsonb('menu').$type<MenuItem[]>(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Composite unique constraint: slug must be unique within a company
  uniqueSlugPerCompany: unique().on(table.companyId, table.slug),
}))

// Type for menu structure


