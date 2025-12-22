<template>
  <div v-if="user" :class="{'user-menu':true, 'expanded':expandState}">
    <el-dropdown 
      trigger="click" 
      placement="top-start"
      @command="handleCommand"
    >
      <div class="user-menu-trigger" :class="{ expanded: expandState }">
        <div class="user-avatar">
          <img 
            v-if="user?.avatar" 
            :src="user.avatar" 
            :alt="user.name || user.email"
          />
          <div v-else class="avatar-placeholder">
            {{ userInitials }}
          </div>
        </div>
        <div v-if="expandState" class="user-info">
          <div class="user-name">{{ user?.name || 'User' }}</div>
          <div class="user-email">{{ user?.email }}</div>
        </div>
        
      </div>

      <template #dropdown>
        <el-dropdown-menu class="user-dropdown-menu">
          <!-- User Info Section -->
          <div class="dropdown-header">
            <div class="header-avatar">
              <img 
                v-if="user?.avatar" 
                :src="user.avatar" 
                :alt="user.name || user.email"
              />
              <div v-else class="avatar-placeholder">
                {{ userInitials }}
              </div>
            </div>
            <div class="header-info">
              <div class="header-name">{{ user?.name || 'User' }}</div>
              <div class="header-email">{{ user?.email }}</div>
            </div>
          </div>

          <el-dropdown-item divided command="profile">
            <Icon name="lucide:user" />
            <span>Profile</span>
          </el-dropdown-item>

          <!-- Company Switcher Section -->
          <div v-if="companies.length > 0" class="company-section">
            <div class="section-label">Switch Company</div>
            <el-dropdown-item
              v-for="company in companies"
              :key="company.id"
              :command="`switch-${company.id}`"
              :disabled="company.id === auth.company.value?.id"
            >
              <div class="company-item">
                <Icon name="lucide:building-2" />
                <div class="company-info">
                  <strong>{{ company.name }}</strong>
                  <span>{{ company.role }}</span>
                </div>
                <Icon
                  v-if="company.id === auth.company.value?.id"
                  name="lucide:check"
                  class="check-icon"
                />
              </div>
            </el-dropdown-item>
          </div>

          <el-dropdown-item 
            divided 
            command="create-company"
          >
            <Icon name="lucide:plus" />
            <span>Create Company</span>
          </el-dropdown-item>

          <el-dropdown-item 
            v-if="auth.company.value" 
            divided 
            command="company-settings"
          >
            <Icon name="lucide:building-2" />
            <span>Company Settings</span>
          </el-dropdown-item>

          <el-dropdown-item divided command="settings">
            <Icon name="lucide:settings" />
            <span>Settings</span>
          </el-dropdown-item>

          <el-dropdown-item divided command="logout">
            <Icon name="lucide:log-out" />
            <span>Logout</span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <!-- Create Company Dialog -->
    <CompaniesCreateCompanyDialog
      v-model="showCreateCompanyDialog"
      @success="fetchCompanies"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  expandState: boolean
}>()

const auth = useAuth()
const router = useRouter()

interface Company {
  id: string
  name: string
  slug: string
  role: string
}

const user = computed(() => auth.user.value)
const companies = ref<Company[]>([])
const loading = ref(false)

const userInitials = computed(() => {
  if (!user.value?.name) {
    return user.value?.email?.charAt(0).toUpperCase() || 'U'
  }
  const names = user.value.name.split(' ')
  const first = names[0]
  const second = names[1]
  if (names.length >= 2 && first && second && first.length > 0 && second.length > 0) {
    return (first.charAt(0) + second.charAt(0)).toUpperCase()
  }
  return user.value.name.charAt(0).toUpperCase()
})

onMounted(async () => {
  await fetchCompanies()
})

// Watch for auth changes to refresh companies
watch(() => auth.user.value, async () => {
  await fetchCompanies()
})

const fetchCompanies = async () => {
  const {$api} = useNuxtApp()
  try {
    loading.value = true
    const response = await $api<{ data: { companies: Company[] } }>('/api/companies')
    companies.value = response.data?.companies || []
  } catch (e) {
    console.error('Failed to fetch companies:', e)
    companies.value = []
  } finally {
    loading.value = false
  }
}

const handleCommand = async (command: string) => {
  console.log('handleCommand', command)
  if (command === 'profile') {
    router.push('/profile')
    return
  }

  if (command === 'create-company') {
    showCreateCompanyDialog.value = true
    return
  }

  if (command === 'company-settings') {
    router.push('/companies/settings')
    return
  }

  if (command === 'settings') {
    router.push('/settings')
    return
  }

  if (command === 'logout') {
    auth.logout()
    return
  }

  // Handle company switching
  if (command.startsWith('switch-')) {
    const companyId = command.replace('switch-', '')
    const result = await auth.switchCompany(companyId)
    
    if (result.success) {
      ElMessage.success('Company switched successfully')
      // Refresh the page to load new company context
      window.location.reload()
    } else {
      ElMessage.error(result.error || 'Failed to switch company')
    }
  }
}
</script>

<style scoped lang="scss">
.user-menu {
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: center;
  gap: var(--app-space-s);
  &.expanded {
    justify-content: flex-start;
    align-items: flex-start;
  }
}

.user-menu-trigger {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
  border-radius: var(--app-border-radius-s);
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;

  &:hover {
    background: var(--app-fill-color-light);
  }

  &.expanded {
    padding: var(--app-space-s) var(--app-space-s);
  }
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--app-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--app-primary-color);
    color: white;
    font-weight: 600;
    font-size: var(--app-font-size-s);
  }
}

.user-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-size: var(--app-font-size-m);
  font-weight: 500;
  color: var(--app-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-email {
  font-size: var(--app-font-size-s);
  color: var(--app-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron-icon {
  color: var(--app-text-color-secondary);
  transition: transform 0.2s;
  flex-shrink: 0;

  &.expanded {
    transform: rotate(180deg);
  }
}

// Dropdown menu styles
:deep(.user-dropdown-menu) {
  min-width: 240px;
  padding: 0;
}

.dropdown-header {
  padding: var(--app-space-m);
  border-bottom: 1px solid var(--app-border-color-light);
  display: flex;
  align-items: center;
  gap: var(--app-space-m);
  background: var(--app-bg-color-page);
}

.header-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--app-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--app-primary-color);
    color: white;
    font-weight: 600;
    font-size: var(--app-font-size-m);
  }
}

.header-info {
  flex: 1;
  min-width: 0;
}

.header-name {
  font-size: var(--app-font-size-m);
  font-weight: 600;
  color: var(--app-text-color-primary);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-email {
  font-size: var(--app-font-size-s);
  color: var(--app-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.company-section {
  padding: var(--app-space-xs) 0;
  border-top: 1px solid var(--app-border-color-light);
  border-bottom: 1px solid var(--app-border-color-light);
  margin: var(--app-space-xs) 0;
}

.section-label {
  padding: var(--app-space-xs) var(--app-space-m);
  font-size: var(--app-font-size-xs);
  font-weight: 600;
  color: var(--app-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.company-item {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
  width: 100%;
  min-width: 200px;
}

.company-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  strong {
    color: var(--app-text-color-primary);
    font-size: var(--app-font-size-m);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    color: var(--app-text-color-secondary);
    font-size: var(--app-font-size-s);
    text-transform: capitalize;
  }
}

.check-icon {
  color: var(--app-success-color);
  flex-shrink: 0;
}

// Dropdown item icons
:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);

  .iconify {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
}
</style>
