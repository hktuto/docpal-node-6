<template>
  <el-card class="register-form-card">
    <template #header>
      <h2>Create Account</h2>
    </template>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent="handleSubmit"
    >
      <el-form-item label="Name" prop="name">
        <el-input
          v-model="form.name"
          placeholder="Your full name"
          size="large"
          :disabled="loading"
        >
          <template #prefix>
            <Icon name="lucide:user" />
          </template>
        </el-input>
      </el-form-item>

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

      <el-form-item label="Password" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          placeholder="At least 8 characters"
          size="large"
          :disabled="loading"
          show-password
        >
          <template #prefix>
            <Icon name="lucide:lock" />
          </template>
        </el-input>
      </el-form-item>

      <el-form-item label="Confirm Password" prop="confirmPassword">
        <el-input
          v-model="form.confirmPassword"
          type="password"
          placeholder="Confirm your password"
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

      <el-form-item>
        <el-button
          type="primary"
          size="large"
          native-type="submit"
          :loading="loading"
          style="width: 100%"
        >
          Create Account
        </el-button>
      </el-form-item>

      <div class="form-footer">
        <span>Already have an account?</span>
        <el-button
          text
          type="primary"
          :disabled="loading"
          @click="navigateToLogin"
        >
          Sign In
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
const loading = ref(false)
const error = ref<string | null>(null)

const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const validatePasswordConfirm = (rule: any, value: any, callback: any) => {
  if (value !== form.password) {
    callback(new Error('Passwords do not match'))
  } else {
    callback()
  }
}

const rules: FormRules = {
  name: [
    { required: false, message: 'Name is optional', trigger: 'blur' },
  ],
  email: [
    { required: true, message: 'Email is required', trigger: 'blur' },
    { type: 'email', message: 'Please enter a valid email', trigger: 'blur' },
  ],
  password: [
    { required: true, message: 'Password is required', trigger: 'blur' },
    { min: 8, message: 'Password must be at least 8 characters', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: 'Please confirm your password', trigger: 'blur' },
    { validator: validatePasswordConfirm, trigger: 'blur' },
  ],
}

const navigateToLogin = () => {
  const redirect = route.query.redirect as string
  if (redirect) {
    router.push(`/auth/login?redirect=${encodeURIComponent(redirect)}`)
  } else {
    router.push('/auth/login')
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    error.value = null

    try {
      const { $api } = useNuxtApp()
      const response = await $api<any>('/api/auth/register', {
        method: 'POST',
        body: {
          email: form.email,
          password: form.password,
          name: form.name || undefined,
        },
      })

      // Update auth state
      if (response.data?.user) {
        auth.user.value = {
          ...response.data.user,
          emailVerifiedAt: response.data.user.emailVerifiedAt ? new Date(response.data.user.emailVerifiedAt) : null,
        }
      }

      // Fetch full user data including company
      await auth.fetchUser({ skip401Redirect: true })

      ElMessage.success('Account created successfully!')

      // Get redirect URL from query or default
      const redirectTo = (route.query.redirect as string) || '/apps'
      
      // Redirect based on whether user has a company
      if (auth.hasCompany.value) {
        await router.push(redirectTo)
      } else {
        await router.push('/companies')
      }
    } catch (e: any) {
      error.value = e.data?.message || 'Registration failed'
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped lang="scss">
.register-form-card {
  :deep(.el-card__header) {
    padding: var(--app-space-l);
    
    h2 {
      margin: 0;
      font-size: var(--app-font-size-xl);
      font-weight: var(--app-font-weight-title);
      text-align: center;
      color: var(--app-text-color-primary);
    }
  }

  :deep(.el-card__body) {
    padding: var(--app-space-l);
  }
}

.form-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--app-space-xs);
  margin-top: var(--app-space-l);
  font-size: var(--app-font-size-m);
  color: var(--app-text-color-secondary);
}
</style>

