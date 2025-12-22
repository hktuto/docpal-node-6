<template>
  <el-card class="login-form-card glass">
    <template #header>
      <p>{{ useMagicLink ? 'Sign in with Magic Link' : 'Sign In' }}</p>
    </template>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent="handleSubmit"
    >
      <el-form-item label="Email" prop="email">
        <el-input
          v-model="form.email"
          type="email"
          placeholder="your@email.com"
          size="large"
          :disabled="loading"
        >
          <template #prefix>
            <Icon name="lucide:mail" />
          </template>
        </el-input>
      </el-form-item>

      <el-form-item v-if="!useMagicLink" label="Password" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          placeholder="Enter your password"
          size="large"
          :disabled="loading"
          show-password
        >
          <template #prefix>
            <Icon name="lucide:lock" />
          </template>
        </el-input>
      </el-form-item>

      <el-form-item v-if="error">
        <el-alert :title="error" type="error" :closable="false" />
      </el-form-item>

      <el-form-item v-if="magicLinkSent">
        <el-alert
          title="Magic link sent!"
          type="success"
          :closable="false"
        >
          <template #default>
            Check your email for a link to sign in.
          </template>
        </el-alert>
      </el-form-item>

      <el-form-item>
        <el-button
          type="primary"
          size="large"
          native-type="submit"
          :loading="loading"
          style="width: 100%"
        >
          {{ useMagicLink ? 'Send Magic Link' : 'Sign In' }}
        </el-button>
      </el-form-item>

      <div class="form-divider">
        <span>OR</span>
      </div>

      <el-button
        text
        size="large"
        style="width: 100%"
        :disabled="loading"
        @click="toggleMagicLink"
      >
        {{ useMagicLink ? 'Sign in with password' : 'Sign in with magic link' }}
      </el-button>

      <div class="form-footer">
        <span>Don't have an account?</span>
        <el-button
          text
          type="primary"
          :disabled="loading"
          @click="navigateToRegister"
        >
          Create Account
        </el-button>
      </div>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'

const auth = useAuth()
const router = useRouter()
const route = useRoute()

const formRef = ref<FormInstance>()
const useMagicLink = ref(false)
const magicLinkSent = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

const form = reactive({
  email: '',
  password: '',
})

const rules: FormRules = {
  email: [
    { required: true, message: 'Email is required', trigger: 'blur' },
    { type: 'email', message: 'Please enter a valid email', trigger: 'blur' },
  ],
  password: [
    { 
      required: !useMagicLink.value, 
      message: 'Password is required', 
      trigger: 'blur' 
    },
  ],
}

const toggleMagicLink = () => {
  useMagicLink.value = !useMagicLink.value
  magicLinkSent.value = false
  error.value = null
}

const navigateToRegister = () => {
  const redirect = route.query.redirect as string
  if (redirect) {
    router.push(`/auth/register?redirect=${encodeURIComponent(redirect)}`)
  } else {
    router.push('/auth/register')
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    error.value = null
    magicLinkSent.value = false

    try {
      if (useMagicLink.value) {
        // Send magic link
        const result = await auth.sendMagicLink(form.email)
        
        if (result.success) {
          magicLinkSent.value = true
          ElMessage.success('Magic link sent! Check your email.')
        } else {
          error.value = result.error || 'Failed to send magic link'
        }
      } else {
        // Login with password
        const result = await auth.login(form.email, form.password)
        if (result.success) {
          ElMessage.success('Welcome back!')
          
          // Get redirect URL from query or default to /apps
          const route = useRoute()
          const redirectTo = (route.query.redirect as string) || '/apps'
          // Redirect to requested page or apps/companies
          if (auth.hasCompany.value) {
            await router.push(redirectTo)
          } else {
            await router.push('/companies')
          }
        } else {
          error.value = result.error || 'Login failed'
        }
      }
    } catch (e: any) {
      error.value = e.message || 'An error occurred'
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped lang="scss">
.login-form-card {
  --el-card-bg-color: transparent;
  --el-card-border-color: transparent;
  --el-card-border-radius: var(--app-border-radius-m);
  :deep(.el-card__header) {
    padding: var(--app-space-s) var(--app-space-m);
    
  }

  :deep(.el-card__body) {
    padding: var(--app-space-m);
  }
}

.form-divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: var(--app-space-s) 0;
  
  &::before,
  &::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid var(--app-border-color);
  }
  
  span {
    padding: 0 var(--app-space-m);
    color: var(--app-text-color-secondary);
    font-size: var(--app-font-size-s);
  }
}

.form-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--app-space-xs);
  margin-top: var(--app-space-m);
  font-size: var(--app-font-size-m);
  color: var(--app-text-color-secondary);
}
</style>

