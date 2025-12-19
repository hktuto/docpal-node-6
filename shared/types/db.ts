import { users, companies, apps } from 'hub:db:schema'

// Users
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

// Companies
export type Company = typeof companies.$inferSelect
export type NewCompany = typeof companies.$inferInsert

// Apps
export type App = typeof apps.$inferSelect
export type NewApp = typeof apps.$inferInsert

export interface MenuItem {
    id: string
    label: string
    slug: string
    type: 'folder' | 'table' | 'view' | 'dashboard'
    itemId?: string
    description?: string
    children?: MenuItem[]
    order: number
  }