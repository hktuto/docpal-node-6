<template>
  <div class="electric-poc">
    <div class="poc-header">
      <h1>⚡ ElectricSQL Sync POC</h1>
      <p>Real-time workspace sync demonstration</p>
      
      <!-- Connection Status -->
      <div class="status-bar">
        <div class="status-item">
          <span class="label">Connection:</span>
          <span :class="['status', isConnected ? 'connected' : 'disconnected']">
            {{ isConnected ? '✓ Connected' : '○ Disconnected' }}
          </span>
        </div>
        <div class="status-item">
          <span class="label">Syncing:</span>
          <span :class="['status', isSyncing ? 'syncing' : '']">
            {{ isSyncing ? '↻ Syncing...' : '✓ Ready' }}
          </span>
        </div>
        <div v-if="error" class="status-item error">
          <span class="label">Error:</span>
          <span>{{ error }}</span>
        </div>
      </div>
    </div>

    <div class="poc-content">
      <!-- Instructions -->
      <div class="instructions">
        <h2>📚 How to Test</h2>
        <ol>
          <li>Open this page in <strong>two browser tabs</strong></li>
          <li>Create or edit a workspace in one tab</li>
          <li>Watch it <strong>automatically appear/update</strong> in the other tab</li>
          <li>Works <strong>offline</strong> - try disconnecting your network!</li>
        </ol>
      </div>

      <!-- Workspaces List -->
      <div class="workspaces-section">
        <div class="section-header">
          <h2>🗂️ Synced Workspaces ({{ workspaces.length }})</h2>
          <button @click="startSync" :disabled="isSyncing || isInitializing" class="btn-primary">
            {{ isSyncing ? 'Syncing...' : isInitializing ? 'Initializing...' : 'Start Sync' }}
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="loading">
          <div class="spinner"></div>
          <p>Loading workspaces from local database...</p>
        </div>

        <!-- Workspaces Grid -->
        <div v-else-if="workspaces.length > 0" class="workspaces-grid">
          <div 
            v-for="workspace in workspaces" 
            :key="workspace.id"
            class="workspace-card"
          >
            <div class="workspace-icon">{{ workspace.icon || '📁' }}</div>
            <div class="workspace-info">
              <h3>{{ workspace.name }}</h3>
              <p class="workspace-slug">{{ workspace.slug }}</p>
              <p v-if="workspace.description" class="workspace-desc">
                {{ workspace.description }}
              </p>
              <div class="workspace-meta">
                <span class="meta-item">
                  🕒 {{ formatDate(workspace.created_at) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <p>No workspaces synced yet. Click "Start Sync" to begin.</p>
        </div>
      </div>

      <!-- Stats & Debug Info -->
      <div class="debug-section">
        <h3>🔍 Debug Info</h3>
        <div class="debug-grid">
          <div class="debug-item">
            <span class="debug-label">Database:</span>
            <span class="debug-value">IndexedDB (docpal-electric)</span>
          </div>
          <div class="debug-item">
            <span class="debug-label">Sync Service:</span>
            <span class="debug-value">/api/electric/shape (proxy)</span>
          </div>
          <div class="debug-item">
            <span class="debug-label">Active Shapes:</span>
            <span class="debug-value">{{ activeShapes.join(', ') || 'None' }}</span>
          </div>
          <div class="debug-item">
            <span class="debug-label">Last Update:</span>
            <span class="debug-value">{{ lastUpdate }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Set layout
definePageMeta({
  layout: 'default',
})

interface Workspace {
  id: string
  name: string
  slug: string
  icon?: string
  description?: string
  company_id: string
  created_at: string
  updated_at: string
}

const electric = useElectricSync()

// State
const workspaces = ref<Workspace[]>([])
const loading = ref(false)
const isSyncing = ref(false)
const lastUpdate = ref('Never')

const isConnected = computed(() => electric.isConnected.value)
const isInitializing = computed(() => electric.isInitializing.value)
const error = computed(() => electric.error.value)

const activeShapes = computed(() => {
  const status = electric.getSyncStatus()
  return status.activeShapes
})

// Electric accessed via secure proxy (no direct access needed)

/**
 * Start syncing workspaces from Electric
 */
const startSync = async () => {
  try {
    isSyncing.value = true
    loading.value = true

    console.log('[POC] Starting Electric sync...')

    // Initialize connection
    await electric.initialize()

    // Use secure proxy endpoint (server handles auth & filtering)
    // No need to expose Electric URL or company_id to client!
    await electric.syncShape(
      'workspaces',
      'workspaces',
      '/api/electric/shape?table=workspaces&offset=-1'
    )

    console.log('[POC] Sync started, setting up live query...')

    // Start polling for updates
    startLiveQuery()

    ElMessage.success('✓ Sync started! Try opening another tab to see live updates.')
  } catch (err) {
    console.error('[POC] Sync failed:', err)
    ElMessage.error('Failed to start sync: ' + (err as Error).message)
  } finally {
    isSyncing.value = false
  }
}

/**
 * Set up live query to watch for changes
 */
const startLiveQuery = () => {
  const queryData = electric.useLiveQuery<Workspace>(
    'SELECT * FROM workspaces ORDER BY created_at DESC',
    [],
    1000 // Poll every 1 second
  )

  // Watch for data changes
  watch(queryData.data, (newData) => {
    if (newData && newData.length > 0) {
      workspaces.value = newData
      lastUpdate.value = new Date().toLocaleTimeString()
      loading.value = false
      console.log('[POC] Workspaces updated:', newData.length)
    }
  })

  // Watch for errors
  watch(queryData.error, (err) => {
    if (err) {
      console.error('[POC] Query error:', err)
    }
  })

  // Initial loading state
  watch(queryData.loading, (isLoading) => {
    loading.value = isLoading
  })
}

/**
 * Format date for display
 */
const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Auto-initialize on mount
onMounted(() => {
  console.log('[POC] Page mounted')
})
</script>

<style scoped lang="scss">
.electric-poc {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.poc-header {
  text-align: center;
  color: white;
  margin-bottom: 3rem;

  h1 {
    font-size: 3rem;
    margin-bottom: 0.5rem;
    font-weight: 700;
  }

  p {
    font-size: 1.2rem;
    opacity: 0.9;
  }
}

.status-bar {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 2rem;
  flex-wrap: wrap;

  .status-item {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    padding: 0.75rem 1.5rem;
    border-radius: 12px;
    display: flex;
    gap: 0.5rem;
    align-items: center;

    .label {
      font-weight: 600;
      opacity: 0.8;
    }

    .status {
      font-weight: 700;

      &.connected {
        color: #4ade80;
      }

      &.disconnected {
        color: #fbbf24;
      }

      &.syncing {
        color: #60a5fa;
        animation: pulse 1s infinite;
      }
    }

    &.error {
      background: rgba(239, 68, 68, 0.2);
    }
  }
}

.poc-content {
  max-width: 1200px;
  margin: 0 auto;
}

.instructions {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;

  h2 {
    margin-bottom: 1rem;
    color: #667eea;
  }

  ol {
    margin-left: 1.5rem;

    li {
      margin: 0.75rem 0;
      font-size: 1.1rem;
      line-height: 1.6;

      strong {
        color: #667eea;
      }
    }
  }
}

.workspaces-section {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;

    h2 {
      margin: 0;
      color: #667eea;
    }
  }

  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

.loading {
  text-align: center;
  padding: 3rem;

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #f3f4f6;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  p {
    color: #6b7280;
  }
}

.workspaces-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.workspace-card {
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s;
  display: flex;
  gap: 1rem;

  &:hover {
    border-color: #667eea;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
    transform: translateY(-2px);
  }

  .workspace-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }

  .workspace-info {
    flex: 1;

    h3 {
      margin: 0 0 0.25rem 0;
      color: #111827;
      font-size: 1.25rem;
    }

    .workspace-slug {
      color: #667eea;
      font-family: monospace;
      font-size: 0.9rem;
      margin: 0 0 0.5rem 0;
    }

    .workspace-desc {
      color: #6b7280;
      font-size: 0.9rem;
      margin: 0 0 0.75rem 0;
    }

    .workspace-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.85rem;
      color: #9ca3af;

      .meta-item {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }
    }
  }
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}

.debug-section {
  background: #1f2937;
  color: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);

  h3 {
    margin: 0 0 1.5rem 0;
    color: #60a5fa;
  }

  .debug-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;

    .debug-item {
      background: rgba(255, 255, 255, 0.05);
      padding: 1rem;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      .debug-label {
        font-size: 0.85rem;
        opacity: 0.7;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .debug-value {
        font-family: monospace;
        color: #60a5fa;
        font-weight: 600;
      }
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>

