<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const companyId = computed(() => auth.company.value?.id)


// Fetch company data
const { data: companyData, pending, refresh: refreshCompany } = await useApi(
    `/api/companies/${companyId.value}`,
  {
    key: `company-${companyId.value}`,
    watch: [companyId],
  }
)

// Fetch members
const { data: membersData, refresh: refreshMembers } = await useApi(
`/api/companies/${companyId.value}/members`,
  { 
    key: `company-members-${companyId.value}`,
    watch: [companyId],
  }
)

// Fetch invites
const { data: invitesData, refresh: refreshInvites } = await useApi(
`/api/companies/${companyId.value}/invites`,
  {
    key: `company-invites-${companyId.value}`,
    watch: [companyId],
  }
)

const company = computed(() => (companyData.value as any)?.data?.company)
const userRole = computed(() => (companyData.value as any)?.data?.role)
const members = computed(() => (membersData.value as any)?.data?.members || [])
const invites = computed(() => (invitesData.value as any)?.data?.invites || [])

// Audit logs state
const auditLogs = ref<any[]>([])
const auditLogsLoading = ref(false)
const auditLogsPagination = ref({
  total: 0,
  limit: 50,
  offset: 0,
})
const auditLogsFilters = ref({
  entityType: '',
  action: '',
})

// Check if user can manage company (owner or admin)
const canManage = computed(() => ['owner', 'admin'].includes(userRole.value || ''))

// Active tab
const activeTab = ref('settings')

// Form state
const form = ref({
  name: '',
  description: '',
  logo: '',
})

const formRef = ref()
const isSaving = ref(false)

// Watch company data and populate form
watch(company, (newCompany) => {
  if (newCompany) {
    form.value = {
      name: newCompany.name || '',
      description: newCompany.description || '',
      logo: newCompany.logo || '',
    }
  }
}, { immediate: true })

// Save company settings
const saveSettings = async () => {
  if (!formRef.value || !companyId.value) return

  try {
    await formRef.value.validate()
    isSaving.value = true

    const { $api } = useNuxtApp()
    await $api(`/api/companies/${companyId.value}`, {
      method: 'PUT',
      body: {
        name: form.value.name,
        description: form.value.description,
        logo: form.value.logo || null,
      },
    })

    ElMessage.success('Company settings updated successfully')
    await refreshCompany()
    await auth.fetchUser() // Refresh user context to get updated company name
  } catch (error: any) {
    ElMessage.error(error.data?.message || 'Failed to update company settings')
  } finally {
    isSaving.value = false
  }
}

// Invite dialog
const showInviteDialog = ref(false)

const handleInviteSuccess = async () => {
  await refreshInvites()
  await refreshMembers()
}

// Format date helper
const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Get role badge color
const getRoleColor = (role: string) => {
  switch (role) {
    case 'owner':
      return 'danger'
    case 'admin':
      return 'warning'
    default:
      return 'info'
  }
}

// Fetch audit logs
const fetchAuditLogs = async () => {
  if (!companyId.value || !canManage.value) return
  
  auditLogsLoading.value = true
  try {
    const { $api } = useNuxtApp()
    const params = new URLSearchParams({
      limit: auditLogsPagination.value.limit.toString(),
      offset: auditLogsPagination.value.offset.toString(),
    })
    
    if (auditLogsFilters.value.entityType) {
      params.append('entityType', auditLogsFilters.value.entityType)
    }
    if (auditLogsFilters.value.action) {
      params.append('action', auditLogsFilters.value.action)
    }
    
    const response = await $api(`/api/audit-logs?${params.toString()}`)
    auditLogs.value = response.data.logs || []
    auditLogsPagination.value.total = response.meta?.pagination?.total || 0
  } catch (error) {
    console.error('Failed to fetch audit logs:', error)
    ElMessage.error('Failed to load audit logs')
  } finally {
    auditLogsLoading.value = false
  }
}

