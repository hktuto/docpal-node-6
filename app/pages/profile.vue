<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

useHead({
  title: 'Profile Settings - DocPal'
})

const auth = useAuth()
const router = useRouter()

// Redirect if not authenticated
watch(() => auth.isAuthenticated.value, (isAuth) => {
  if (!isAuth) {
    router.push('/auth/login')
  }
}, { immediate: true })

// Get user data from Electric sync (real-time, offline-capable)
const { currentUser, isLoading: loadingUser } = useUsers()

// Alias for template compatibility
const user = currentUser
const pending = loadingUser

// Active tab
const activeTab = ref('profile')

// Profile form state
const profileForm = ref({
  name: '',
  avatar: '',
})

const profileFormRef = ref()
const isSavingProfile = ref(false)

// Password form state
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const passwordFormRef = ref()
const isChangingPassword = ref(false)

// Watch user data and populate profile form
watch(user, (newUser) => {
  if (newUser) {
    profileForm.value = {
      name: newUser.name || '',
      avatar: newUser.avatar || '',
    }
  }
}, { immediate: true })

// Save profile
const saveProfile = async () => {
  if (!profileFormRef.value) return

  try {
    await profileFormRef.value.validate()
    isSavingProfile.value = true

    const { $api } = useNuxtApp()
    const response = await $api<any>('/api/auth/profile', {
      method: 'PUT',
      body: {
        name: profileForm.value.name || null,
        avatar: profileForm.value.avatar || null,
      },
    })

    // Update auth state
    if (response.data?.user) {
      auth.user.value = {
        ...response.data.user,
        emailVerifiedAt: response.data.user.emailVerifiedAt ? new Date(response.data.user.emailVerifiedAt) : null,
      }
    }

    ElMessage.success('Profile updated successfully')
    // No need to refresh! Electric will auto-sync the changes from PostgreSQL
  } catch (error: any) {
    ElMessage.error(error.data?.message || 'Failed to update profile')
  } finally {
    isSavingProfile.value = false
  }
}

// Validate password confirmation
const validatePasswordConfirm = (rule: any, value: any, callback: any) => {
  if (value !== passwordForm.value.newPassword) {
    callback(new Error('Passwords do not match'))
  } else {
    callback()
  }
}

// Change password
const changePassword = async () => {
  if (!passwordFormRef.value) return

  try {
    await passwordFormRef.value.validate()
    isChangingPassword.value = true

    const { $api } = useNuxtApp()
    await $api('/api/auth/password', {
      method: 'PUT',
      body: {
        currentPassword: passwordForm.value.currentPassword,
        newPassword: passwordForm.value.newPassword,
      },
    })

    ElMessage.success('Password changed successfully')
    
    // Reset form
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }
    passwordFormRef.value?.resetFields()
  } catch (error: any) {
    ElMessage.error(error.data?.message || 'Failed to change password')
  } finally {
    isChangingPassword.value = false
  }
}

