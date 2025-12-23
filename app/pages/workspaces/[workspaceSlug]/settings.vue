<script setup lang="ts">
definePageMeta({
  layout: 'app'
})

const router = useRouter()

// Access app context from layout
const { workspace, workspaceSlug, pending, refreshWorkspace, updateWorkspace, deleteWorkspace } = useWorkspaceContext()

// Dynamic page title
useHead({
  title: computed(() => workspace?.value ? `${workspace.value.name} Settings - DocPal` : 'Settings - DocPal')
})

// Form state
const form = ref({
  name: '',
  description: '',
  icon: 'lucide:grid-3x3'
})

const formRef = ref()
const isSaving = ref(false)

// Watch app data and populate form
watch(workspace, (newWorkspace) => {
  console.log('workspace', newWorkspace)
  if (newWorkspace) {
    form.value = {
      name: newWorkspace.name || '',
      description: newWorkspace.description || '',
      icon: newWorkspace.icon || 'lucide:grid-3x3'
    }
  }
}, { immediate: true })

// Common icons
const commonIcons = [
  'lucide:grid-3x3',
  'lucide:database',
  'lucide:folder',
  'lucide:file-text',
  'lucide:calendar',
  'lucide:users',
  'lucide:bar-chart',
  'lucide:settings',
  'lucide:briefcase',
  'lucide:shopping-cart',
  'lucide:package',
  'lucide:clipboard-list'
]

// Save app settings
const saveSettings = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    isSaving.value = true

    const result = await updateWorkspace({
      name: form.value.name,
      description: form.value.description,
      icon: form.value.icon
    })

    if (result) {
      ElMessage.success('App settings updated successfully')
    } else {
      ElMessage.error('Failed to update app settings')
    }
  } catch (error: any) {
    if (error?.data?.message) {
      ElMessage.error(error.data.message)
    } else {
      console.error('Error updating app:', error)
      ElMessage.error('Failed to update app settings')
    }
  } finally {
    isSaving.value = false
  }
}

// Delete app
const handleDelete = async () => {
  if (!workspace.value) return

  try {
    await ElMessageBox.confirm(
      `Are you sure you want to delete "${workspace.value.name}"? This action cannot be undone and will delete all associated data.`,
      'Delete App',
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
        inputPlaceholder: 'Type the app name to confirm',
        inputValidator: (value: string) => {
          if (value !== workspace.value?.name) {
            return 'App name does not match'
          }
          return true
        }
      }
    )

    const success = await deleteWorkspace()
    
    if (success) {
      ElMessage.success('App deleted successfully')
      router.push('/workspaces')
    } else {
      ElMessage.error('Failed to delete app')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Error deleting app:', error)
      ElMessage.error('Failed to delete app')
    }
  }
}
</script>

