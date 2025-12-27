import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { dataTableViews } from './dataTableView'
import { users } from './user'

/**
 * View Permissions - Control who can access and modify views
 * 
 * Supports both user-specific and role-based permissions
 */
export const viewPermissions = pgTable('view_permissions', {
  id: uuid('id').primaryKey(),
  
  // Reference to view
  viewId: uuid('view_id')
    .notNull()
    .references(() => dataTableViews.id, { onDelete: 'cascade' }),
  
  // User-specific permission (nullable for role-based permissions)
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  
  // Role-based permission (nullable for user-specific permissions)
  // 'owner' = creator, 'admin' = company admin, 'member' = company member
  role: text('role'), // 'owner' | 'admin' | 'member'
  
  // Permission type
  permissionType: text('permission_type').notNull(), // 'view' | 'edit' | 'delete'
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