// Watch for tab changes to load audit logs
watch(activeTab, (newTab) => {
  if (newTab === 'audit' && canManage.value) {
    fetchAuditLogs()
  }
})

// Watch for filter changes
watch([auditLogsFilters, companyId], () => {
  if (activeTab.value === 'audit' && canManage.value) {
    auditLogsPagination.value.offset = 0
    fetchAuditLogs()
  }
})

// Handle pagination
const handleAuditLogsPageChange = (page: number) => {
  auditLogsPagination.value.offset = (page - 1) * auditLogsPagination.value.limit
  fetchAuditLogs()
}

const currentAuditPage = computed({
  get: () => Math.floor(auditLogsPagination.value.offset / auditLogsPagination.value.limit) + 1,
  set: (page: number) => {
    auditLogsPagination.value.offset = (page - 1) * auditLogsPagination.value.limit
    fetchAuditLogs()
  }
})

// Format date for audit logs
const formatAuditDate = (date: Date | string) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// Get action badge color
const getActionColor = (action: string) => {
  switch (action) {
    case 'create':
      return 'success'
    case 'update':
      return 'primary'
    case 'delete':
      return 'danger'
    case 'login':
      return 'info'
    case 'logout':
      return 'warning'
    default:
      return ''
  }
}

// Copy invite link to clipboard
const copyInviteLink = async (inviteCode: string) => {
  const baseUrl = window.location.origin
  const inviteLink = `${baseUrl}/auth/invite?code=${inviteCode}`
  
  try {
    await navigator.clipboard.writeText(inviteLink)
    ElMessage.success('Invite link copied to clipboard!')
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = inviteLink
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      ElMessage.success('Invite link copied to clipboard!')
    } catch (err) {
      ElMessage.error('Failed to copy invite link')
    }
    document.body.removeChild(textArea)
  }
}

// Resend invite email
const resendingInviteId = ref<string | null>(null)
const resendInvite = async (inviteId: string) => {
  if (!companyId.value) return

  resendingInviteId.value = inviteId

  try {
    const { $api } = useNuxtApp()
    await $api(`/api/companies/${companyId.value}/invites/${inviteId}/resend`, {
      method: 'POST',
    })

    ElMessage.success('Invite email sent successfully!')
  } catch (error: any) {
    ElMessage.error(error.data?.message || 'Failed to resend invite email')
  } finally {
    resendingInviteId.value = null
  }
}
</script>

