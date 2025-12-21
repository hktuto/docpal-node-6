<template>
  <el-dropdown trigger="click" @command="handleCommand">
    <el-button>
      <Icon name="lucide:building-2" />
      <span>{{ currentCompanyName }}</span>
      <Icon name="lucide:chevron-down" />
    </el-button>
    
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item v-if="!companies.length" disabled>
          No companies
        </el-dropdown-item>
        
        <el-dropdown-item
          v-for="company in companies"
          :key="company.id"
          :command="company.id"
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
        
        <el-dropdown-item divided command="create">
          <Icon name="lucide:plus" />
          Create Company
        </el-dropdown-item>
        
        <el-dropdown-item command="settings">
          <Icon name="lucide:settings" />
          Company Settings
        </el-dropdown-item>
        
        <el-dropdown-item divided command="logout">
          <Icon name="lucide:log-out" />
          Logout
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
const auth = useAuth()
const router = useRouter()

interface Company {
  id: string
  name: string
  slug: string
  role: string
}

const companies = ref<Company[]>([])
const loading = ref(false)

const currentCompanyName = computed(() => {
  return auth.company.value?.name || 'Select Company'
})

onMounted(async () => {
  await fetchCompanies()
})

const fetchCompanies = async () => {
  try {
    loading.value = true
    const data = await $apiResponse<{ companies: Company[] }>('/api/companies')
    companies.value = data.companies
  } catch (e) {
    console.error('Failed to fetch companies:', e)
  } finally {
    loading.value = false
  }
}

const handleCommand = async (command: string) => {
  if (command === 'create') {
    // Navigate to create company page
    await router.push('/companies/create')
    return
  }

  if (command === 'settings') {
    // Navigate to company settings
    await router.push('/companies/settings')
    return
  }

  if (command === 'logout') {
    await auth.logout()
    return
  }

  // Switch company
  const result = await auth.switchCompany(command)
  
  if (result.success) {
    ElMessage.success('Company switched')
    
    // Refresh the page to load new company context
    window.location.reload()
  } else {
    ElMessage.error(result.error || 'Failed to switch company')
  }
}
</script>

<style scoped lang="scss">
.company-item {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
  min-width: 200px;
}

.company-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--app-space-xxs);
  
  strong {
    color: var(--app-text-color-primary);
    font-size: var(--app-font-size-m);
  }
  
  span {
    color: var(--app-text-color-secondary);
    font-size: var(--app-font-size-s);
    text-transform: capitalize;
  }
}

.check-icon {
  color: var(--app-success-color);
}
</style>

