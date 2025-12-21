<template>
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
        disabled
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
        placeholder="Create a password (min 8 characters)"
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
        Create Account & Join
      </el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'

interface Props {
  email: string
  inviteCode: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const error = ref<string | null>(null)

const form = reactive({
  name: '',
  email: props.email,
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
    { required: true, message: 'Name is required', trigger: 'blur' },
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

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    error.value = null

    const {$api} = useNuxtApp()
    try {
      // First, register the user
      const registerResult = await $api('/api/auth/register', {
        method: 'POST',
        body: {
          email: form.email,
          password: form.password,
          name: form.name,
        },
      })

      if (!registerResult) {
        throw new Error('Registration failed')
      }

      // Then accept the invite
      const auth = useAuth()
      const inviteResult = await auth.acceptInvite(props.inviteCode)

      if (inviteResult.success) {
        ElMessage.success('Account created and invite accepted!')
        emit('success')
      } else {
        error.value = inviteResult.error || 'Failed to accept invite'
      }
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'An error occurred'
    } finally {
      loading.value = false
    }
  })
}
</script>

