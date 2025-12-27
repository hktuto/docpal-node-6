import { pgTable, uuid, jsonb, timestamp, unique } from 'drizzle-orm/pg-core'
import { dataTableViews } from './dataTableView'
import { users } from './user'

/**
 * User View Preferences - Personal customizations per user per view
 * 
 * Stores user-specific settings like column widths, row height, hidden columns
 * that override the view's default settings
 */
export const userViewPreferences = pgTable('user_view_preferences', {
  id: uuid('id').primaryKey(),
  
  // Reference to view
  viewId: uuid('view_id')
    .notNull()
    .references(() => dataTableViews.id, { onDelete: 'cascade' }),
  
  // Reference to user
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  
  // User preferences (overrides view defaults)
  preferences: jsonb('preferences').$type<{
    // Column settings
    columnWidths?: Record<string, number> // Column ID -> width in pixels
    columnOrder?: string[] // Custom column order (column IDs)
    hiddenColumns?: string[] // Columns hidden by this user
    frozenColumns?: string[] // Columns pinned/frozen by this user
    
    // Display settings
    rowHeight?: 'compact' | 'default' | 'tall' | 'extra-tall'
    wrapCellContent?: boolean
    showRowNumbers?: boolean
    
    // View-specific preferences
    groupExpanded?: Record<string, boolean> // For kanban/grouped views
    calendarViewMode?: 'month' | 'week' | 'day' | 'agenda'
    
    // Pagination
    pageSize?: number
    
    // Last scroll position (for maintaining position)
    scrollPosition?: {
      x: number
      y: number
    }
  }>(),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    // One preference per user per view
    uniqueUserView: unique().on(table.viewId, table.userId),
  }
})