// Format date helper
const formatDate = (date: Date | string | null) => {
  if (!date) return 'Never'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
</script>

<template>
  <div class="profile-page">
    <div v-if="pending" class="profile-page__loading">
      <el-skeleton :rows="5" animated />
    </div>

    <div v-else-if="!user" class="profile-page__error">
      <el-result
        status="info"
        title="Loading Profile"
        sub-title="Syncing your profile information..."
      />
    </div>

    <div v-else class="profile-page__content">
      <!-- Header -->
      <div class="profile-page__header">
        <div class="header-left">
          <h1 class="profile-page__title">Profile Settings</h1>
          <p class="profile-page__subtitle">
            Manage your account information and preferences
          </p>
        </div>
      </div>

      <!-- Tabs -->
      <el-tabs v-model="activeTab" class="profile-tabs">
        <!-- Profile Tab -->
        <el-tab-pane label="Profile" name="profile">
          <el-card>
            <template #header>
              <div class="card-header-with-actions">
                <div class="card-header">
                  <Icon name="lucide:user" size="20" />
                  <span>Personal Information</span>
                </div>
                <el-button
                  type="primary"
                  size="default"
                  :loading="isSavingProfile"
                  @click="saveProfile"
                >
                  <Icon name="lucide:save" class="button-icon" />
                  Save
                </el-button>
              </div>
            </template>

            <el-form
              ref="profileFormRef"
              :model="profileForm"
              label-position="top"
            >
              <el-form-item
                label="Email"
                prop="email"
              >
                <el-input
                  :value="user.email"
                  disabled
                >
                  <template #prefix>
                    <Icon name="lucide:mail" />
                  </template>
                </el-input>
                <template #label>
                  Email
                  <el-text type="info" size="small" style="margin-left: 4px">
                    (cannot be changed)
                  </el-text>
                </template>
              </el-form-item>

              <el-form-item
                label="Name"
                prop="name"
                :rules="[
                  { max: 100, message: 'Name must be less than 100 characters', trigger: 'blur' }
                ]"
              >
                <el-input
                  v-model="profileForm.name"
                  placeholder="Your full name"
                  clearable
                >
                  <template #prefix>
                    <Icon name="lucide:user" />
                  </template>
                </el-input>
              </el-form-item>

              <el-form-item
                label="Avatar URL"
                prop="avatar"
                :rules="[
                  { type: 'url', message: 'Please enter a valid URL', trigger: 'blur' }
                ]"
              >
                <el-input
                  v-model="profileForm.avatar"
                  placeholder="https://example.com/avatar.jpg"
                  clearable
                >
                  <template #prefix>
                    <Icon name="lucide:image" />
                  </template>
                </el-input>
                <template #label>
                  Avatar URL
                  <el-text type="info" size="small" style="margin-left: 4px">
                    (optional)
                  </el-text>
                </template>
              </el-form-item>

              <el-form-item label="Account Information">
                <div class="account-info">
                  <div class="info-item">
                    <span class="info-label">Email Verified:</span>
                    <el-tag :type="user.emailVerifiedAt ? 'success' : 'warning'" effect="plain">
                      {{ user.emailVerifiedAt ? 'Verified' : 'Not Verified' }}
                    </el-tag>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Member Since:</span>
                    <span class="info-value">{{ formatDate((user as any).createdAt) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Last Login:</span>
                    <span class="info-value">{{ formatDate((user as any).lastLoginAt) }}</span>
                  </div>
                </div>
              </el-form-item>
            </el-form>
          </el-card>
        </el-tab-pane>

        <!-- Password Tab -->
        <el-tab-pane label="Password" name="password">
          <el-card>
            <template #header>
              <div class="card-header">
                <Icon name="lucide:lock" size="20" />
                <span>Change Password</span>
              </div>
            </template>

            <el-form
              ref="passwordFormRef"
              :model="passwordForm"
              label-position="top"
            >
              <el-form-item
                label="Current Password"
                prop="currentPassword"
                :rules="[
                  { required: true, message: 'Current password is required', trigger: 'blur' }
                ]"
              >
                <el-input
                  v-model="passwordForm.currentPassword"
                  type="password"
                  placeholder="Enter your current password"
                  show-password
                >
                  <template #prefix>
                    <Icon name="lucide:lock" />
                  </template>
                </el-input>
              </el-form-item>

              <el-form-item
                label="New Password"
                prop="newPassword"
                :rules="[
                  { required: true, message: 'New password is required', trigger: 'blur' },
                  { min: 8, message: 'Password must be at least 8 characters', trigger: 'blur' }
                ]"
              >
                <el-input
                  v-model="passwordForm.newPassword"
                  type="password"
                  placeholder="At least 8 characters"
                  show-password
                >
                  <template #prefix>
                    <Icon name="lucide:lock" />
                  </template>
                </el-input>
              </el-form-item>

              <el-form-item
                label="Confirm New Password"
                prop="confirmPassword"
                :rules="[
                  { required: true, message: 'Please confirm your new password', trigger: 'blur' },
                  { validator: validatePasswordConfirm, trigger: 'blur' }
                ]"
              >
                <el-input
                  v-model="passwordForm.confirmPassword"
                  type="password"
                  placeholder="Confirm your new password"
                  show-password
                >
                  <template #prefix>
                    <Icon name="lucide:lock" />
                  </template>
                </el-input>
              </el-form-item>

              <el-form-item>
                <el-button
                  type="primary"
                  :loading="isChangingPassword"
                  @click="changePassword"
                >
                  <Icon name="lucide:save" class="button-icon" />
                  Change Password
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.profile-page {
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

.account-info {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-m);
  padding: var(--app-space-m);
  background: var(--app-fill-color-light);
  border-radius: var(--app-border-radius-m);
}

.info-item {
  display: flex;
  align-items: center;
  gap: var(--app-space-m);
  
  .info-label {
    font-weight: 500;
    color: var(--app-text-color-secondary);
    min-width: 120px;
  }
  
  .info-value {
    color: var(--app-text-color-primary);
  }
}

.profile-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: var(--app-space-l);
  }
}

// Responsive
@media (max-width: 768px) {
  .profile-page {
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

  .account-info {
    .info-item {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--app-space-xs);
    }
  }
}
</style>

