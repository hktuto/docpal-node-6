<template>
  <el-dialog
    v-model="visible"
    title="Create Company"
    width="500px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent="handleSubmit"
    >
      <el-form-item label="Company Name" prop="name">
        <el-input
          v-model="form.name"
          placeholder="Acme Corporation"
          size="large"
          :disabled="loading"
        >
          <template #prefix>
            <Icon name="lucide:building-2" />
          </template>
        </el-input>
        <template #label>
          Company Name
          <el-text type="info" size="small" style="margin-left: 4px">
            (required)
          </el-text>
        </template>
      </el-form-item>

      <el-form-item label="Description" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="Brief description of your company (optional)"
          :disabled="loading"
          maxlength="500"
          show-word-limit
        />
        <template #label>
          Description
          <el-text type="info" size="small" style="margin-left: 4px">
            (optional)
          </el-text>
        </template>
      </el-form-item>

      <el-form-item label="Logo URL" prop="logo">
        <el-input
          v-model="form.logo"
          placeholder="https://example.com/logo.png"
          size="large"
          :disabled="loading"
        >
          <template #prefix>
            <Icon name="lucide:image" />
          </template>
        </el-input>
        <template #label>
          Logo URL
          <el-text type="info" size="small" style="margin-left: 4px">
            (optional)
          </el-text>
        </template>
      </el-form-item>

      <el-form-item v-if="error">
        <el-alert :title="error" type="error" :closable="false" />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" :disabled="loading">
          Cancel
        </el-button>
        <el-button
          type="primary"
          :loading="loading"
          @click="handleSubmit"
        >
          Create Company
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const props = defineProps<{
  modelValue: boolean
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const error = ref<string | null>(null)
const auth = useAuth()
const router = useRouter()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const form = reactive({
  name: '',
  description: '',
  logo: '',
})

const rules: FormRules = {
  name: [
    { required: true, message: 'Company name is required', trigger: 'blur' },
    { min: 1, max: 100, message: 'Company name must be between 1 and 100 characters', trigger: 'blur' },
  ],
  description: [
    { max: 500, message: 'Description must be less than 500 characters', trigger: 'blur' },
  ],
  logo: [
    { type: 'url', message: 'Please enter a valid URL', trigger: 'blur' },
  ],
}

const handleClose = () => {
  form.name = ''
  form.description = ''
  form.logo = ''
  error.value = null
  formRef.value?.clearValidate()
  emit('update:modelValue', false)
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    error.value = null

    const { $api } = useNuxtApp()
    try {
      const response = await $api<any>('/api/companies', {
        method: 'POST',
        body: {
          name: form.name,
          description: form.description || undefined,
          logo: form.logo || undefined,
        },
      })

      // Update auth state with new company
      if (response.data?.company) {
        auth.company.value = {
          id: response.data.company.id,
          name: response.data.company.name,
          slug: response.data.company.slug,
          role: response.data.company.role,
        }
      }

      // Refresh user data to get updated company list
      await auth.fetchUser({ skip401Redirect: true })

      ElMessage.success('Company created successfully!')
      emit('success')
      handleClose()

      // Redirect to apps page
      await router.push('/workspaces')
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to create company'
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped lang="scss">
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--app-space-s);
}
</style>

