import { pgTable, uuid, text, timestamp, jsonb, boolean, integer } from 'drizzle-orm/pg-core'
import { workspaces } from './workspace'
import { companies } from './company'
import { users } from './user'

export const appTemplates = pgTable('app_templates', {
  id: uuid('id').primaryKey(),
  
  // Basic Info
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  coverImage: text('cover_image'), // URL to cover image (Minio later)
  category: text('category'),
  tags: text('tags').array(),
  
  // Source tracking
  createdFromAppId: uuid('created_from_app_id').references(() => workspaces.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  
  // Visibility & Permissions
  // 'system' = platform templates, 'public' = shared publicly, 'company' = company-wide, 'personal' = creator only
  visibility: text('visibility').notNull().default('personal'),
  isFeatured: boolean('is_featured').default(false),
  
  // Template Definition (The Magic! 🪄)
  // Contains: tables, columns, views, sample data
  templateDefinition: jsonb('template_definition').notNull(),
  
  // Options
  includesSampleData: boolean('includes_sample_data').default(false),
  includesViews: boolean('includes_views').default(true),
  
  // Metadata
  usageCount: integer('usage_count').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

