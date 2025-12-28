import type { InjectionKey, Ref } from 'vue'
import type { DataTable, DataTableColumn, DataTableView, FilterGroup, SortConfig } from '#shared/types/db'

export interface TableContext {
  // Basic info
  workspaceSlug: Ref<string>
  tableSlug: Ref<string>
  table: Ref<DataTable | null>
  currentView: Ref<DataTableView | null>
  
  // Temporary filters/sorts state (applied but not saved)
  tempFilters: Ref<FilterGroup | null>
  tempSorts: Ref<SortConfig[] | null>
  
  // Row actions
  handleAddRow: () => void
  handleEditRow: (row: any) => void
  handleDeleteRow: (row: any) => Promise<void>
  handleRowSaved: () => Promise<void>
  
  // Column actions
  handleAddColumnLeft: (column: any) => void
  handleAddColumnRight: (column: any) => void
  handleEditColumn: (column: any) => void
  handleRemoveColumn: (column: any) => Promise<void>
  handleColumnReorder: (params: { oldColumn: any; newColumn: any; dragPos: string }) => Promise<void>
  handleColumnSaved: (column: DataTableColumn) => Promise<void>
  
  // View actions
  handleViewUpdate: (updates: Partial<DataTableView>) => Promise<void>
  handleViewEdit?: (view: DataTableView) => void
  
  // Filter/Sort actions (temporary, not saved to view)
  handleFiltersApplied: (filters: FilterGroup | null) => void
  handleSortsApplied: (sorts: SortConfig[] | null) => void
  
  // Refresh actions
  refreshView: () => Promise<void>
  refreshTable: () => Promise<void>
  refreshWorkspace: () => Promise<void>
}

export const TableContextKey: InjectionKey<TableContext> = Symbol('TableContext')

export function useTableContext() {
  const context = inject(TableContextKey)
  
  if (!context) {
    throw new Error('useTableContext must be used within a TableProvider')
  }
  
  return context
}