<template>
  <div class="company-settings-page">
    <div v-if="pending" class="company-settings-page__loading">
      <el-skeleton :rows="5" animated />
    </div>
    
    <div v-else-if="!company" class="company-settings-page__error">
      <el-result
        status="error"
        title="Company Not Found"
        sub-title="The company you're looking for doesn't exist or you don't have access to it."
      >
        <template #extra>
          <el-button type="primary" @click="router.push('/apps')">
            Go to Apps
          </el-button>
        </template>
      </el-result>
    </div>

    <div v-else class="company-settings-page__content">
      <!-- Header -->
      <div class="company-settings-page__header">
        <div class="header-left">
          <h1 class="company-settings-page__title">Company Settings</h1>
          <p class="company-settings-page__subtitle">
            Manage your company information and team members
          </p>
        </div>
      </div>

      <!-- Tabs -->
      <el-tabs v-model="activeTab" class="settings-tabs">
        <!-- Settings Tab -->
        <el-tab-pane label="Settings" name="settings">
          <el-card>
            <template #header>
              <div class="card-header-with-actions">
                <div class="card-header">
                  <Icon name="lucide:info" size="20" />
                  <span>Company Information</span>
                </div>
                <el-button
                  v-if="canManage"
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
              v-if="canManage"
              ref="formRef"
              :model="form"
              label-position="top"
            >
              <el-form-item
                label="Company Name"
                prop="name"
                :rules="[
                  { required: true, message: 'Please enter company name', trigger: 'blur' },
                  { min: 1, max: 100, message: 'Length should be 1 to 100', trigger: 'blur' }
                ]"
              >
                <el-input
                  v-model="form.name"
                  placeholder="Enter company name"
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
                  placeholder="Enter company description (optional)"
                  maxlength="500"
                  show-word-limit
                />
              </el-form-item>

              <el-form-item
                label="Logo URL"
                prop="logo"
              >
                <el-input
                  v-model="form.logo"
                  placeholder="https://example.com/logo.png"
                  clearable
                />
              </el-form-item>
            </el-form>

            <div v-else class="read-only-info">
              <p>You don't have permission to edit company settings.</p>
            </div>
          </el-card>
        </el-tab-pane>

        <!-- Members Tab -->
        <el-tab-pane label="Members" name="members">
          <el-card>
            <template #header>
              <div class="card-header-with-actions">
                <div class="card-header">
                  <Icon name="lucide:users" size="20" />
                  <span>Team Members ({{ members.length }})</span>
                </div>
                <el-button
                  v-if="canManage"
                  type="primary"
                  @click="showInviteDialog = true"
                >
                  <Icon name="lucide:user-plus" class="button-icon" />
                  Invite Member
                </el-button>
              </div>
            </template>

            <div v-if="members.length === 0" class="empty-state">
              <Icon name="lucide:users" size="48" />
              <p>No members yet</p>
              <el-button
                v-if="canManage"
                type="primary"
                @click="showInviteDialog = true"
              >
                Invite First Member
              </el-button>
            </div>

            <div v-else class="members-list">
              <div
                v-for="member in members"
                :key="member.id"
                class="member-item"
              >
                <div class="member-avatar">
                  <img
                    v-if="member.user.avatar"
                    :src="member.user.avatar"
                    :alt="member.user.name || member.user.email"
                  />
                  <div v-else class="avatar-placeholder">
                    {{ (member.user.name || member.user.email).charAt(0).toUpperCase() }}
                  </div>
                </div>
                <div class="member-info">
                  <div class="member-name">
                    {{ member.user.name || 'No name' }}
                  </div>
                  <div class="member-email">{{ member.user.email }}</div>
                  <div class="member-meta">
                    Joined {{ formatDate(member.joinedAt) }}
                  </div>
                </div>
                <div class="member-role">
                  <el-tag :type="getRoleColor(member.role)" effect="plain">
                    {{ member.role }}
                  </el-tag>
                </div>
              </div>
            </div>
          </el-card>
        </el-tab-pane>

        <!-- Invites Tab -->
        <el-tab-pane v-if="canManage" label="Pending Invites" name="invites">
          <el-card>
            <template #header>
              <div class="card-header">
                <Icon name="lucide:mail" size="20" />
                <span>Pending Invitations ({{ invites.length }})</span>
              </div>
            </template>

            <div v-if="invites.length === 0" class="empty-state">
              <Icon name="lucide:mail" size="48" />
              <p>No pending invitations</p>
            </div>

            <div v-else class="invites-list">
              <div
                v-for="invite in invites"
                :key="invite.id"
                class="invite-item"
              >
                <div class="invite-info">
                  <div class="invite-email">{{ invite.email }}</div>
                  <div class="invite-meta">
                    Invited by {{ invite.invitedBy.name || invite.invitedBy.email }}
                    on {{ formatDate(invite.createdAt) }}
                  </div>
                  <div class="invite-expiry">
                    Expires {{ formatDate(invite.expiresAt) }}
                  </div>
                </div>
                <div class="invite-actions">
                  <div class="invite-role">
                    <el-tag :type="getRoleColor(invite.role)" effect="plain">
                      {{ invite.role }}
                    </el-tag>
                  </div>
                  <div class="invite-buttons">
                    <el-button
                      size="small"
                      @click="copyInviteLink(invite.inviteCode)"
                    >
                      <Icon name="lucide:copy" class="button-icon" />
                      Copy Link
                    </el-button>
                    <el-button
                      size="small"
                      type="primary"
                      :loading="resendingInviteId === invite.id"
                      @click="resendInvite(invite.id)"
                    >
                      <Icon name="lucide:send" class="button-icon" />
                      Resend
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </el-tab-pane>

        <!-- Audit Logs Tab (Owner/Admin Only) -->
        <el-tab-pane v-if="canManage" label="Audit Logs" name="audit">
          <el-card>
            <template #header>
              <div class="card-header">
                <Icon name="lucide:file-text" size="20" />
                <span>Audit Logs</span>
              </div>
            </template>

            <!-- Filters -->
            <div class="audit-filters">
              <el-form :inline="true" size="default">
                <el-form-item label="Entity Type">
                  <el-select
                    v-model="auditLogsFilters.entityType"
                    placeholder="All Types"
                    clearable
                    style="width: 150px"
                  >
                    <el-option label="User" value="user" />
                    <el-option label="Company" value="company" />
                    <el-option label="App" value="app" />
                    <el-option label="Table" value="table" />
                    <el-option label="Row" value="row" />
                  </el-select>
                </el-form-item>
                <el-form-item label="Action">
                  <el-select
                    v-model="auditLogsFilters.action"
                    placeholder="All Actions"
                    clearable
                    style="width: 150px"
                  >
                    <el-option label="Create" value="create" />
                    <el-option label="Update" value="update" />
                    <el-option label="Delete" value="delete" />
                    <el-option label="Login" value="login" />
                    <el-option label="Logout" value="logout" />
                  </el-select>
                </el-form-item>
              </el-form>
            </div>

            <!-- Audit Logs Table -->
            <div v-loading="auditLogsLoading" class="audit-logs-table">
              <el-empty v-if="!auditLogsLoading && auditLogs.length === 0" description="No audit logs found" />
              
              <div v-else class="audit-logs-list">
                <div
                  v-for="log in auditLogs"
                  :key="log.id"
                  class="audit-log-item"
                >
                  <div class="audit-log-header">
                    <div class="audit-log-main">
                      <el-tag :type="getActionColor(log.action)" size="small" effect="plain">
                        {{ log.action }}
                      </el-tag>
                      <span class="audit-entity-type">{{ log.entityType }}</span>
                      <span v-if="log.entityId" class="audit-entity-id">
                        {{ log.entityId }}
                      </span>
                    </div>
                    <div class="audit-log-meta">
                      <span class="audit-date">{{ formatAuditDate(log.createdAt) }}</span>
                    </div>
                  </div>
                  
                  <div class="audit-log-details">
                    <div v-if="log.user" class="audit-user">
                      <Icon name="lucide:user" size="14" />
                      <span>{{ log.user.name || log.user.email }}</span>
                    </div>
                    <div v-if="log.ipAddress" class="audit-ip">
                      <Icon name="lucide:map-pin" size="14" />
                      <span>{{ log.ipAddress }}</span>
                    </div>
                  </div>
                  
                  <div v-if="log.changes" class="audit-changes">
                    <details>
                      <summary style="cursor: pointer; color: var(--app-text-color-secondary);">
                        View Changes
                      </summary>
                      <pre class="changes-json">{{ JSON.stringify(log.changes, null, 2) }}</pre>
                    </details>
                  </div>
                </div>
              </div>

              <!-- Pagination -->
              <el-pagination
                v-if="auditLogsPagination.total > 0"
                v-model:current-page="currentAuditPage"
                :page-size="auditLogsPagination.limit"
                :total="auditLogsPagination.total"
                layout="total, prev, pager, next"
                class="audit-pagination"
              />
            </div>
          </el-card>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- Invite Dialog -->
    <CompaniesInviteMemberDialog
      v-if="companyId"
      v-model="showInviteDialog"
      :company-id="companyId"
      @success="handleInviteSuccess"
    />
  </div>
