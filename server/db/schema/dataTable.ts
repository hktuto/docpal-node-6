import { pgTable, uuid, text, jsonb, timestamp, unique } from 'drizzle-orm/pg-core'
import { workspaces } from './workspace'
import { companies } from './company'

export const dataTables = pgTable('data_tables', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  
  // Physical PostgreSQL table name (e.g., dt_abc123def456_8f3a4b2c1d9e)
  tableName: text('table_name').notNull().unique(),
  
  // References
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  
  description: text('description'),
  
  // Layout configurations (null = use schema-based defaults, populated = user customized)
  formJson: jsonb('form_json'),           // Custom form builder layout
  cardJson: jsonb('card_json'),           // Custom card view layout
  dashboardJson: jsonb('dashboard_json'), // Custom dashboard layout
  listJson: jsonb('list_json'),           // Custom list/grid view layout
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    // Slug is unique per workspace (allows same table name across different workspaces in same company)
    uniqueSlugPerWorkspace: unique().on(table.workspaceId, table.slug),
  }
})

