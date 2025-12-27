/**
 * View Configuration Types
 * Each view type has specific configuration options
 */

// ============================================
// GRID VIEW CONFIG
// ============================================
export interface GridViewConfig {
  type: 'grid'
  
  // Display options
  rowHeight?: 'compact' | 'default' | 'comfortable'
  showRowNumbers?: boolean
  wrapText?: boolean
  
  // Grouping
  groupBy?: {
    columnId: string
    collapsed?: boolean // Collapse groups by default
    hideEmpty?: boolean // Hide empty groups
  }
  
  // Aggregations (for grouped views)
  aggregations?: {
    columnId: string
    function: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'countEmpty' | 'countFilled' | 'percentFilled'
  }[]
  
  // Freezing
  frozenColumns?: string[] // Column IDs to freeze
}

// ============================================
// KANBAN VIEW CONFIG
// ============================================
export interface KanbanViewConfig {
  type: 'kanban'
  
  // Required: Group by field (usually select/status)
  groupBy: {
    columnId: string // Must be a select or status field
    hiddenOptions?: string[] // Hide specific options/cards
  }
  
  // Card display
  cardFields?: string[] // Column IDs to show on cards
  coverField?: string // Attachment/image field for card cover
  
  // Behavior
  allowDragAndDrop?: boolean
  emptyLaneVisibility?: 'show' | 'hide' | 'hideIfEmpty'
  
  // Filtering within lanes
  laneFilters?: {
    [laneId: string]: {
      operator: 'AND' | 'OR'
      conditions: any[]
    }
  }
}

// ============================================
// CALENDAR VIEW CONFIG
// ============================================
export interface CalendarViewConfig {
  type: 'calendar'
  
  // Required: Date field
  dateField: {
    columnId: string // Must be a date/datetime field
    endDateColumnId?: string // For date ranges
  }
  
  // Display
  defaultView?: 'month' | 'week' | 'day' | 'agenda'
  firstDayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Sunday
  
  // Event display
  eventFields?: string[] // Fields to show on event
  colorBy?: {
    columnId: string // Color events by this field
    mapping?: { [value: string]: string } // Value to color mapping
  }
  
  // Time
  timeFormat?: '12h' | '24h'
  showWeekends?: boolean
}

// ============================================
// GALLERY VIEW CONFIG
// ============================================
export interface GalleryViewConfig {
  type: 'gallery'
  
  // Required: Image field
  coverField: {
    columnId: string // Must be attachment/url field
    fit?: 'cover' | 'contain' | 'fill'
  }
  
  // Layout
  cardSize?: 'small' | 'medium' | 'large'
  cardsPerRow?: number | 'auto'
  
  // Card content
  cardFields?: string[] // Fields to show below image
  showFieldLabels?: boolean
}

// ============================================
// FORM VIEW CONFIG
// ============================================
export interface FormViewConfig {
  type: 'form'
  
  // Form fields
  fields: {
    columnId: string
    label?: string // Override field label
    description?: string
    required?: boolean // Override field required
    hidden?: boolean
  }[]
  
  // Appearance
  title?: string
  description?: string
  submitButtonText?: string
  successMessage?: string
  
  // Behavior
  allowMultipleSubmissions?: boolean
  redirectUrl?: string
  notifyOnSubmit?: string[] // User IDs to notify
}

// ============================================
// UNION TYPE
// ============================================
export type ViewConfig = 
  | GridViewConfig 
  | KanbanViewConfig 
  | CalendarViewConfig 
  | GalleryViewConfig 
  | FormViewConfig

// ============================================
// TYPE GUARDS
// ============================================
export function isGridView(config: ViewConfig): config is GridViewConfig {
  return config.type === 'grid'
}

export function isKanbanView(config: ViewConfig): config is KanbanViewConfig {
  return config.type === 'kanban'
}

export function isCalendarView(config: ViewConfig): config is CalendarViewConfig {
  return config.type === 'calendar'
}

export function isGalleryView(config: ViewConfig): config is GalleryViewConfig {
  return config.type === 'gallery'
}

export function isFormView(config: ViewConfig): config is FormViewConfig {
  return config.type === 'form'
}

// ============================================
// DEFAULT CONFIGS
// ============================================
export const defaultGridConfig: GridViewConfig = {
  type: 'grid',
  rowHeight: 'default',
  showRowNumbers: true,
  wrapText: false
}

export const defaultKanbanConfig: Partial<KanbanViewConfig> = {
  type: 'kanban',
  allowDragAndDrop: true,
  emptyLaneVisibility: 'show'
}

export const defaultCalendarConfig: Partial<CalendarViewConfig> = {
  type: 'calendar',
  defaultView: 'month',
  firstDayOfWeek: 0,
  timeFormat: '12h',
  showWeekends: true
}

export const defaultGalleryConfig: Partial<GalleryViewConfig> = {
  type: 'gallery',
  cardSize: 'medium',
  cardsPerRow: 'auto',
  showFieldLabels: true
}

export const defaultFormConfig: Partial<FormViewConfig> = {
  type: 'form',
  submitButtonText: 'Submit',
  successMessage: 'Thank you for your submission!',
  allowMultipleSubmissions: true
}