<template>
  <div class="app-settings-page">
    <div v-if="pending" class="app-settings-page__loading">
      <el-skeleton :rows="5" animated />
    </div>

    <div v-else-if="!workspace" class="app-settings-page__error">
      {{ workspaceSlug }} - {{ workspace }}- {{ pending }}
      <el-result
        status="error"
        title="App Not Found"
        sub-title="The app you're looking for doesn't exist or has been deleted."
      >
        <template #extra>
          <el-button type="primary" @click="router.push('/workspaces')">
            Go to Apps
          </el-button>
        </template>
      </el-result>
    </div>

    <div v-else class="app-settings-page__content">
      <!-- Header -->
      <div class="app-settings-page__header">
        <div class="header-left">
          <h1 class="app-settings-page__title">App Settings</h1>
          <p class="app-settings-page__subtitle">
            Manage your app configuration and preferences
          </p>
        </div>
      </div>

      <!-- Settings Form -->
      <div class="app-settings-page__form">
        <el-card>
          <template #header>
            <div class="card-header-with-actions">
              <div class="card-header">
                <Icon name="lucide:info" size="20" />
                <span>Basic Information</span>
              </div>
              <el-button 
                type="primary" 
                size="default"
                :loading="isSaving"
                @click="saveSettings"
              >
                <Icon name="lucide:save" class="button-icon" />
                Save
              </el-button>
            </div>
          </template>

          <el-form
            ref="formRef"
            :model="form"
            label-position="top"
          >
            <el-form-item
              label="App Name"
              prop="name"
              :rules="[
                { required: true, message: 'Please enter app name', trigger: 'blur' },
                { min: 1, max: 100, message: 'Length should be 1 to 100', trigger: 'blur' }
              ]"
            >
              <el-input
                v-model="form.name"
                placeholder="Enter app name"
                clearable
              />
            </el-form-item>

            <el-form-item
              label="Description"
              prop="description"
            >
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="4"
                placeholder="Enter app description (optional)"
                maxlength="500"
                show-word-limit
              />
            </el-form-item>

            <el-form-item
              label="Icon"
              prop="icon"
            >
              <div class="icon-selector">
                <div
                  v-for="icon in commonIcons"
                  :key="icon"
                  class="icon-option"
                  :class="{ 'icon-option--selected': form.icon === icon }"
                  @click="form.icon = icon"
                >
                  <Icon :name="icon" size="24" />
                </div>
              </div>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- Danger Zone -->
        <el-card class="danger-zone">
          <template #header>
            <div class="card-header danger-header">
              <Icon name="lucide:alert-triangle" size="20" />
              <span>Danger Zone</span>
            </div>
          </template>

          <div class="danger-content">
            <div class="danger-info">
              <h3>Delete App</h3>
              <p>
                Once you delete an app, there is no going back. This will permanently
                delete the app and all associated data including tables, views, and records.
              </p>
            </div>
            <el-button
              type="danger"
              @click="handleDelete"
            >
              <Icon name="lucide:trash-2" class="button-icon" />
              Delete App
            </el-button>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-settings-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--app-space-l);

  &__loading {
    padding: var(--app-space-xl) 0;
  }

  &__error {
    padding: var(--app-space-xl) 0;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--app-space-xl);
    gap: var(--app-space-m);
  }

  &__title {
    margin: 0 0 var(--app-space-xs) 0;
    font-size: var(--app-font-size-xxl);
    font-weight: var(--app-font-weight-title);
    color: var(--app-text-color-primary);
    line-height: 1.2;
  }

  &__subtitle {
    margin: 0;
    font-size: var(--app-font-size-m);
    color: var(--app-text-color-secondary);
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: var(--app-space-l);
  }
}

.header-left {
  flex: 1;
}

.button-icon {
  margin-right: var(--app-space-xs);
}

.card-header-with-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
  font-weight: var(--app-font-weight-title);
  color: var(--app-text-color-primary);

  &.danger-header {
    color: var(--app-danger-color);
  }
}

.icon-selector {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--app-space-s);
  padding: var(--app-space-s);
  background: var(--app-fill-color);
  border-radius: var(--app-border-radius-m);
}

.icon-option {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  border: 2px solid var(--app-border-color-light);
  border-radius: var(--app-border-radius-s);
  transition: all 0.2s ease;
  color: var(--app-text-color-secondary);
  background: var(--app-paper);

  &:not(:disabled) {
    cursor: pointer;

    &:hover {
      border-color: var(--app-primary-color);
      background: var(--app-primary-alpha-10);
      color: var(--app-primary-color);
    }
  }

  &--selected {
    border-color: var(--app-primary-color);
    background: var(--app-primary-alpha-30);
    color: var(--app-primary-color);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.danger-zone {
  border-color: var(--app-danger-color);
}

.danger-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--app-space-l);
}

.danger-info {
  flex: 1;

  h3 {
    margin: 0 0 var(--app-space-xs) 0;
    font-size: var(--app-font-size-l);
    font-weight: var(--app-font-weight-title);
    color: var(--app-text-color-primary);
  }

  p {
    margin: 0;
    font-size: var(--app-font-size-m);
    color: var(--app-text-color-secondary);
    line-height: 1.5;
  }
}

// Responsive
@media (max-width: 768px) {
  .app-settings-page {
    padding: var(--app-space-m);

    &__header {
      flex-direction: column;
      align-items: stretch;
    }
  }

  .danger-content {
    flex-direction: column;
    align-items: stretch;
  }

  .icon-selector {
    grid-template-columns: repeat(4, 1fr);
  }
  
  .card-header-with-actions {
    flex-direction: column;
    align-items: stretch;
    gap: var(--app-space-m);
    
    .el-button {
      width: 100%;
    }
  }
}
</style>

