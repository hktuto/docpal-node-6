# DataGrid Layer

A reusable Nuxt layer providing a powerful DataGrid component built on vxe-table.

## Features

- ✅ Built on vxe-table (high-performance)
- ✅ **Virtual scrolling** for large datasets (10k+ rows)
- ✅ **Proxy mode** - offload data fetching to vxe-table
- ✅ Built-in pagination (handled by vxe-table)
- ✅ Sortable columns
- ✅ Loading states
- ✅ Action buttons (view, edit, delete)
- ✅ Custom column slots
- ✅ Checkbox selection
- ✅ TypeScript generic support
- ✅ Fully customizable

## Installation

This layer is already configured in the main Nuxt app. If you want to use it in another project:

1. Copy the `layers/datagrid` folder to your project
2. Add to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  extends: [
    './layers/datagrid'
  ]
})
```

3. Make sure vxe-table is installed:

```bash
pnpm add vxe-table vxe-pc-ui
```

## Usage

DataGrid supports two modes:
1. **Manual Mode** - You fetch and provide data directly
2. **Proxy Mode** (Recommended) - vxe-table handles data fetching, pagination, and lazy loading automatically

### Proxy Mode (Recommended)

This is the recommended approach for large datasets. vxe-table handles all data fetching, pagination, and lazy loading automatically.

```vue
<template>
  <DataGrid
    ref="gridRef"
    :columns="columns"
    :proxy-config="proxyConfig"
    :virtual-scroll="true"
    :page-size="50"
    height="100%"
    @edit="handleEdit"
    @delete="handleDelete"
  />
</template>

<script setup lang="ts">
import type { VxeGridPropTypes } from 'vxe-table'

interface Row {
  id: string
  name: string
  email: string
}

const gridRef = ref()

const columns = ref([
  { field: 'name', title: 'Name', minWidth: 150, sortable: true },
  { field: 'email', title: 'Email', minWidth: 200, sortable: true },
])

// Proxy configuration - vxe-table will call this automatically
const proxyConfig = computed<VxeGridPropTypes.ProxyConfig>(() => ({
  ajax: {
    query: async ({ page, sort, filters }) => {
      const limit = page.pageSize
      const offset = (page.currentPage - 1) * page.pageSize
      
      const response = await $apiResponse<Row[]>(
        `/api/data?limit=${limit}&offset=${offset}`
      )
      
      return {
        result: response || [],
        page: {
          total: response.meta?.pagination?.total || 0
        }
      }
    },
  },
  autoLoad: true // Auto fetch on mount
}))

function handleEdit(row: Row) {
  console.log('Edit:', row)
}

function handleDelete(row: Row) {
  console.log('Delete:', row)
  // After delete, refresh the grid
  gridRef.value?.refresh()
}
</script>
```

**Benefits of Proxy Mode:**
- ✅ Automatic data fetching
- ✅ Automatic pagination
- ✅ Better performance with virtual scrolling
- ✅ Lazy loading support
- ✅ Less boilerplate code
- ✅ Built-in loading states

### Manual Mode (Basic Example)

```vue
<template>
  <DataGrid
    :data="rows"
    :columns="columns"
    :loading="loading"
    :current-page="currentPage"
    :page-size="pageSize"
    :total="total"
    @page-change="handlePageChange"
    @edit="handleEdit"
    @delete="handleDelete"
  />
</template>

<script setup lang="ts">
interface Row {
  id: string
  name: string
  email: string
  status: string
}

