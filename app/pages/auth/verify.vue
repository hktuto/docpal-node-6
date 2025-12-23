<template>
  <div class="verify-page">
    <el-card>
      <div class="verify-content">
        <div v-if="verifying" class="verify-state">
          <Icon name="lucide:loader-2" size="48" class="spinning" />
          <h2>Verifying your magic link...</h2>
          <p>Please wait while we sign you in.</p>
        </div>

        <div v-else-if="success" class="verify-state success">
          <Icon name="lucide:check-circle" size="48" />
          <h2>Success!</h2>
          <p>You're now signed in. Redirecting...</p>
        </div>

        <div v-else class="verify-state error">
          <Icon name="lucide:x-circle" size="48" />
          <h2>Verification Failed</h2>
          <p>{{ error || 'This magic link is invalid or has expired.' }}</p>
          <el-button type="primary" @click="navigateTo('/auth/login')">
            Back to Login
          </el-button>
        </div>
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

const verifying = ref(true)
const success = ref(false)
const error = ref<string | null>(null)

onMounted(async () => {
  const token = route.query.token as string
  console.log('token', token, route)
  if (!token) {
    verifying.value = false
    error.value = 'No verification token provided'
    return
  }

  try {
    const result = await auth.verifyMagicLink(token)
    console.log('result', result)
    if (result.success) {
      success.value = true
      ElMessage.success('Successfully signed in!')

      // Redirect after a short delay
      setTimeout(() => {
        if (auth.hasCompany.value) {
          router.push('/workspaces')
        } else {
          router.push('/companies')
        }
      }, 1500)
    } else {
      error.value = result.error || 'Verification failed'
    }
  } catch (e: any) {
    error.value = e.message || 'An error occurred'
  } finally {
    verifying.value = false
  }
})
</script>

<style scoped lang="scss">
.verify-page {
  width: 100%;
}

.verify-content {
  padding: var(--app-space-xl);
}

.verify-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--app-space-m);
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
  }
  
  &.success {
    color: var(--app-success-color);
  }
  
  &.error {
    color: var(--app-danger-color);
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

