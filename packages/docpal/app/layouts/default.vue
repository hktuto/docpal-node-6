<script setup lang="ts">
/**
 * Default Layout
 * 
 * Main app layout with sidebar navigation
 * - Left sidebar: Logo (top), nav (middle), user menu (bottom)
 * - Right content: Main app area
 */

import { House, Files, Setting, SwitchButton } from '@element-plus/icons-vue';

const { user, logout, currentCompany } = useAuth();
const router = useRouter();

const handleLogout = async () => {
  await logout();
  router.push('/login');
};
</script>

<template>
  <div class="default-layout">
    <!-- Left Sidebar -->
    <aside class="sidebar">
      <!-- Logo Section (Top) -->
      <div class="sidebar-logo">
        <h1>DocPal</h1>
      </div>
      
      <!-- Main Navigation (Middle) -->
      <nav class="sidebar-nav">
        <el-menu
          :default-active="$route.path"
          class="sidebar-menu"
          :router="false"
        >
          <el-menu-item index="/app">
            <el-icon><House /></el-icon>
            <span>Home</span>
          </el-menu-item>
          
          <el-menu-item index="/databases">
            <el-icon><Files /></el-icon>
            <span>Databases</span>
          </el-menu-item>
          
          <!-- Add more nav items as needed -->
        </el-menu>
      </nav>
      
      <!-- User Menu (Bottom) -->
      <div class="sidebar-user">
        <el-dropdown trigger="click" placement="top-start">
          <div class="user-info">
            <el-avatar :size="36">
              {{ user?.username?.[0]?.toUpperCase() }}
            </el-avatar>
            <div class="user-details">
              <div class="user-name">{{ user?.username }}</div>
              <div class="company-name">{{ currentCompany?.name }}</div>
            </div>
          </div>
          
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item disabled>
                <div class="dropdown-user-info">
                  <div class="dropdown-email">{{ user?.email }}</div>
                  <div class="dropdown-company">{{ currentCompany?.name }}</div>
                </div>
              </el-dropdown-item>
              
              <el-dropdown-item divided>
                <el-icon><Setting /></el-icon>
                <span>Settings</span>
              </el-dropdown-item>
              
              <el-dropdown-item>
                <el-icon><SwitchButton /></el-icon>
                <span>Switch Company</span>
              </el-dropdown-item>
              
              <el-dropdown-item divided @click="handleLogout">
                <el-icon><SwitchButton /></el-icon>
                <span>Logout</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </aside>
    
    <!-- Main Content Area -->
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<style scoped lang="scss">
.default-layout {
  display: flex;
  min-height: 100vh;
  background: var(--app-bg-color-page);
}

.sidebar {
  width: 240px;
  display: flex;
  flex-direction: column;
  background: var(--app-paper);
  border-right: 1px solid var(--app-border-color);
  box-shadow: var(--app-shadow-s);
}

.sidebar-logo {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 var(--app-space-l);
  border-bottom: 1px solid var(--app-border-color);
  
  h1 {
    font-size: var(--app-font-size-xl);
    font-weight: var(--app-font-weight-title);
    color: var(--app-primary-color);
    margin: 0;
  }
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: var(--app-space-m) 0;
}

.sidebar-menu {
  border: none;
  background: transparent;
  
  :deep(.el-menu-item) {
    height: 48px;
    line-height: 48px;
    margin: 0 var(--app-space-s);
    border-radius: var(--app-border-radius-m);
    color: var(--app-text-color-regular);
    
    &:hover {
      background: var(--app-fill-color);
    }
    
    &.is-active {
      background: var(--app-primary-alpha-10);
      color: var(--app-primary-color);
    }
    
    .el-icon {
      margin-right: var(--app-space-s);
      font-size: var(--app-font-size-l);
    }
  }
}

.sidebar-user {
  padding: var(--app-space-m);
  border-top: 1px solid var(--app-border-color);
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--app-space-m);
  padding: var(--app-space-s);
  border-radius: var(--app-border-radius-m);
  cursor: pointer;
  transition: background 150ms ease;
  
  &:hover {
    background: var(--app-fill-color);
  }
}

.user-details {
  flex: 1;
  min-width: 0;
  
  .user-name {
    font-size: var(--app-font-size-s);
    font-weight: var(--app-font-weight);
    color: var(--app-text-color-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .company-name {
    font-size: var(--app-font-size-xs);
    color: var(--app-text-color-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.dropdown-user-info {
  padding: var(--app-space-xs) 0;
  
  .dropdown-email {
    font-size: var(--app-font-size-s);
    color: var(--app-text-color-primary);
    margin-bottom: var(--app-space-xxs);
  }
  
  .dropdown-company {
    font-size: var(--app-font-size-xs);
    color: var(--app-text-color-secondary);
  }
}

.main-content {
  flex: 1;
  overflow: auto;
}

// Element Plus dropdown menu customization
:deep(.el-dropdown-menu) {
  .el-dropdown-menu__item {
    display: flex;
    align-items: center;
    gap: var(--app-space-s);
    font-size: var(--app-font-size-s);
    
    .el-icon {
      font-size: var(--app-font-size-m);
    }
  }
}
</style>

