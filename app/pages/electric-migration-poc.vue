<template>
  <div class="p-8 max-w-7xl mx-auto">
    <h1 class="text-3xl font-bold mb-8">Electric SQL Migration POC</h1>

    <!-- Company Section -->
    <div class="mb-8 p-6 bg-white rounded-lg shadow">
      <h2 class="text-2xl font-semibold mb-4">Company</h2>
      <div v-if="companyLoading" class="text-gray-500">Loading company...</div>
      <div v-else-if="company" class="space-y-2">
        <p><strong>Name:</strong> {{ company.name }}</p>
        <p><strong>Slug:</strong> {{ company.slug }}</p>
        <p><strong>Logo:</strong> {{ company.logo || 'None' }}</p>
        <p class="text-sm text-gray-500">
          Created: {{ new Date(company.created_at).toLocaleString() }}
        </p>
      </div>
    </div>

    <!-- Users Section -->
    <div v-if="users" class="mb-8 p-6 bg-white rounded-lg shadow">
      <h2 class="text-2xl font-semibold mb-4">Users ({{ users.length }})</h2>
      <div v-if="usersLoading" class="text-gray-500">Loading users...</div>
      <div v-else class="space-y-2">
        <div
          v-for="user in users"
          :key="user.id"
          class="flex items-center space-x-3 p-3 bg-gray-50 rounded"
        >
          <div
            v-if="user.avatar"
            class="w-10 h-10 rounded-full bg-gray-300"
            :style="{ backgroundImage: `url(${user.avatar})`, backgroundSize: 'cover' }"
          />
          <div v-else class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
            {{ user.name?.[0] || user.email[0] }}
          </div>
          <div class="flex-1">
            <div class="font-medium">{{ user.name || 'No name' }}</div>
            <div class="text-sm text-gray-500">{{ user.email }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Data Tables Section -->
    <div v-if="dataTables" class="mb-8 p-6 bg-white rounded-lg shadow">
      <h2 class="text-2xl font-semibold mb-4">Data Tables ({{ dataTables.length }})</h2>
      <div v-if="dataTablesLoading" class="text-gray-500">Loading tables...</div>
      <div v-else class="space-y-2">
        <div
          v-for="table in dataTables"
          :key="table.id"
          class="p-4 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
          @click="selectTable(table)"
        >
          <div class="flex items-center justify-between">
            <div>
              <div class="font-medium">{{ table.name }}</div>
              <div class="text-sm text-gray-500">{{ table.table_name }}</div>
            </div>
            <div class="text-sm text-gray-500">
              {{ table.description || 'No description' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected Table Data Section -->
    <div v-if="selectedTable " class="mb-8 p-6 bg-white rounded-lg shadow">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-semibold">
          Table Data: {{ selectedTable.name }}
        </h2>
        <button
          @click="selectedTable = null"
          class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Close
        </button>
      </div>

      <div v-if="tableDataLoading" class="text-gray-500">Loading table data...</div>
      <div v-else-if="tableDataResyncing" class="text-orange-500">
        ⚠️ Schema changed, resyncing...
      </div>
      <div v-else>
        <p class="mb-4 text-gray-600">
          {{ tableData.length }} rows found
        </p>

        <div v-if="tableData.length > 0" class="overflow-x-auto">
          <table class="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr class="bg-gray-100">
                <th
                  v-for="(value, key) in tableData[0]"
                  :key="key"
                  class="border border-gray-300 px-4 py-2 text-left text-sm font-medium"
                >
                  {{ key }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, index) in tableData.slice(0, 10)"
                :key="row.id || index"
                class="hover:bg-gray-50"
              >
                <td
                  v-for="(value, key) in row"
                  :key="key"
                  class="border border-gray-300 px-4 py-2 text-sm"
                >
                  {{ formatValue(value) }}
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="tableData.length > 10" class="mt-2 text-sm text-gray-500">
            Showing first 10 of {{ tableData.length }} rows
          </p>
        </div>
        <div v-else class="text-gray-500">No data in this table</div>
      </div>
    </div>

    <!-- Status Section -->
    <div v-if="company && users && dataTables && selectedTable " class="p-6 bg-blue-50 rounded-lg">
      <h3 class="text-lg font-semibold mb-2">✅ All composables working!</h3>
      <ul class="list-disc list-inside space-y-1 text-sm text-gray-700">
        <li>useCompany: {{ companyLoading ? 'Loading...' : '✅ Loaded' }}</li>
        <li>useUsers: {{ usersLoading ? 'Loading...' : `✅ ${users.length} users` }}</li>
        <li>useDataTables: {{ dataTablesLoading ? 'Loading...' : `✅ ${dataTables.length} tables` }}</li>
        <li>useTableData: {{ selectedTable ? (tableDataLoading ? 'Loading...' : `✅ ${tableData.length} rows`) : 'Select a table to test' }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
// Test all new composables
const { company, isLoading: companyLoading } = useCompany()
const { users, isLoading: usersLoading } = useUsers()
const { tables: dataTables, isLoading: dataTablesLoading } = useDataTables()

const selectedTable = ref<any>(null)
const selectedTableSlug = computed(() => selectedTable.value?.slug || '')
const selectedWorkspaceId = computed(() => selectedTable.value?.workspace_id || '')

let tableDataComposable: any = null
const tableData = ref<any[]>([])
const tableDataLoading = ref(false)
const tableDataResyncing = ref(false)

const selectTable = async (table: any) => {
  selectedTable.value = table
  
  // Use useTableData composable
  const { rows, isLoading, isResyncing } = useTableData(
    selectedTableSlug,
    selectedWorkspaceId
  )
  
  tableData.value = rows.value
  tableDataLoading.value = isLoading.value
  tableDataResyncing.value = isResyncing.value
  
  watch(rows, (newRows) => {
    tableData.value = newRows
  })
  
  watch(isLoading, (loading) => {
    tableDataLoading.value = loading
  })
  
  watch(isResyncing, (resyncing) => {
    tableDataResyncing.value = resyncing
  })
}

const formatValue = (value: any) => {
  if (value === null) return 'NULL'
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'string' && value.length > 50) return value.slice(0, 50) + '...'
  return value
}

// Auto-refresh page title
useHead({
  title: 'Electric Migration POC - Testing All Composables'
})
</script>