</template>

<style lang="scss" scoped>
.company-settings-page {
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
}

.read-only-info {
  padding: var(--app-space-m);
  text-align: center;
  color: var(--app-text-color-secondary);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--app-space-m);
  padding: var(--app-space-xl);
  text-align: center;
  color: var(--app-text-color-secondary);

  p {
    margin: 0;
    font-size: var(--app-font-size-m);
  }
}

.members-list,
.invites-list {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-m);
}

.member-item,
.invite-item {
  display: flex;
  align-items: center;
  gap: var(--app-space-m);
  padding: var(--app-space-m);
  background: var(--app-fill-color-light);
  border-radius: var(--app-border-radius-m);
  transition: all 0.2s;

  &:hover {
    background: var(--app-fill-color);
  }
}

.member-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--app-fill-color);

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
    font-size: var(--app-font-size-l);
  }
}

.member-info,
.invite-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--app-space-xxs);
}

.member-name,
.invite-email {
  font-size: var(--app-font-size-m);
  font-weight: 500;
  color: var(--app-text-color-primary);
}

.member-email {
  font-size: var(--app-font-size-s);
  color: var(--app-text-color-secondary);
}

.member-meta,
.invite-meta,
.invite-expiry {
  font-size: var(--app-font-size-s);
  color: var(--app-text-color-placeholder);
}

