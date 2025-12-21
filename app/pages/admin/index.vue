<script setup lang="ts">
import { useApiResponse } from '~/composables/useApiResponse'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

// Admin dashboard - system overview
const { data: stats, pending } = await useApiResponse('/api/admin/stats')
</script>

<template>
  <div class="adminDashboard">
    <h1>Admin Dashboard</h1>
    
    <div v-if="pending">Loading...</div>
    
    <div v-else-if="stats" class="statsGrid">
      <el-card class="statCard">
        <template #header>
          <div class="cardHeader">
            <Icon name="mdi:account-group" />
            <span>Total Users</span>
          </div>
        </template>
        <div class="statValue">{{ stats.totalUsers || 0 }}</div>
      </el-card>
      
      <el-card class="statCard">
        <template #header>
          <div class="cardHeader">
            <Icon name="mdi:office-building" />
            <span>Total Companies</span>
          </div>
        </template>
        <div class="statValue">{{ stats.totalCompanies || 0 }}</div>
      </el-card>
      
      <el-card class="statCard">
        <template #header>
          <div class="cardHeader">
            <Icon name="mdi:apps" />
            <span>Total Apps</span>
          </div>
        </template>
        <div class="statValue">{{ stats.totalApps || 0 }}</div>
      </el-card>
      
      <el-card class="statCard">
        <template #header>
          <div class="cardHeader">
            <Icon name="mdi:database" />
            <span>Dynamic Tables</span>
          </div>
        </template>
        <div class="statValue">{{ stats.totalTables || 0 }}</div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.adminDashboard {
  max-width: 1200px;
}

.statsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--app-space-m);
  margin-top: var(--app-space-l);
}

.statCard {
  background: var(--app-bg-color);
  border: 1px solid var(--app-border-color-light);
}

.cardHeader {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
  font-weight: var(--app-font-weight-title);
  color: var(--app-text-color-primary);
}

.statValue {
  font-size: var(--app-font-size-xxl);
  font-weight: var(--app-font-weight-title);
  color: var(--app-primary-color);
  margin-top: var(--app-space-s);
}
</style>


