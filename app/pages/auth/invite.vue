<template>
  <div class="invite-page">
    <el-card v-if="loading" class="invite-card">
      <div class="invite-state">
        <Icon name="lucide:loader-2" size="48" class="spinning" />
        <h2>Loading invitation...</h2>
      </div>
    </el-card>

    <el-card v-else-if="error" class="invite-card">
      <div class="invite-state error">
        <Icon name="lucide:x-circle" size="48" />
        <h2>Invalid Invitation</h2>
        <p>{{ error }}</p>
        <el-button type="primary" @click="navigateTo('/auth/login')">
          Go to Login
        </el-button>
      </div>
    </el-card>

    <el-card v-else-if="invite" class="invite-card">
      <template #header>
        <div class="invite-header">
          <Icon name="lucide:mail" size="32" />
          <h2>You're Invited!</h2>
          <p>Join <strong>{{ invite.companyName }}</strong> as {{ invite.role }}</p>
        </div>
      </template>

      <!-- Existing user - just accept -->
      <div v-if="auth.isAuthenticated.value" class="existing-user">
        <div class="user-info">
          <Icon name="lucide:user-check" size="24" />
          <div>
            <strong>{{ auth.user.value?.name || auth.user.value?.email }}</strong>
            <span>{{ auth.user.value?.email }}</span>
          </div>
        </div>

        <p class="invite-message">
          You will join <strong>{{ invite.companyName }}</strong> with your existing account.
        </p>

        <div class="invite-actions">
          <el-button
            type="primary"
            size="large"
            :loading="accepting"
            @click="handleAcceptInvite"
          >
            Accept Invitation
          </el-button>
          <el-button size="large" @click="navigateTo('/auth/login')">
            Decline
          </el-button>
        </div>
      </div>

      <!-- New user - create account -->
      <div v-else class="new-user">
        <p class="invite-message">
          Create your account to join <strong>{{ invite.companyName }}</strong>
        </p>

        <AuthInviteSetupForm
          :email="invite.email"
          :invite-code="inviteCode"
          @success="handleSetupSuccess"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'fullpage',
})

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const inviteCode = computed(() => route.query.code as string)
const loading = ref(true)
const accepting = ref(false)
const error = ref<string | null>(null)

interface InviteInfo {
  email: string
  companyName: string
  role: string
}

const invite = ref<InviteInfo | null>(null)

onMounted(async () => {
  if (!inviteCode.value) {
    error.value = 'No invitation code provided'
    loading.value = false
    return
  }

  // Check if user is already logged in (skip redirect on 401 since user might not be logged in)
  await auth.fetchUser({ skip401Redirect: true })

  // Fetch invite details (we need a new API endpoint for this)
  const {$api} = useNuxtApp()
  try {
    const response = await $api<{ data: InviteInfo }>(
      `/api/companies/invites/${inviteCode.value}`
    )
    console.log('response', response)
    const data = response.data
    invite.value = data
  } catch (e: any) {
    error.value = e.data?.message || 'Invalid or expired invitation'
  } finally {
    loading.value = false
  }
})

const handleAcceptInvite = async () => {
  accepting.value = true

  try {
    const result = await auth.acceptInvite(inviteCode.value)

    if (result.success) {
      ElMessage.success('Invitation accepted!')
      await router.push('/apps')
    } else {
      ElMessage.error(result.error || 'Failed to accept invitation')
    }
  } catch (e: any) {
    ElMessage.error(e.message || 'An error occurred')
  } finally {
    accepting.value = false
  }
}

const handleSetupSuccess = async () => {
  ElMessage.success('Account created! Redirecting...')
  
  setTimeout(() => {
    router.push('/apps')
  }, 1500)
}
</script>

<style scoped lang="scss">
.invite-page {
  width: 100%;
}

.invite-card {
  :deep(.el-card__body) {
    padding: var(--app-space-xl);
  }
}

.invite-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--app-space-s);
  text-align: center;
  
  h2 {
    margin: 0;
    font-size: var(--app-font-size-xl);
    font-weight: var(--app-font-weight-title);
    color: var(--app-text-color-primary);
  }
  
  p {
    margin: 0;
    color: var(--app-text-color-secondary);
    font-size: var(--app-font-size-m);
    
    strong {
      color: var(--app-primary-color);
    }
  }
}

.invite-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--app-space-m);
  text-align: center;
  padding: var(--app-space-xl);
  
  h2 {
    margin: 0;
    font-size: var(--app-font-size-xl);
    font-weight: var(--app-font-weight-title);
    color: var(--app-text-color-primary);
  }
  
  p {
    margin: 0;
    color: var(--app-text-color-secondary);
    font-size: var(--app-font-size-m);
  }
  
  &.error {
    color: var(--app-danger-color);
  }
}

.existing-user {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-l);
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--app-space-m);
  padding: var(--app-space-m);
  background: var(--app-fill-color-light);
  border-radius: var(--app-border-radius-m);
  
  > div {
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
    }
  }
}

.new-user {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-l);
}

.invite-message {
  text-align: center;
  color: var(--app-text-color-regular);
  font-size: var(--app-font-size-m);
  margin: 0;
  
  strong {
    color: var(--app-primary-color);
  }
}

.invite-actions {
  display: flex;
  gap: var(--app-space-m);
  
  > * {
    flex: 1;
  }
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>

