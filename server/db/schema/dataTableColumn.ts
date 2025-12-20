import { pgTable, uuid, text, jsonb, integer, boolean, timestamp } from 'drizzle-orm/pg-core'
import { dataTables } from './dataTable'

export const dataTableColumns = pgTable('data_table_columns', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Reference to parent table
  dataTableId: uuid('data_table_id')
    .notNull()
    .references(() => dataTables.id, { onDelete: 'cascade' }),
  
  // Column definition
  name: text('name').notNull(), // DB column name (snake_case)
  label: text('label').notNull(), // Display label
  type: text('type').notNull(), // text, long_text, number, date, switch
  
  // Column properties
  required: boolean('required').notNull().default(false),
  order: integer('order').notNull().default(0),
  
  // Type-specific configuration (stored as JSONB)
  config: jsonb('config').$type<{
    maxLength?: number
    minLength?: number
    placeholder?: string
    min?: number
    max?: number
    decimals?: number
    format?: 'date' | 'datetime' | 'time'
    defaultValue?: any
    description?: string
    helpText?: string
  }>(),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

