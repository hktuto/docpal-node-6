<script setup lang="ts">
  import AppCard from '~/components/app/AppCard.vue'
  import AppTemplatesListPicker from '~/components/app/templates/ListPicker.vue'

  definePageMeta({
    layout: 'default'
  })

  useHead({
    title: 'My Workspaces - DocPal'
  })
    
  // State
  const showCreateDialog = ref(false)
  const form = ref({
    name: '',
    description: '',
    icon: 'lucide:grid-3x3'
  })
  
  const formRef = ref()
  
  // Fetch apps
  const { data, pending, refresh, error } = await useApi<SuccessResponse<App[]>>('/api/workspaces')
  const apps = computed(() => data.value?.data)
  // Create app
  const createApp = async () => {
    if (!formRef.value) return
    
    const {$api} = useNuxtApp()
    try {
      await formRef.value.validate()
      
      await $api('/api/workspaces', {
        method: 'POST',
        body: {
          name: form.value.name,
          description: form.value.description,
          icon: form.value.icon
        }
      })
      
      // Clear form
      form.value = { name: '', description: '', icon: 'lucide:grid-3x3' }
      showCreateDialog.value = false
      
      // Refresh the list
      await refresh()
      
      ElMessage.success('App created successfully!')
    } catch (error: any) {
      if (error?.data?.message) {
        ElMessage.error(error.data.message)
      } else {
        console.error('Error creating app:', error)
        ElMessage.error('Failed to create app')
      }
    }
  }

  // Apply template
  const applyTemplate = async (template: any) => {
    try {
      // Pre-fill the form with template data
      form.value = {
        name: template.name,
        description: template.description,
        icon: template.icon
      }
      
      // Open the create dialog
      showCreateDialog.value = true
      
      ElMessage.info('Template applied! Customize the app name and details before creating.')
    } catch (error: any) {
      console.error('Error applying template:', error)
      ElMessage.error('Failed to apply template')
    }
  }

  // Edit app
  const handleEditApp = (app: Workspace) => {
    form.value = {
      name: app.name || '',
      description: app.description || '',
      icon: app.icon || 'lucide:grid-3x3'
    }
    showCreateDialog.value = true
    // TODO: Track which app is being edited and update instead of create
  }

  // Delete app
  const handleDeleteApp = async (app: Workspace) => {
    try {
      await ElMessageBox.confirm(
        `Are you sure you want to delete "${app.name}"? This action cannot be undone.`,
        'Delete App',
        {
          confirmButtonText: 'Delete',
          cancelButtonText: 'Cancel',
          type: 'warning',
          confirmButtonClass: 'el-button--danger'
        }
      )

      const {$api} = useNuxtApp()
      await $api(`/api/workspaces/${app.slug}`, {
        method: 'DELETE' as any
      })

      await refresh()
      ElMessage.success('App deleted successfully')
    } catch (error: any) {
      if (error !== 'cancel') {
        console.error('Error deleting app:', error)
        ElMessage.error('Failed to delete app')
      }
    }
  }
  
  const handleDialogClose = () => {
    form.value = { name: '', description: '', icon: 'lucide:grid-3x3' }
    formRef.value?.clearValidate()
    showCreateDialog.value = false
  }
  
  // Common icons for apps
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

</script>
    
    <template>
      <div class="app-list-page">
        {{ error }}
        <!-- Header -->
        <div class="app-list-page__header">
          <div>
            <h1 class="app-list-page__title">My Workspaces</h1>
            <p class="app-list-page__subtitle">
              Create and manage your applications
            </p>
          </div>
          <el-button 
            v-if="pending || (apps && apps.length !== 0)"
            type="primary" 
            size="large"
            @click="showCreateDialog = true"
          >
            <Icon name="lucide:plus" class="button-icon" />
            Create App
          </el-button>
        </div>
    
        <!-- Apps Grid -->
        <div v-if="pending" class="app-list-page__loading">
          <el-skeleton :rows="3" animated />
        </div>
        
        <div v-else-if="!apps || apps.length === 0" class="app-list-page__empty">
          <AppTemplatesListPicker @apply="applyTemplate" />
        </div>
        
        <div v-else class="app-list-page__grid">
          <AppCard 
            v-for="app in apps" 
            :key="app.id" 
            :app="app"
            @edit="handleEditApp"
            @delete="handleDeleteApp"
          />
        </div>
    
        <!-- Create App Dialog -->
        <el-dialog
          v-model="showCreateDialog"
          title="Create New App"
          width="500px"
          :before-close="handleDialogClose"
        >
          <el-form
            ref="formRef"
            :model="form"
            label-width="100px"
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
                :rows="3"
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
    
          <template #footer>
            <div class="dialog-footer">
              <el-button @click="handleDialogClose">Cancel</el-button>
              <el-button type="primary" @click="createApp">
                Create App
              </el-button>
            </div>
          </template>
        </el-dialog>
      </div>
    </template>
    
    <style lang="scss" scoped>
    .app-list-page {
      max-width: 1400px;
      margin: 0 auto;
      padding: var(--app-space-l);
    
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
    
      &__loading {
        padding: var(--app-space-xl) 0;
      }
    
      &__empty {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 400px;
      }
    
      &__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: var(--app-space-l);
      }
    }
    
    .empty-state {
      text-align: center;
      padding: var(--app-space-xl);
    
      &__icon {
        color: var(--app-text-color-placeholder);
        margin-bottom: var(--app-space-m);
      }
    
      &__title {
        margin: 0 0 var(--app-space-xs) 0;
        font-size: var(--app-font-size-xl);
        font-weight: var(--app-font-weight-title);
        color: var(--app-text-color-primary);
      }
    
      &__description {
        margin: 0 0 var(--app-space-l) 0;
        font-size: var(--app-font-size-m);
        color: var(--app-text-color-secondary);
      }
    }
    
    .button-icon {
      margin-right: var(--app-space-xs);
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
      cursor: pointer;
      transition: all 0.2s ease;
      color: var(--app-text-color-secondary);
      background: var(--app-paper);
    
      &:hover {
        border-color: var(--app-primary-color);
        background: var(--app-primary-alpha-10);
        color: var(--app-primary-color);
      }
    
      &--selected {
        border-color: var(--app-primary-color);
        background: var(--app-primary-alpha-30);
        color: var(--app-primary-color);
      }
    }
    
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--app-space-s);
    }
    
    // Responsive
    @media (max-width: 768px) {
      .app-list-page {
        padding: var(--app-space-m);
    
        &__header {
          flex-direction: column;
          align-items: stretch;
        }
    
        &__grid {
          grid-template-columns: 1fr;
        }
      }
    
      .icon-selector {
        grid-template-columns: repeat(4, 1fr);
      }
    }
    </style>
    