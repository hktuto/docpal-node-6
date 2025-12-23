<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const router = useRouter()

const navigateToApps = () => {
  router.push('/workspaces')
}
</script>

<template>
  <div class="home-page">
    <!-- Header -->
    <div class="home-page__header">
      <div>
        <h1 class="home-page__title">Home Dashboard</h1>
        <p class="home-page__subtitle">
          Your personalized workspace is coming soon
        </p>
      </div>
    </div>

    <!-- Coming Soon Content -->
    <div class="home-page__content">
      <div class="coming-soon">
        <div class="coming-soon__illustration">
          <Icon name="lucide:layout-dashboard" size="120" class="coming-soon__icon" />
        </div>
        
        <h2 class="coming-soon__title">Dashboard Coming Soon</h2>
        
        <p class="coming-soon__description">
          We're building a personalized home dashboard where you can configure widgets, 
          view your recent activity, manage tasks, and get quick insights across all your apps.
        </p>

        <div class="coming-soon__features">
          <div class="feature-card">
            <div class="feature-card__icon">
              <Icon name="lucide:grid-3x3" size="32" />
            </div>
            <h3 class="feature-card__title">Customizable Widgets</h3>
            <p class="feature-card__description">
              Add, remove, and arrange widgets to create your perfect workspace
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-card__icon">
              <Icon name="lucide:activity" size="32" />
            </div>
            <h3 class="feature-card__title">Recent Activity</h3>
            <p class="feature-card__description">
              Stay updated with your latest actions and changes across all apps
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-card__icon">
              <Icon name="lucide:check-square" size="32" />
            </div>
            <h3 class="feature-card__title">Assigned Tasks</h3>
            <p class="feature-card__description">
              Quick access to tasks and items that need your attention
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-card__icon">
              <Icon name="lucide:bar-chart" size="32" />
            </div>
            <h3 class="feature-card__title">Quick Insights</h3>
            <p class="feature-card__description">
              View important metrics and statistics at a glance
            </p>
          </div>
        </div>

        <div class="coming-soon__actions">
          <el-button 
            type="primary" 
            size="large"
            @click="navigateToApps"
          >
            <Icon name="lucide:database" class="button-icon" />
            Go to Apps
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.home-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--app-space-l);

  &__header {
    margin-bottom: var(--app-space-xl);
  }

  &__title {
    margin: 0 0 var(--app-space-xs) 0;
    font-size: var(--app-font-size-xxl);
    font-weight: var(--app-font-weight-title);
    color: var(--app-text-color-primary);
    line-height: 1.2;
  }

  &__subtitle {
    margin: 0;
    font-size: var(--app-font-size-m);
    color: var(--app-text-color-secondary);
  }

  &__content {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 60vh;
  }
}

.coming-soon {
  text-align: center;
  max-width: 900px;
  width: 100%;

  &__illustration {
    margin-bottom: var(--app-space-xl);
    display: flex;
    justify-content: center;
  }

  &__icon {
    color: var(--app-primary-color);
    opacity: 0.8;
  }

  &__title {
    margin: 0 0 var(--app-space-m) 0;
    font-size: var(--app-font-size-xxl);
    font-weight: var(--app-font-weight-title);
    color: var(--app-text-color-primary);
  }

  &__description {
    margin: 0 0 var(--app-space-xl) 0;
    font-size: var(--app-font-size-l);
    color: var(--app-text-color-secondary);
    line-height: 1.6;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }

  &__features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--app-space-l);
    margin-bottom: var(--app-space-xl);
  }

  &__actions {
    display: flex;
    justify-content: center;
    gap: var(--app-space-m);
  }
}

.feature-card {
  padding: var(--app-space-l);
  background: var(--app-paper);
  border: 1px solid var(--app-border-color-light);
  border-radius: var(--app-border-radius-m);
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--app-primary-color);
    box-shadow: var(--app-shadow-m);
    transform: translateY(-2px);
  }

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    margin-bottom: var(--app-space-m);
    background: var(--app-primary-alpha-10);
    border-radius: var(--app-border-radius-m);
    color: var(--app-primary-color);
  }

  &__title {
    margin: 0 0 var(--app-space-xs) 0;
    font-size: var(--app-font-size-l);
    font-weight: var(--app-font-weight-title);
    color: var(--app-text-color-primary);
  }

  &__description {
    margin: 0;
    font-size: var(--app-font-size-m);
    color: var(--app-text-color-secondary);
    line-height: 1.5;
  }
}

.button-icon {
  margin-right: var(--app-space-xs);
}

// Responsive
@media (max-width: 768px) {
  .home-page {
    padding: var(--app-space-m);
  }

  .coming-soon {
    &__features {
      grid-template-columns: 1fr;
    }
  }

  .feature-card {
    padding: var(--app-space-m);
  }
}
</style>