.member-role {
  flex-shrink: 0;
}

.invite-actions {
  display: flex;
  align-items: center;
  gap: var(--app-space-m);
  flex-shrink: 0;
}

.invite-role {
  flex-shrink: 0;
}

.invite-buttons {
  display: flex;
  align-items: center;
  gap: var(--app-space-xs);
}

.settings-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: var(--app-space-l);
  }
}

// Audit Logs Styles
.audit-filters {
  margin-bottom: var(--app-space-l);
  padding-bottom: var(--app-space-m);
  border-bottom: 1px solid var(--app-border-color-light);
}

.audit-logs-table {
  min-height: 200px;
}

.audit-logs-list {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-m);
}

.audit-log-item {
  padding: var(--app-space-m);
  background: var(--app-fill-color-light);
  border-radius: var(--app-border-radius-m);
  border: 1px solid var(--app-border-color-light);
}

.audit-log-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--app-space-s);
  gap: var(--app-space-m);
}

.audit-log-main {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
  flex-wrap: wrap;
}

.audit-entity-type {
  font-weight: 500;
  color: var(--app-text-color-primary);
  text-transform: capitalize;
}

.audit-entity-id {
  font-size: var(--app-font-size-s);
  color: var(--app-text-color-secondary);
  font-family: monospace;
}

.audit-log-meta {
  display: flex;
  align-items: center;
  gap: var(--app-space-m);
}

.audit-date {
  font-size: var(--app-font-size-s);
  color: var(--app-text-color-secondary);
}

.audit-log-details {
  display: flex;
  gap: var(--app-space-m);
  margin-top: var(--app-space-xs);
  font-size: var(--app-font-size-s);
  color: var(--app-text-color-secondary);
}

.audit-user,
.audit-ip {
  display: flex;
  align-items: center;
  gap: var(--app-space-xs);
}

.audit-changes {
  margin-top: var(--app-space-s);
  padding-top: var(--app-space-s);
  border-top: 1px solid var(--app-border-color-light);
}

.changes-json {
  margin: var(--app-space-s) 0 0 0;
  padding: var(--app-space-m);
  background: var(--app-bg-color);
  border-radius: var(--app-border-radius-s);
  font-size: var(--app-font-size-xs);
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
}

.audit-pagination {
  margin-top: var(--app-space-l);
  justify-content: center;
}

// Responsive
@media (max-width: 768px) {
  .company-settings-page {
    padding: var(--app-space-m);

    &__header {
      flex-direction: column;
      align-items: stretch;
    }
  }

  .card-header-with-actions {
    flex-direction: column;
    align-items: stretch;
    gap: var(--app-space-m);

    .el-button {
      width: 100%;
    }
  }

  .member-item,
  .invite-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

