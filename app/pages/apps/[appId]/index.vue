<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const route = useRoute()
const appId = route.params.appId as string

// Fetch app data
const { data: app, pending: appPending } = await useFetch(`/api/apps/${appId}`)

// TODO: Fetch tables, views, dashboards counts for stats
// For now using placeholder data
const stats = ref({
  tables: 0,
  views: 0,
  dashboards: 0,
  records: 0
})
</script>

<template>
  <div class="app-detail-page">
    <div v-if="appPending" class="app-detail-page__loading">
      <el-skeleton :rows="5" animated />
    </div>

    <div v-else-if="!app" class="app-detail-page__error">
      <el-result
        icon="error"
        title="App Not Found"
        sub-title="The app you're looking for doesn't exist or has been deleted."
      >
        <template #extra>
          <el-button type="primary" @click="navigateTo('/apps')">
            Go to Apps
          </el-button>
        </template>
      </el-result>
    </div>

    <div v-else class="app-detail-page__content">
      <!-- Header -->
      <div class="app-detail-page__header">
        <div class="header-info">
          <h1 class="page-title">Overview</h1>
          <p class="page-subtitle">
            Welcome to {{ app.name }}. Manage your tables, views, and dashboards.
          </p>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="stats-grid">
        <div class="stat-card" @click="navigateTo(`/apps/${appId}/tables`)">
          <div class="stat-card__icon">
            <Icon name="lucide:table" size="28" />
          </div>
          <div class="stat-card__content">
            <div class="stat-card__value">{{ stats.tables }}</div>
            <div class="stat-card__label">Tables</div>
          </div>
          <div class="stat-card__arrow">
            <Icon name="lucide:chevron-right" size="20" />
          </div>
        </div>

        <div class="stat-card" @click="navigateTo(`/apps/${appId}/views`)">
          <div class="stat-card__icon">
            <Icon name="lucide:eye" size="28" />
          </div>
          <div class="stat-card__content">
            <div class="stat-card__value">{{ stats.views }}</div>
            <div class="stat-card__label">Views</div>
          </div>
          <div class="stat-card__arrow">
            <Icon name="lucide:chevron-right" size="20" />
          </div>
        </div>

        <div class="stat-card" @click="navigateTo(`/apps/${appId}/dashboards`)">
          <div class="stat-card__icon">
            <Icon name="lucide:layout-grid" size="28" />
          </div>
          <div class="stat-card__content">
            <div class="stat-card__value">{{ stats.dashboards }}</div>
            <div class="stat-card__label">Dashboards</div>
          </div>
          <div class="stat-card__arrow">
            <Icon name="lucide:chevron-right" size="20" />
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--secondary">
            <Icon name="lucide:database" size="28" />
          </div>
          <div class="stat-card__content">
            <div class="stat-card__value">{{ stats.records }}</div>
            <div class="stat-card__label">Total Records</div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="section">
        <h2 class="section-title">Quick Actions</h2>
        <div class="quick-actions">
          <el-button type="primary" size="large" @click="navigateTo(`/apps/${appId}/tables`)">
            <Icon name="lucide:plus" class="button-icon" />
            Create Table
          </el-button>
          <el-button size="large" @click="navigateTo(`/apps/${appId}/views`)">
            <Icon name="lucide:plus" class="button-icon" />
            Create View
          </el-button>
          <el-button size="large" @click="navigateTo(`/apps/${appId}/dashboards`)">
            <Icon name="lucide:plus" class="button-icon" />
            Create Dashboard
          </el-button>
        </div>
      </div>

      <!-- Recent Activity (Placeholder) -->
      <div class="section">
        <h2 class="section-title">Recent Activity</h2>
        <div class="empty-section">
          <Icon name="lucide:activity" size="48" class="empty-icon" />
          <p class="empty-text">No recent activity yet</p>
          <p class="empty-hint">Activity will appear here once you start working with tables and records.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-detail-page {
  max-width: 1200px;
  margin: 0 auto;

  &__loading {
    padding: var(--app-space-xl) 0;
  }

  &__error {
    padding: var(--app-space-xl) 0;
  }

  &__header {
    margin-bottom: var(--app-space-xl);
  }
}

.header-info {
  .page-title {
    margin: 0 0 var(--app-space-xs) 0;
    font-size: var(--app-font-size-xxl);
    font-weight: var(--app-font-weight-title);
    color: var(--app-text-color-primary);
  }

  .page-subtitle {
    margin: 0;
    font-size: var(--app-font-size-m);
    color: var(--app-text-color-secondary);
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--app-space-m);
  margin-bottom: var(--app-space-xl);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--app-space-m);
  padding: var(--app-space-l);
  background: var(--app-paper);
  border: 1px solid var(--app-border-color-light);
  border-radius: var(--app-border-radius-m);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--app-primary-color);
    box-shadow: var(--app-shadow-m);
    transform: translateY(-2px);
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    background: var(--app-primary-alpha-10);
    border-radius: var(--app-border-radius-m);
    color: var(--app-primary-color);

    &--secondary {
      background: var(--app-fill-color);
      color: var(--app-text-color-secondary);
    }
  }

  &__content {
    flex: 1;
  }

  &__value {
    font-size: var(--app-font-size-xxl);
    font-weight: var(--app-font-weight-title);
    color: var(--app-text-color-primary);
    line-height: 1.2;
  }

  &__label {
    font-size: var(--app-font-size-m);
    color: var(--app-text-color-secondary);
  }

  &__arrow {
    color: var(--app-text-color-placeholder);
    transition: all 0.2s ease;
  }

  &:hover &__arrow {
    color: var(--app-primary-color);
    transform: translateX(4px);
  }
}

.section {
  margin-bottom: var(--app-space-xl);
}

.section-title {
  margin: 0 0 var(--app-space-m) 0;
  font-size: var(--app-font-size-l);
  font-weight: var(--app-font-weight-title);
  color: var(--app-text-color-primary);
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--app-space-m);
}

.button-icon {
  margin-right: var(--app-space-xs);
}

.empty-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--app-space-xl);
  background: var(--app-paper);
  border: 1px dashed var(--app-border-color);
  border-radius: var(--app-border-radius-m);
  text-align: center;
}

.empty-icon {
  color: var(--app-text-color-placeholder);
  margin-bottom: var(--app-space-m);
}

.empty-text {
  margin: 0 0 var(--app-space-xs) 0;
  font-size: var(--app-font-size-l);
  font-weight: var(--app-font-weight-title);
  color: var(--app-text-color-primary);
}

.empty-hint {
  margin: 0;
  font-size: var(--app-font-size-m);
  color: var(--app-text-color-secondary);
}

// Responsive
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .quick-actions {
    flex-direction: column;

    .el-button {
      width: 100%;
    }
  }
}
</style>