const rows = ref<Row[]>([
  { id: '1', name: 'John Doe', email: 'john@example.com', status: 'active' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' },
])

const columns = ref([
  { field: 'name', title: 'Name', minWidth: 150, sortable: true },
  { field: 'email', title: 'Email', minWidth: 200, sortable: true },
  { field: 'status', title: 'Status', width: 120, sortable: true },
])

const currentPage = ref(1)
const pageSize = ref(50)
const total = ref(100)
const loading = ref(false)

function handlePageChange({ currentPage: page, pageSize: size }) {
  currentPage.value = page
  pageSize.value = size
  // Fetch new data...
}

function handleEdit(row: Row) {
  console.log('Edit:', row)
}

function handleDelete(row: Row) {
  console.log('Delete:', row)
}
</script>
```

### With Custom Column Slots

```vue
<template>
  <DataGrid
    :data="rows"
    :columns="columns"
  >
    <!-- Custom status badge -->
    <template #status="{ row }">
      <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
        {{ row.status }}
      </el-tag>
    </template>
    
    <!-- Custom email with icon -->
    <template #email="{ row }">
      <div style="display: flex; align-items: center; gap: 8px;">
        <Icon name="lucide:mail" size="16" />
        {{ row.email }}
      </div>
    </template>
  </DataGrid>
</template>
```

### With Checkbox Selection

```vue
<template>
  <DataGrid
    :data="rows"
    :columns="columns"
    :checkbox-config="{ checkField: 'checked', trigger: 'row' }"
    @selection-change="handleSelectionChange"
  />
</template>

<script setup>
function handleSelectionChange(rows) {
  console.log('Selected rows:', rows)
}
</script>
```

### Without Action Buttons

```vue
<template>
  <DataGrid
    :data="rows"
    :columns="columns"
    :show-actions="false"
  />
</template>
```

## Props

### Data Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `T[]` | `[]` | Array of row data (Manual Mode only) |
| `columns` | `Column[]` | Required | Column definitions |
| `loading` | `boolean` | `false` | Show loading state (Manual Mode only) |
| `proxyConfig` | `VxeGridPropTypes.ProxyConfig` | - | Proxy configuration (Proxy Mode) |

### Pagination Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `currentPage` | `number` | `1` | Current page number (Manual Mode) |
| `pageSize` | `number` | `50` | Rows per page |
| `total` | `number` | `0` | Total number of rows (Manual Mode) |
| `pageSizes` | `number[]` | `[10, 20, 50, 100, 200]` | Page size options |

### Virtual Scrolling Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `virtualScroll` | `boolean` | `true` | Enable virtual scrolling |
| `scrollYLoad` | `boolean` | `false` | Enable lazy loading on scroll (use with proxy) |
| `scrollY` | `VxeGridPropTypes.ScrollY` | `{ enabled: true, gt: 20 }` | Custom virtual scroll config |

### Display Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `height` | `number \| string` | `'auto'` | Table height |
| `maxHeight` | `number \| string` | - | Maximum table height |
| `stripe` | `boolean` | `true` | Striped rows |
| `border` | `boolean` | `true` | Show borders |
| `showOverflow` | `boolean` | `true` | Show ellipsis for overflow |

### Selection Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `checkboxConfig` | `object` | - | Checkbox configuration (see vxe-table docs) |

### Actions Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showActions` | `boolean` | `true` | Show action column |
| `actionsWidth` | `number \| string` | `120` | Action column width |
| `actionsFixed` | `'left' \| 'right'` | `'right'` | Fix action column position |

## Column Definition

```typescript
interface Column {
  field: string         // Field name in data
  title: string         // Column header title
  width?: number | string
  minWidth?: number | string
  sortable?: boolean
  fixed?: 'left' | 'right'
  formatter?: (params: { cellValue: any, row: any }) => string
  slots?: {
    default?: string  // Slot name for custom rendering
  }
}
```

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:currentPage` | `number` | Current page changed (Manual Mode) |
| `update:pageSize` | `number` | Page size changed (Manual Mode) |
| `pageChange` | `{ currentPage, pageSize }` | Pagination changed (Manual Mode) |
| `proxyQuery` | `params` | Proxy query executed (Proxy Mode) |
| `proxyDelete` | `params` | Proxy delete executed (Proxy Mode) |
| `edit` | `row: T` | Edit button clicked |
| `delete` | `row: T` | Delete button clicked |
| `view` | `row: T` | View button clicked |
| `selectionChange` | `rows: T[]` | Checkbox selection changed |

## Methods (via ref)

```typescript
const gridRef = ref()

// Refresh the grid data (triggers proxy query)
gridRef.value.refresh()

// Get checked rows
const selected = gridRef.value.getCheckboxRecords()

// Clear checkbox selection
gridRef.value.clearCheckboxRow()

// Access underlying vxe-table instance
const vxeGrid = gridRef.value.$grid
```

## Slots

- `actions` - Custom actions column content
- `[field]` - Custom cell content for any column (use column's `field` name)
- `empty` - Custom empty state

## TypeScript Support

The DataGrid component uses TypeScript generics for full type safety:

```typescript
interface User {
  id: string
  name: string
  email: string
}

// DataGrid will be typed as DataGrid<User>
// All events (edit, delete, etc.) will receive User type
```

## Advanced Customization

For more advanced features, refer to the [vxe-table documentation](https://vxetable.cn/).

You can pass additional vxe-table options through the component if needed.

## License

MIT

