<script setup lang="ts">
interface Props {
  value: string | null
  workspaceSlug: string
  tableSlug: string
  displayField: string
  linkable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  linkable: true
})

const relatedRecord = ref<any>(null)
const loading = ref(true)
const error = ref(false)

watchEffect(async () => {
  if (!props.value || !props.tableSlug) {
    relatedRecord.value = null
    loading.value = false
    return
  }
  
  loading.value = true
  error.value = false
  
  try {
    const response = await $fetch(
      `/api/workspaces/${props.workspaceSlug}/tables/${props.tableSlug}/records/${props.value}`
    )
    relatedRecord.value = (response as any).data
  } catch (err) {
    console.error('Failed to load related record:', err)
    error.value = true
    relatedRecord.value = null
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="relation-display">
    <!-- Loading -->
    <span v-if="loading" class="loading">
      <Icon name="lucide:loader-2" size="14" class="spin" />
      Loading...
    </span>
    
    <!-- Empty -->
    <span v-else-if="!value" class="empty">—</span>
    
    <!-- Error -->
    <span v-else-if="error" class="error">
      <Icon name="lucide:alert-circle" size="14" />
      <span class="error-text">Record not found</span>
    </span>
    
    <!-- With Link -->
    <NuxtLink 
      v-else-if="linkable && relatedRecord"
      :to="`/workspaces/${workspaceSlug}/tables/${tableSlug}/records/${value}`"
      class="relation-link"
    >
      <Icon name="lucide:link" size="14" />
      <span>{{ relatedRecord[displayField] || value }}</span>
      <Icon name="lucide:external-link" size="12" class="external" />
    </NuxtLink>
    
    <!-- Without Link -->
    <span v-else-if="relatedRecord" class="relation-text">
      <Icon name="lucide:link" size="14" />
      <span>{{ relatedRecord[displayField] || value }}</span>
    </span>
  </div>
</template>

<style scoped>
.relation-display {
  display: inline-flex;
  align-items: center;
}

.loading,
.empty,
.error {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.error {
  color: var(--el-color-error);
}

.error-text {
  font-style: italic;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.relation-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--el-color-primary);
  text-decoration: none;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s;
}

.relation-link:hover {
  background-color: var(--el-color-primary-light-9);
  text-decoration: underline;
}

.relation-link .external {
  opacity: 0;
  transition: opacity 0.2s;
}

.relation-link:hover .external {
  opacity: 1;
}

.relation-text {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}
</style>

