import { users, companies, workspaces, dataTables, dataTableColumns, dataTableViews, appTemplates, viewPermissions, userViewPreferences } from 'hub:db:schema'
import type { ColumnType } from './fieldTypes'
// Users
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

// Companies
export type Company = typeof companies.$inferSelect
export type NewCompany = typeof companies.$inferInsert

// Workspaces
export type Workspace = typeof workspaces.$inferSelect
export type NewWorkspace = typeof workspaces.$inferInsert

// Data Tables
export type DataTable = typeof dataTables.$inferSelect
export type NewDataTable = typeof dataTables.$inferInsert

// Data Table Columns
export type DataTableColumn = typeof dataTableColumns.$inferSelect
export type NewDataTableColumn = typeof dataTableColumns.$inferInsert

// Data Table Views
export type DataTableView = typeof dataTableViews.$inferSelect
export type NewDataTableView = typeof dataTableViews.$inferInsert

// View Permissions
export type ViewPermission = typeof viewPermissions.$inferSelect
export type NewViewPermission = typeof viewPermissions.$inferInsert

// User View Preferences
export type UserViewPreference = typeof userViewPreferences.$inferSelect
export type NewUserViewPreference = typeof userViewPreferences.$inferInsert

// App Templates
export type AppTemplate = typeof appTemplates.$inferSelect
export type NewAppTemplate = typeof appTemplates.$inferInsert

// Menu Item Interface
export interface MenuItem {
    id: string
    label: string
    slug: string
    type: 'folder' | 'table' | 'view' | 'dashboard'
    itemId?: string
    description?: string
    children?: MenuItem[]
    order: number
    // View-specific fields
    viewId?: string
    tableId?: string
    tableSlug?: string
}

// Column Configuration
export interface ColumnConfig {
  // For text fields
  maxLength?: number
  minLength?: number
  placeholder?: string
  
  // For number fields
  min?: number
  max?: number
  decimals?: number
  
  // For date fields
  format?: 'date' | 'datetime' | 'time'
  
  // For switch
  defaultValue?: boolean
  
  // Common
  description?: string
  helpText?: string
}

// Table Column Definition (for API input when creating tables)
export interface TableColumnDef {
  id?: string // Optional, will be generated if not provided
  name: string
  label?: string // Optional, will auto-generate from name if not provided
  type: ColumnType
  required?: boolean
  order?: number
  config?: ColumnConfig
}

// ==================== Layout JSON Types ====================
// These define the structure for custom layouts stored in data_tables

// Form Layout JSON
export interface FormJson {
  layout?: 'single' | 'two-column'
  sections?: {
    title: string
    collapsed?: boolean
    fields: {
      columnId: string      // Reference to data_table_columns.id
      label?: string        // Override label
      placeholder?: string
      helpText?: string
      hidden?: boolean
      readonly?: boolean
      width?: 'full' | 'half' | 'third'
    }[]
  }[]
}

// List/Grid View Layout JSON
export interface ListJson {
  columns?: {
    columnId: string
    label?: string        // Override label
    width?: number        // px or %
    sortable?: boolean
    hidden?: boolean
    align?: 'left' | 'center' | 'right'
    order: number
  }[]
  defaultSort?: { 
    columnId: string
    direction: 'asc' | 'desc' 
  }
  rowsPerPage?: number
}

// Card View Layout JSON
export interface CardJson {
  title?: string          // Column ID to use as card title
  subtitle?: string       // Column ID to use as subtitle
  image?: string          // Column ID for image
  fields?: {
    columnId: string
    label?: string
    displayType?: 'inline' | 'block'
  }[]
  actions?: string[]      // Which actions to show
}

// Dashboard Layout JSON (for future use)
export interface DashboardJson {
  widgets?: {
    id: string
    type: 'metric' | 'chart' | 'list' | 'table'
    title: string
    config?: Record<string, any>
    position?: { 
      x: number
      y: number
      w: number
      h: number 
    }
  }[]
}

// ==================== App Template Types ====================

export interface TemplateTableDefinition {
  name: string
  slug?: string
  description?: string
  columns: TableColumnDef[]
  views?: {
    name: string
    viewType: 'grid' | 'kanban' | 'gallery' | 'calendar' | 'form'
    filterJson?: any
    sortJson?: any
    visibleColumns?: string[]
  }[]
  sampleData?: Record<string, any>[]
}

export interface AppTemplateDefinition {
  menu?: MenuItem[]  // Optional menu structure for the workspace
  tables: TemplateTableDefinition[]
}

// View Filter and Sort Types
export type FilterOperator = 
  | 'equals' | 'notEquals' 
  | 'contains' | 'notContains' 
  | 'startsWith' | 'endsWith'
  | 'isEmpty' | 'isNotEmpty'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'between' | 'in' | 'notIn'

export interface FilterCondition {
  columnId: string
  operator: FilterOperator
  value?: any
}

export interface FilterGroup {
  operator: 'AND' | 'OR'
  conditions: (FilterCondition | FilterGroup)[]
}

export interface SortConfig {
  columnId: string
  direction: 'asc' | 'desc'
}