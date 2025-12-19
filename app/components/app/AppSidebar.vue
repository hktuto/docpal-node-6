<script setup lang="ts">
interface App {
  id: string
  name: string
  icon?: string | null
  description?: string | null
}

interface Props {
  app: App
  expanded: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  toggle: []
}>()

const route = useRoute()
const router = useRouter()

// Menu items for the app
const menuItems = computed(() => [
  {
    id: 'home',
    label: 'Overview',
    icon: 'lucide:layout-dashboard',
    url: `/apps/${props.app.id}`,
    exact: true
  },
  {
    id: 'tables',
    label: 'Tables',
    icon: 'lucide:table',
    url: `/apps/${props.app.id}/tables`,
    badge: null // Could show count later
  },
  {
    id: 'views',
    label: 'Views',
    icon: 'lucide:eye',
    url: `/apps/${props.app.id}/views`
  },
  {
    id: 'dashboards',
    label: 'Dashboards',
    icon: 'lucide:layout-grid',
    url: `/apps/${props.app.id}/dashboards`
  }
])

const footerItems = computed(() => [
  {
    id: 'settings',
    label: 'Settings',
    icon: 'lucide:settings',
    url: `/apps/${props.app.id}/settings`
  }
])

const isActive = (item: { url: string; exact?: boolean }) => {
  if (item.exact) {
    return route.path === item.url
  }
  return route.path.startsWith(item.url)
}

const handleNavigate = (url: string) => {
  router.push(url)
}

const handleBackToApps = () => {
  router.push('/apps')
}
</script>

<template>
  <div class="app-sidebar">
    <!-- Header -->
    <div class="app-sidebar__header">
      <div class="app-sidebar__back" @click="handleBackToApps">
        <Icon name="lucide:arrow-left" size="16" />
        <span v-if="expanded" class="back-text">Back to Apps</span>
      </div>
      <div class="app-sidebar__app-info" v-if="expanded">
        <div class="app-icon">
          <Icon :name="app.icon || 'lucide:grid-3x3'" size="24" />
        </div>
        <div class="app-details">
          <h2 class="app-name">{{ app.name }}</h2>
          <p v-if="app.description" class="app-description">
            {{ app.description }}
          </p>
        </div>
      </div>
      <div v-else class="app-sidebar__app-icon-only">
        <Icon :name="app.icon || 'lucide:grid-3x3'" size="24" />
      </div>
    </div>

    <!-- Menu -->
    <nav class="app-sidebar__menu">
      <div
        v-for="item in menuItems"
        :key="item.id"
        class="menu-item"
        :class="{ 'menu-item--active': isActive(item) }"
        @click="handleNavigate(item.url)"
      >
        <div class="menu-item__icon">
          <Icon :name="item.icon" size="20" />
        </div>
        <span v-if="expanded" class="menu-item__label">{{ item.label }}</span>
        <span v-if="expanded && item.badge" class="menu-item__badge">
          {{ item.badge }}
        </span>
      </div>
    </nav>

    <!-- Footer -->
    <div class="app-sidebar__footer">
      <div
        v-for="item in footerItems"
        :key="item.id"
        class="menu-item"
        :class="{ 'menu-item--active': isActive(item) }"
        @click="handleNavigate(item.url)"
      >
        <div class="menu-item__icon">
          <Icon :name="item.icon" size="20" />
        </div>
        <span v-if="expanded" class="menu-item__label">{{ item.label }}</span>
      </div>

      <!-- Toggle Button -->
      <div class="menu-item toggle-btn" @click="emit('toggle')">
        <div class="menu-item__icon">
          <Icon :name="expanded ? 'lucide:panel-left-close' : 'lucide:panel-left-open'" size="20" />
        </div>
        <span v-if="expanded" class="menu-item__label">Collapse</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--app-space-s);

  &__header {
    padding-bottom: var(--app-space-m);
    border-bottom: 1px solid var(--app-border-color-light);
    margin-bottom: var(--app-space-m);
  }

  &__back {
    display: flex;
    align-items: center;
    gap: var(--app-space-xs);
    padding: var(--app-space-xs) var(--app-space-s);
    margin-bottom: var(--app-space-m);
    border-radius: var(--app-border-radius-s);
    color: var(--app-text-color-secondary);
    cursor: pointer;
    font-size: var(--app-font-size-s);
    transition: all 0.2s ease;

    &:hover {
      background: var(--app-fill-color);
      color: var(--app-primary-color);
    }

    .back-text {
      white-space: nowrap;
    }
  }

  &__app-info {
    display: flex;
    align-items: flex-start;
    gap: var(--app-space-s);

    .app-icon {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--app-primary-alpha-10);
      border-radius: var(--app-border-radius-m);
      color: var(--app-primary-color);
    }

    .app-details {
      flex: 1;
      min-width: 0;
    }

    .app-name {
      margin: 0;
      font-size: var(--app-font-size-l);
      font-weight: var(--app-font-weight-title);
      color: var(--app-text-color-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .app-description {
      margin: var(--app-space-xxs) 0 0 0;
      font-size: var(--app-font-size-s);
      color: var(--app-text-color-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  &__app-icon-only {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: var(--app-primary-alpha-10);
    border-radius: var(--app-border-radius-m);
    color: var(--app-primary-color);
  }

  &__menu {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--app-space-xxs);
  }

  &__footer {
    padding-top: var(--app-space-m);
    border-top: 1px solid var(--app-border-color-light);
    margin-top: var(--app-space-m);
    display: flex;
    flex-direction: column;
    gap: var(--app-space-xxs);
  }
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
  padding: var(--app-space-s);
  border-radius: var(--app-border-radius-s);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--app-text-color-secondary);

  &:hover {
    background: var(--app-fill-color);
    color: var(--app-text-color-primary);
  }

  &--active {
    background: var(--app-primary-alpha-10);
    color: var(--app-primary-color);

    &:hover {
      background: var(--app-primary-alpha-30);
      color: var(--app-primary-color);
    }
  }

  &__icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
  }

  &__label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: var(--app-font-size-m);
  }

  &__badge {
    padding: var(--app-space-xxs) var(--app-space-xs);
    background: var(--app-fill-color);
    border-radius: var(--app-border-radius-s);
    font-size: var(--app-font-size-xs);
    color: var(--app-text-color-secondary);
  }
}

.toggle-btn {
  margin-top: var(--app-space-xs);
}
</style>

