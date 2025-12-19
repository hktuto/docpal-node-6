<script setup lang="ts">
definePageMeta({
  layout: 'app'
})

const route = useRoute()
const appSlug = route.params.appSlug as string

// App data is now provided by the layout
</script>

<template>
  <div class="app-overview">
    <!-- Overview content (layout provides header and sidebar) -->
    <h1>Overview</h1>
    <p>Welcome to your app dashboard</p>
    
    <div class="overview-stats">
      <div class="stat-card">
        <Icon name="lucide:table" size="24" />
        <div class="stat-info">
          <div class="stat-value">0</div>
          <div class="stat-label">Tables</div>
        </div>
      </div>
      
      <div class="stat-card">
        <Icon name="lucide:layout-dashboard" size="24" />
        <div class="stat-info">
          <div class="stat-value">0</div>
          <div class="stat-label">Views</div>
        </div>
      </div>
      
      <div class="stat-card">
        <Icon name="lucide:bar-chart" size="24" />
        <div class="stat-info">
          <div class="stat-value">0</div>
          <div class="stat-label">Dashboards</div>
        </div>
      </div>
    </div>
    
    <div class="quick-actions">
      <h3>Quick Actions</h3>
      <div class="action-buttons">
        <NuxtLink :to="`/apps/${appSlug}/tables`" class="action-btn">
          <Icon name="lucide:plus" />
          Create Table
        </NuxtLink>
        <NuxtLink :to="`/apps/${appSlug}/views`" class="action-btn">
          <Icon name="lucide:plus" />
          Create View
        </NuxtLink>
        <NuxtLink :to="`/apps/${appSlug}/dashboards`" class="action-btn">
          <Icon name="lucide:plus" />
          Create Dashboard
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-overview {
  max-width: 1200px;
  padding: var(--app-space-l);
  
  h1 {
    margin: 0 0 var(--app-space-s);
    font-size: var(--app-font-size-xxl);
    font-weight: 700;
    color: var(--app-text-color-primary);
  }
  
  > p {
    margin: 0 0 var(--app-space-xl);
    font-size: var(--app-font-size-m);
    color: var(--app-text-color-secondary);
  }
  
  .overview-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--app-space-m);
    margin-bottom: var(--app-space-xl);
    
    .stat-card {
      padding: var(--app-space-l);
      border: 1px solid var(--app-border-color);
      border-radius: var(--app-border-radius-l);
      background: var(--app-bg-color);
      display: flex;
      align-items: center;
      gap: var(--app-space-m);
      transition: all 0.2s;
      
      &:hover {
        box-shadow: var(--app-shadow-m);
        border-color: var(--app-border-color-dark);
      }
      
      .stat-info {
        .stat-value {
          font-size: var(--app-font-size-xxl);
          font-weight: 700;
          color: var(--app-text-color-primary);
        }
        
        .stat-label {
          font-size: var(--app-font-size-s);
          color: var(--app-text-color-secondary);
          margin-top: var(--app-space-xxs);
        }
      }
    }
  }
  
  .quick-actions {
    h3 {
      margin: 0 0 var(--app-space-m);
      font-size: var(--app-font-size-l);
      font-weight: 600;
      color: var(--app-text-color-primary);
    }
    
    .action-buttons {
      display: flex;
      gap: var(--app-space-m);
      flex-wrap: wrap;
      
      .action-btn {
        display: flex;
        align-items: center;
        gap: var(--app-space-xs);
        padding: var(--app-space-m) var(--app-space-l);
        border: 1px solid var(--app-border-color);
        border-radius: var(--app-border-radius-m);
        background: var(--app-bg-color);
        color: var(--app-text-color-primary);
        text-decoration: none;
        font-weight: 500;
        transition: all 0.2s;
        
        &:hover {
          border-color: var(--app-primary-color);
          color: var(--app-primary-color);
          background: var(--app-primary-1);
          box-shadow: var(--app-shadow-primary-s);
        }
      }
    }
  }
}
</style>

