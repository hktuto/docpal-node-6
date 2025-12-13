/**
 * Context Types and Injection Keys
 * 
 * Using Symbol keys with TypeScript for type-safe provide/inject
 * Based on: https://vuejs.org/guide/components/provide-inject.html#working-with-symbol-keys
 */

import type { InjectionKey, Ref } from 'vue';

// Database Types
export interface Database {
  id: string;
  name: string;
  company_id: string;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
  // Add more fields as needed
}

export interface DatabaseContext {
  database: Ref<Database | null>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  refresh: () => Promise<void>;
  // Add more methods/state as needed
}

export const DatabaseKey: InjectionKey<DatabaseContext> = Symbol('database');

// Table Types
export interface Table {
  id: string;
  database_id: string;
  name: string;
  metadata: any;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
  // Add more fields as needed
}

export interface TableContext {
  table: Ref<Table | null>;
  columns: Ref<Column[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  refresh: () => Promise<void>;
  // Add more methods/state as needed
}

export const TableKey: InjectionKey<TableContext> = Symbol('table');

// Column Types
export interface Column {
  id: string;
  table_id: string;
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'file' | 'link';
  options: any;
  constraints: any;
  order_index: number;
  created_at: string;
}

// View Types
export interface View {
  id: string;
  table_id: string;
  name: string;
  config: {
    layout: string;
    widgets: Widget[];
    global_filters?: any[];
  };
  is_default: boolean;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
}

export interface Widget {
  id: string;
  type: 'table' | 'kanban' | 'calendar' | 'chart' | 'number' | 'list';
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: any;
}

export interface ViewContext {
  view: Ref<View | null>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  refresh: () => Promise<void>;
  // Add more methods/state as needed
}

export const ViewKey: InjectionKey<ViewContext> = Symbol('view');

