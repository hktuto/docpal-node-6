<script setup lang="ts">
/**
 * Home Page / Database List
 * 
 * Shows all databases for the current user's company
 * Allows creating, viewing, editing, and deleting databases
 */

import { ref, onMounted } from 'vue';
import { Plus, Edit, Delete, FolderOpened, MoreFilled } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { listDatabases, createDatabase, updateDatabase, deleteDatabase, type Database } from '~/utils/database-api';

definePageMeta({
  layout: 'default'
});

// State
const databases = ref<Database[]>([]);
const loading = ref(false);
const createDialogVisible = ref(false);
const editDialogVisible = ref(false);
const newDatabaseName = ref('');
const editingDatabase = ref<Database | null>(null);

// Load databases
const loadDatabases = async () => {
  loading.value = true;
  try {
    databases.value = await listDatabases();
  } catch (error: any) {
    ElMessage.error(error.statusMessage || 'Failed to load databases');
    console.error('Error loading databases:', error);
  } finally {
    loading.value = false;
  }
};

// Create database
const handleCreate = async () => {
  if (!newDatabaseName.value.trim()) {
    ElMessage.warning('Please enter a database name');
    return;
  }
  
  try {
    await createDatabase(newDatabaseName.value.trim());
    ElMessage.success('Database created successfully');
    createDialogVisible.value = false;
    newDatabaseName.value = '';
    await loadDatabases();
  } catch (error: any) {
    ElMessage.error(error.statusMessage || 'Failed to create database');
    console.error('Error creating database:', error);
  }
};

// Edit database
const showEditDialog = (database: Database) => {
  editingDatabase.value = database;
  newDatabaseName.value = database.name;
  editDialogVisible.value = true;
};

const handleEdit = async () => {
  if (!editingDatabase.value) return;
  
  if (!newDatabaseName.value.trim()) {
    ElMessage.warning('Please enter a database name');
    return;
  }
  
  try {
    await updateDatabase(editingDatabase.value.id, newDatabaseName.value.trim());
    ElMessage.success('Database updated successfully');
    editDialogVisible.value = false;
    newDatabaseName.value = '';
    editingDatabase.value = null;
    await loadDatabases();
  } catch (error: any) {
    ElMessage.error(error.statusMessage || 'Failed to update database');
    console.error('Error updating database:', error);
  }
};

// Delete database
const handleDelete = async (database: Database) => {
  try {
    await ElMessageBox.confirm(
      `Are you sure you want to delete "${database.name}"? This action cannot be undone.`,
      'Delete Database',
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    );
    
    await deleteDatabase(database.id);
    ElMessage.success('Database deleted successfully');
    await loadDatabases();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.statusMessage || 'Failed to delete database');
      console.error('Error deleting database:', error);
    }
  }
};

// Open database (will add tab functionality later)
const handleOpen = (database: Database) => {
  ElMessage.info(`Opening database: ${database.name} (Tab functionality coming soon)`);
};

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// Load on mount
onMounted(() => {
  loadDatabases();
});
</script>

<template>
  <div class="database-list-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <h1>Databases</h1>
        <p class="subtitle">Manage your databases and data collections</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="createDialogVisible = true" size="large">
        Create Database
      </el-button>
    </div>
    
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <el-skeleton :rows="3" animated />
    </div>
    
    <!-- Empty State -->
    <div v-else-if="databases.length === 0" class="empty-state">
      <div class="empty-icon">📁</div>
      <h2>No databases yet</h2>
      <p>Create your first database to get started</p>
      <el-button type="primary" :icon="Plus" @click="createDialogVisible = true">
        Create Database
      </el-button>
    </div>
    
    <!-- Database Grid -->
    <div v-else class="database-grid">
      <div
        v-for="database in databases"
        :key="database.id"
        class="database-card"
      >
        <div class="card-header">
          <div class="card-icon">
            <FolderOpened />
          </div>
          <el-dropdown trigger="click" @command="(cmd: string) => cmd === 'edit' ? showEditDialog(database) : handleDelete(database)">
            <el-button text circle size="small">
              <el-icon><MoreFilled /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="edit" :icon="Edit">Edit</el-dropdown-item>
                <el-dropdown-item command="delete" :icon="Delete" divided>Delete</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        
        <div class="card-body" @click="handleOpen(database)">
          <h3 class="database-name">{{ database.name }}</h3>
          <p class="database-meta">Created {{ formatDate(database.created_at) }}</p>
        </div>
      </div>
    </div>
    
    <!-- Create Dialog -->
    <el-dialog
      v-model="createDialogVisible"
      title="Create Database"
      width="500px"
    >
      <el-form @submit.prevent="handleCreate">
        <el-form-item label="Database Name">
          <el-input
            v-model="newDatabaseName"
            placeholder="Enter database name"
            maxlength="255"
            show-word-limit
            autofocus
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="createDialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handleCreate">Create</el-button>
      </template>
    </el-dialog>
    
    <!-- Edit Dialog -->
    <el-dialog
      v-model="editDialogVisible"
      title="Edit Database"
      width="500px"
    >
      <el-form @submit.prevent="handleEdit">
        <el-form-item label="Database Name">
          <el-input
            v-model="newDatabaseName"
            placeholder="Enter database name"
            maxlength="255"
            show-word-limit
            autofocus
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="editDialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handleEdit">Update</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.database-list-page {
  padding: var(--app-space-xl);
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--app-space-xl);
  
  .header-content {
    h1 {
      font-size: var(--app-font-size-3xl);
      font-weight: var(--app-font-weight-title);
      color: var(--app-text-color-primary);
      margin: 0 0 var(--app-space-xs) 0;
    }
    
    .subtitle {
      font-size: var(--app-font-size-m);
      color: var(--app-text-color-secondary);
      margin: 0;
    }
  }
}

.loading-state {
  margin-top: var(--app-space-xl);
}

.empty-state {
  text-align: center;
  padding: var(--app-space-3xl) var(--app-space-xl);
  
  .empty-icon {
    font-size: 64px;
    margin-bottom: var(--app-space-l);
    opacity: 0.5;
  }
  
  h2 {
    font-size: var(--app-font-size-2xl);
    font-weight: var(--app-font-weight-title);
    color: var(--app-text-color-primary);
    margin: 0 0 var(--app-space-s) 0;
  }
  
  p {
    font-size: var(--app-font-size-m);
    color: var(--app-text-color-secondary);
    margin: 0 0 var(--app-space-xl) 0;
  }
}

.database-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--app-space-l);
}

.database-card {
  background: var(--app-paper);
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-border-radius-l);
  padding: var(--app-space-l);
  transition: all 150ms ease;
  
  &:hover {
    box-shadow: var(--app-shadow-m);
    transform: translateY(-2px);
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--app-space-m);
    
    .card-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--app-primary-alpha-10);
      border-radius: var(--app-border-radius-m);
      color: var(--app-primary-color);
      font-size: 24px;
    }
  }
  
  .card-body {
    cursor: pointer;
    
    .database-name {
      font-size: var(--app-font-size-l);
      font-weight: var(--app-font-weight-title);
      color: var(--app-text-color-primary);
      margin: 0 0 var(--app-space-xs) 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .database-meta {
      font-size: var(--app-font-size-s);
      color: var(--app-text-color-secondary);
      margin: 0;
    }
  }
}
</style>

