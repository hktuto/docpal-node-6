import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { companies } from './company'

export const apps = pgTable('apps', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  icon: text('icon'),
  description: text('description'),
  menu: jsonb('menu').$type<MenuItem[]>(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Type for menu structure
export interface MenuItem {
  id: string
  label: string
  type: 'folder' | 'table' | 'view' | 'dashboard'
  itemId?: string
  children?: MenuItem[]
  order: number
}

