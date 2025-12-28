<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isCreating ? 'Create View' : 'View Settings'"
    width="650px"
    @close="handleClose"
  >
    <el-form v-if="localView" :model="localView" label-position="top" ref="formRef">
      <el-form-item label="View Name">
        <el-input v-model="localView.name" placeholder="Enter view name" />
      </el-form-item>
      
      <el-form-item label="Description">
        <el-input
          v-model="localView.description"
          type="textarea"
          :rows="3"
          placeholder="Add a description (optional)"
        />
      </el-form-item>
      
      <el-form-item label="View Type">
        <el-radio-group v-model="localView.viewType">
          <el-radio-button value="grid">
            <el-icon><Grid /></el-icon>
            <span>Grid</span>
          </el-radio-button>
          <el-radio-button value="kanban">
            <el-icon><Tickets /></el-icon>
            <span>Kanban</span>
          </el-radio-button>
          <el-radio-button value="calendar">
            <el-icon><Calendar /></el-icon>
            <span>Calendar</span>
          </el-radio-button>
          <el-radio-button value="gallery">
            <el-icon><Picture /></el-icon>
            <span>Gallery</span>
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
      
      <!-- View-specific settings -->
      <template v-if="localView.viewType === 'grid'">
        <el-form-item label="Group By Column">
          <el-select v-model="viewConfig.groupBy" clearable placeholder="None (default)">
            <el-option
              v-for="col in groupableColumns"
              :key="col.id"
              :label="col.label"
              :value="col.name"
            >
              <span>{{ col.label }}</span>
              <span style="float: right; color: var(--el-text-color-secondary); font-size: 13px">
                {{ getColumnTypeLabel(col.type) }}
              </span>
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item v-if="viewConfig.groupBy" label="Aggregate Field">
          <el-select v-model="viewConfig.aggregateField" clearable placeholder="None">
            <el-option
              v-for="col in columns.filter((c: any) => c.type === 'number' || c.type === 'currency')"
              :key="col.id"
              :label="col.label"
              :value="col.name"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item v-if="viewConfig.aggregateField" label="Aggregate Function">
          <el-select v-model="viewConfig.aggregateFunction" placeholder="SUM">
            <el-option label="SUM" value="sum" />
            <el-option label="AVG" value="avg" />
            <el-option label="MIN" value="min" />
            <el-option label="MAX" value="max" />
            <el-option label="COUNT" value="count" />
          </el-select>
        </el-form-item>
      </template>
      
      <template v-if="localView.viewType === 'kanban'">
        <el-form-item label="Group By Column" required>
          <el-select v-model="viewConfig.groupBy" placeholder="Select a column">
            <el-option
              v-for="col in groupableColumns"
              :key="col.id"
              :label="col.label"
              :value="col.name"
            >
              <span>{{ col.label }}</span>
              <span style="float: right; color: var(--el-text-color-secondary); font-size: 13px">
                {{ getColumnTypeLabel(col.type) }}
              </span>
            </el-option>
          </el-select>
          <div style="margin-top: 8px; color: var(--el-text-color-secondary); font-size: 12px">
            📊 Group by Select, Status, Relation, User, Text, Number, Boolean, or Date fields
          </div>
        </el-form-item>
      </template>
      
      <template v-if="localView.viewType === 'calendar'">
        <el-form-item label="Date Field" required>
          <el-select v-model="viewConfig.dateField" placeholder="Select a date column">
            <el-option
              v-for="col in columns.filter((c: any) => c.type === 'date' || c.type === 'datetime')"
              :key="col.id"
              :label="col.label"
              :value="col.name"
            />
          </el-select>
        </el-form-item>
      </template>
      
      <template v-if="localView.viewType === 'gallery'">
        <el-form-item label="Image Field">
          <el-select v-model="viewConfig.imageField" clearable placeholder="Select an image column">
            <el-option
              v-for="col in columns.filter((c: any) => c.type === 'url' || c.type === 'attachment')"
              :key="col.id"
              :label="col.label"
              :value="col.name"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="Card Size">
          <el-radio-group v-model="viewConfig.cardSize">
            <el-radio-button value="small">Small</el-radio-button>
            <el-radio-button value="medium">Medium</el-radio-button>
            <el-radio-button value="large">Large</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </template>
      
      <el-divider />
      
      <!-- Default Filters Section -->
      <el-form-item>
        <template #label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>Default Filters</span>
            <el-tooltip content="These filters are applied by default when the view opens. Users can still add temporary filters.">
              <el-icon><InfoFilled /></el-icon>
            </el-tooltip>
          </div>
        </template>
        <AppViewsFilterBuilder
          :columns="columns"
          :filters="localView.filters"
          @change="(filters: any) => localView.filters = filters"
        />
      </el-form-item>
      
      <!-- Default Sorts Section -->
      <el-form-item>
        <template #label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>Default Sorting</span>
            <el-tooltip content="These sorting rules are applied by default. Users can still add temporary sorts.">
              <el-icon><InfoFilled /></el-icon>
            </el-tooltip>
          </div>
        </template>
        <AppViewsSortBuilder
          :columns="columns"
          :sorts="localView.sorts"
          @change="(sorts: any) => localView.sorts = sorts"
        />
      </el-form-item>
      
      <el-divider />
      
      <el-form-item>
        <template #label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>Visibility & Sharing</span>
          </div>
        </template>
        <el-switch
          v-model="localView.isPublic"
          active-text="Public (anyone with link can view)"
          inactive-text="Private (workspace members only)"
        />
      </el-form-item>
      
      <el-form-item v-if="!view?.isDefault">
        <el-switch
          v-model="localView.isDefault"
          active-text="Set as default view"
          inactive-text="Regular view"
        />
      </el-form-item>
      
      <el-divider />
      
      <el-form-item label="Page Size">
        <el-input-number
          v-model="localView.pageSize"
          :min="10"
          :max="200"
          :step="10"
        />
        <span style="margin-left: 12px; color: var(--el-text-color-secondary);">
          Rows per page
        </span>
      </el-form-item>
    </el-form>
    
    <template #footer>
      <el-button @click="handleClose">Cancel</el-button>
      <el-button type="primary" @click="handleSave">
        {{ isCreating ? 'Create View' : 'Save Changes' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { Grid, Tickets, Calendar, Picture, InfoFilled } from '@element-plus/icons-vue'
import type { DataTableView } from '#shared/types/db'
import type { FormInstance } from 'element-plus'

interface Props {
  visible: boolean
  view: DataTableView | null
  isCreating?: boolean
  columns?: any[] // Available columns for group by/aggregate
}

const props = withDefaults(defineProps<Props>(), {
  isCreating: false,
  columns: () => []
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: [updates: Partial<DataTableView>]
  create: [viewData: Partial<DataTableView>]
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const formRef = ref<FormInstance>()
const localView = ref<Partial<DataTableView>>({})
const viewConfig = ref<any>({})

// Groupable column types for Kanban view
const groupableColumnTypes = [
  'select', 'status',                    // Select fields (best for Kanban)
  'relation',                            // Relations to other tables
  'text', 'richtext', 'email', 'url', 'phone', // Text fields (groups by unique values)
  'number', 'currency',                  // Number fields (groups by unique values)
  'boolean',                             // Boolean fields (Yes/No groups)
  'date', 'datetime',                    // Date fields (groups by dates)
  'user'                                 // User fields
]

// Get columns that can be grouped in Kanban
const groupableColumns = computed(() => {
  return props.columns.filter((col: any) => groupableColumnTypes.includes(col.type))
})

// Get human-readable column type label
function getColumnTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    select: 'Select',
    status: 'Status',
    relation: 'Relation',
    text: 'Text',
    richtext: 'Rich Text',
    email: 'Email',
    url: 'URL',
    phone: 'Phone',
    number: 'Number',
    currency: 'Currency',
    boolean: 'Boolean',
    date: 'Date',
    datetime: 'DateTime',
    user: 'User'
  }
  return labels[type] || type
}

// Clone view when dialog opens
watch(() => [props.view, props.isCreating, props.visible], ([newView, creating, visible]) => {
  if (visible) {
    if (creating) {
      // Initialize for new view
      localView.value = {
        name: '',
        description: '',
        viewType: 'grid',
        isPublic: false,
        isDefault: false,
        pageSize: 50,
        filters: null,
        sorts: null
      }
      viewConfig.value = {}
    } else if (newView) {
      // Clone existing view
      localView.value = {
        name: newView.name,
        description: newView.description || '',
        viewType: newView.viewType,
        isPublic: newView.isPublic,
        isDefault: newView.isDefault,
        pageSize: newView.pageSize || 50,
        filters: newView.filters ? JSON.parse(JSON.stringify(newView.filters)) : null,
        sorts: newView.sorts ? JSON.parse(JSON.stringify(newView.sorts)) : null
      }
      viewConfig.value = (newView.viewConfig as any) || {}
    }
  }
}, { immediate: true })

function handleClose() {
  emit('update:visible', false)
}

function handleSave() {
  // Merge view config if it has settings
  const updates = {
    ...localView.value,
    viewConfig: Object.keys(viewConfig.value).length > 0 ? viewConfig.value : undefined
  }
  
  if (props.isCreating) {
    emit('create', updates)
  } else {
    emit('save', updates)
  }
  handleClose()
}
</script>

<style scoped>
:deep(.el-radio-button) {
  margin-right: 8px;
}

:deep(.el-radio-button__inner) {
  display: flex;
  align-items: center;
  gap: 4px;
}

:deep(.el-switch) {
  --el-switch-on-color: var(--el-color-primary);
}
</style>

