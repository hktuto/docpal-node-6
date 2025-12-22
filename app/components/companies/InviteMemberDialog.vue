<template>
  <el-dialog
    v-model="visible"
    title="Invite Team Member"
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
      <el-form-item label="Email Address" prop="email">
        <el-input
          v-model="form.email"
          type="email"
          placeholder="colleague@example.com"
          size="large"
          :disabled="loading"
        >
          <template #prefix>
            <Icon name="lucide:mail" />
          </template>
        </el-input>
        <template #label>
          Email Address
          <el-text type="info" size="small" style="margin-left: 4px">
            (required)
          </el-text>
        </template>
      </el-form-item>

      <el-form-item label="Role" prop="role">
        <el-select
          v-model="form.role"
          placeholder="Select role"
          size="large"
          style="width: 100%"
          :disabled="loading"
        >
          <el-option label="Member" value="member">
            <div class="role-option">
              <div>
                <strong>Member</strong>
                <p>Can view and edit data, but cannot manage settings</p>
              </div>
            </div>
          </el-option>
          <el-option label="Admin" value="admin">
            <div class="role-option">
              <div>
                <strong>Admin</strong>
                <p>Can manage members and settings, but cannot delete the company</p>
              </div>
            </div>
          </el-option>
        </el-select>
        <template #label>
          Role
          <el-text type="info" size="small" style="margin-left: 4px">
            (required)
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
          Send Invitation
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'

interface Props {
  companyId: string
  modelValue: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const error = ref<string | null>(null)

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const form = reactive({
  email: '',
  role: 'member' as 'member' | 'admin',
})

const rules: FormRules = {
  email: [
    { required: true, message: 'Email is required', trigger: 'blur' },
    { type: 'email', message: 'Please enter a valid email address', trigger: 'blur' },
  ],
  role: [
    { required: true, message: 'Role is required', trigger: 'change' },
  ],
}

const handleClose = () => {
  form.email = ''
  form.role = 'member'
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
      await $api(`/api/companies/${props.companyId}/members/invite`, {
        method: 'POST',
        body: {
          email: form.email,
          role: form.role,
        },
      })

      ElMessage.success('Invitation sent successfully!')
      emit('success')
      handleClose()
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to send invitation'
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped lang="scss">
.role-option {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-xxs);
  
  strong {
    color: var(--app-text-color-primary);
    font-size: var(--app-font-size-m);
  }
  
  p {
    margin: 0;
    color: var(--app-text-color-secondary);
    font-size: var(--app-font-size-s);
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--app-space-s);
}
</style>

