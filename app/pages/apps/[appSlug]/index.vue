<script setup lang="ts">
definePageMeta({
  layout: 'app'
})

const { app } = useAppContext()

// Track if component is mounted (for Teleport)
const isMounted = ref(false)
onMounted(() => {
  isMounted.value = true
})

function navigateToSettings() {
  navigateTo(`/apps/${app.value.slug}/settings`)
}
</script>

<template>
  <div class="app-overview-page">
    <!-- Teleport: Page Actions -->
    <Teleport v-if="isMounted" to="#app-page-actions">
      <el-button @click="navigateToSettings">
        <Icon name="lucide:settings" />
        Settings
      </el-button>
    </Teleport>
    
    <!-- Page Content -->
    <div class="overview-content">
      <el-empty description="App overview coming soon">
        <template #image>
          <Icon name="lucide:layout-dashboard" size="64" />
        </template>
      </el-empty>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-overview-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.overview-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--app-space-xl);
}
</style>
