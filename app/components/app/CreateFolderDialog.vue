<script setup lang="ts">
const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'confirm': [data: { name: string; description?: string }]
}>()

const formRef = ref()
const form = ref({
  name: '',
  description: ''
})

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// Handle dialog close
function handleClose() {
  form.value = { name: '', description: '' }
  formRef.value?.clearValidate()
  dialogVisible.value = false
}

// Handle confirm
async function handleConfirm() {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    emit('confirm', {
      name: form.value.name,
      description: form.value.description || undefined
    })
    handleClose()
  } catch (error) {
    console.error('Validation failed:', error)
  }
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="Create New Folder"
    width="500px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      label-position="top"
      @submit.prevent="handleConfirm"
    >
      <el-form-item
        label="Folder Name"
        prop="name"
        :rules="[
          { required: true, message: 'Please enter folder name', trigger: 'blur' },
          { min: 1, max: 50, message: 'Length should be 1 to 50 characters', trigger: 'blur' }
        ]"
      >
        <el-input
          v-model="form.name"
          placeholder="Enter folder name"
          clearable
          autofocus
          @keyup.enter="handleConfirm"
        />
      </el-form-item>
      
      <el-form-item
        label="Description (Optional)"
        prop="description"
      >
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="Enter folder description"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">Cancel</el-button>
        <el-button type="primary" @click="handleConfirm">
          <Icon name="lucide:folder-plus" class="button-icon" />
          Create Folder
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.button-icon {
  margin-right: var(--app-space-xs);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--app-space-s);
}
</style>

