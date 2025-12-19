<script setup lang="ts">
// Admin layout - separate from user-facing layout
const expandState = ref(true)

function toggleExpand() {
  expandState.value = !expandState.value
}
</script>

<template>
  <div class="adminContainer">
    <aside class="adminSidebar">
      <div class="adminHeader">
        <h2>Admin Panel</h2>
      </div>
      <nav class="adminNav">
        <NuxtLink to="/admin" class="navItem">
          <Icon name="mdi:view-dashboard" />
          <span v-if="expandState">Dashboard</span>
        </NuxtLink>
        <NuxtLink to="/admin/system/status" class="navItem">
          <Icon name="mdi:server" />
          <span v-if="expandState">System Status</span>
        </NuxtLink>
        <NuxtLink to="/admin/users" class="navItem">
          <Icon name="mdi:account-group" />
          <span v-if="expandState">Users</span>
        </NuxtLink>
        <NuxtLink to="/admin/companies" class="navItem">
          <Icon name="mdi:office-building" />
          <span v-if="expandState">Companies</span>
        </NuxtLink>
      </nav>
      <div class="adminFooter">
        <el-button 
          text 
          @click="toggleExpand"
          class="toggleButton"
        >
          <Icon :name="expandState ? 'lucide:chevron-left' : 'lucide:chevron-right'" />
        </el-button>
      </div>
    </aside>
    <main class="adminMain">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.adminContainer {
  display: flex;
  min-height: 100vh;
  background: var(--app-bg-color-page);
}

.adminSidebar {
  width: 250px;
  background: var(--app-bg-color);
  border-right: 1px solid var(--app-border-color);
  display: flex;
  flex-direction: column;
  padding: var(--app-space-m);
}

.adminHeader {
  padding: var(--app-space-m);
  border-bottom: 1px solid var(--app-border-color-light);
  margin-bottom: var(--app-space-m);
}

.adminHeader h2 {
  margin: 0;
  font-size: var(--app-font-size-l);
  color: var(--app-text-color-primary);
}

.adminNav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--app-space-xs);
}

.navItem {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
  padding: var(--app-space-s);
  border-radius: var(--app-border-radius-m);
  color: var(--app-text-color-regular);
  text-decoration: none;
  transition: all 0.2s;
}

.navItem:hover {
  background: var(--app-fill-color-light);
  color: var(--app-primary-color);
}

.navItem.router-link-active {
  background: var(--app-primary-alpha-10);
  color: var(--app-primary-color);
}

.adminFooter {
  padding-top: var(--app-space-m);
  border-top: 1px solid var(--app-border-color-light);
}

.toggleButton {
  width: 100%;
  justify-content: center;
}

.adminMain {
  flex: 1;
  padding: var(--app-space-l);
  overflow-y: auto;
}
</style>


