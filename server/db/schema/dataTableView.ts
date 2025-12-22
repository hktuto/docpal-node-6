import { pgTable, uuid, text, jsonb, boolean, timestamp, unique } from 'drizzle-orm/pg-core'
import { dataTables } from './dataTable'
import { users } from './user'

export const dataTableViews = pgTable('data_table_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Reference to parent table
  dataTableId: uuid('data_table_id')
    .notNull()
    .references(() => dataTables.id, { onDelete: 'cascade' }),
  
  // View metadata
  name: text('name').notNull(), // e.g., "All Records", "Active Only", "My Tasks"
  slug: text('slug').notNull(), // URL-friendly
  type: text('type').notNull().default('table'), // 'table' | 'kanban' | 'calendar' | 'gantt' | 'gallery'
  
  // Default view flag (only one default per table)
  isDefault: boolean('is_default').notNull().default(false),
  
  // Public sharing (for future use)
  isPublic: boolean('is_public').notNull().default(false),
  
  // Column configuration
  visibleColumns: jsonb('visible_columns').$type<string[]>(), // Array of column IDs in display order
  columnWidths: jsonb('column_widths').$type<Record<string, number>>(), // Custom column widths in pixels
  
  // Filtering - supports nested AND/OR conditions
  filters: jsonb('filters').$type<{
    operator: 'AND' | 'OR'
    conditions: Array<{
      columnId: string
      operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'startsWith' | 'endsWith' | 
                'isEmpty' | 'isNotEmpty' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'in' | 'notIn'
      value?: any
      // Nested conditions for complex filters
      conditions?: Array<{
        operator: 'AND' | 'OR'
        conditions: any[]
      }>
    }>
  }>(),
  
  // Sorting - multiple sort criteria
  sort: jsonb('sort').$type<Array<{
    columnId: string
    direction: 'asc' | 'desc'
  }>>(),
  
  // View-specific settings based on type
  viewConfig: jsonb('view_config').$type<{
    // Table/Grid view
    rowHeight?: 'compact' | 'default' | 'tall' | 'extra-tall'
    showRowNumbers?: boolean
    wrapCellContent?: boolean
    
    // Kanban view
    groupByColumn?: string // Column to group by (usually a select/status field)
    cardFields?: string[] // Which fields to show on cards
    cardCoverColumn?: string // Cover image for cards
    
    // Calendar view
    dateColumn?: string // Which date column to use for positioning
    endDateColumn?: string // For date ranges/events
    colorByColumn?: string // Color code events by this field
    viewMode?: 'month' | 'week' | 'day' | 'agenda'
    
    // Gantt view
    startDateColumn?: string
    endDateColumn?: string
    progressColumn?: string // Progress percentage (0-100)
    dependenciesColumn?: string // For task dependencies
    
    // Gallery/Card view
    coverImageColumn?: string
    titleColumn?: string
    cardLayout?: 'grid' | 'list' | 'masonry'
    cardsPerRow?: number
  }>(),
  
  // Pagination settings
  pageSize: jsonb('page_size').$type<number>().default(50),
  
  // Created by (track who created custom views)
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    // Slug is unique per table
    uniqueSlugPerTable: unique().on(table.dataTableId, table.slug),
  }
})

