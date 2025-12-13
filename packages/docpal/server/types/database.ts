// Database entity types

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

export interface Company {
  id: string;
  name: string;
  owner_id: string;
  created_at: Date;
}

export interface Database {
  id: string;
  company_id: string;
  name: string;
  created_by: string;
  created_at: Date;
  deleted_at: Date | null;
}

export interface Table {
  id: string;
  database_id: string;
  name: string;
  metadata: Record<string, any> | null;
  created_by: string;
  created_at: Date;
  deleted_at: Date | null;
}

export type ColumnType = 'text' | 'number' | 'boolean' | 'date' | 'file' | 'link';

export interface Column {
  id: string;
  table_id: string;
  name: string;
  type: ColumnType;
  options: Record<string, any> | null;
  constraints: Record<string, any> | null;
  order_index: number;
  created_at: Date;
}

export interface Record {
  id: string;
  table_id: string;
  data: Record<string, any>; // JSONB - dynamic fields
  created_by: string;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface File {
  id: string;
  bucket: string;
  key: string;
  size: number;
  mime_type: string;
  checksum: string;
  created_by: string;
  created_at: Date;
}

// Widget types - views are composed of widgets
export type WidgetType = 
  | 'table'      // Table view with optional grouping
  | 'kanban'     // Kanban board
  | 'calendar'   // Calendar view
  | 'gantt'      // Gantt chart
  | 'card'       // Card/gallery view
  | 'number'     // Single metric
  | 'chart'      // Bar/line/pie charts
  | 'list'       // List/activity feed
  | 'progress';  // Progress bar

export interface View {
  id: string;
  table_id: string;
  name: string;
  config: ViewConfig;
  is_default: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface ViewConfig {
  layout: 'grid' | 'freeform';
  global_filters?: Filter[];
  widgets: Widget[];
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  position: WidgetPosition;
  config: WidgetConfig;
}

export interface WidgetPosition {
  x: number;      // Column position (0-11)
  y: number;      // Row position
  w: number;      // Width in columns (1-12)
  h: number;      // Height in rows
}

// Base widget config (common to all widgets)
export interface WidgetConfig {
  visible_columns?: string[];
  column_order?: string[];
  column_settings?: Record<string, ColumnSettings>;
  filters?: Filter[];
  sorts?: Sort[];
  
  // Table widget
  group_by?: string[];           // Multi-level grouping
  group_collapsed?: Record<string, boolean>;
  show_group_summary?: boolean;
  group_aggregations?: Record<string, AggregationType>;
  row_height?: 'short' | 'medium' | 'tall';
  
  // Kanban widget
  group_by_column_id?: string;
  card_cover_column_id?: string;
  card_fields?: string[];
  show_empty_groups?: boolean;
  allow_drag_drop?: boolean;
  
  // Calendar widget
  date_column_id?: string;
  date_range_end_column_id?: string;
  color_by_column_id?: string;
  view_mode?: 'month' | 'week' | 'day';
  
  // Gantt widget
  start_date_column_id?: string;
  end_date_column_id?: string;
  progress_column_id?: string;
  
  // Card widget
  card_title_column_id?: string;
  card_size?: 'small' | 'medium' | 'large';
  cards_per_row?: number;
  
  // Number widget
  column_id?: string;
  aggregation?: AggregationType;
  format?: 'number' | 'currency' | 'percent';
  currency?: string;
  precision?: number;
  comparison?: {
    enabled: boolean;
    type: 'previous_period' | 'previous_month' | 'previous_year';
  };
  
  // Chart widget
  chart_type?: 'bar' | 'line' | 'pie' | 'donut' | 'area';
  x_axis_column_id?: string;
  y_axis_column_id?: string;
  limit?: number;
  
  // List widget
  display_format?: 'compact' | 'detailed';
  limit?: number;
  
  // Progress widget
  goal?: number;
  show_percentage?: boolean;
  
  [key: string]: any;
}

export type AggregationType = 'count' | 'sum' | 'average' | 'min' | 'max' | 'unique';

export interface ColumnSettings {
  width?: number;
  frozen?: boolean;
  wrap?: boolean;
  visible?: boolean;
  format?: string;
}

export type FilterOperator = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'is_any_of'
  | 'is_none_of';

export interface Filter {
  column_id: string;
  operator: FilterOperator;
  value: any;
}

export interface Sort {
  column_id: string;
  direction: 'asc' | 'desc';
}

