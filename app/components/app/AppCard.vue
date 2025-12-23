<script setup lang="ts">

interface Props {
  app: Workspace
}

const props = defineProps<Props>()

const emit = defineEmits<{
  edit: [app: Workspace]
  delete: [app: Workspace]
}>()

const router = useRouter()

const {navigateTo} = useSmartNavigation()
const handleClick = (e: MouseEvent) => {
  navigateTo(`/workspaces/${props.app.slug}`, e)
}

function handleEdit(e: MouseEvent) {
  emit('edit', props.app)
}
function handleDelete(e: MouseEvent) {
  emit('delete', props.app)
}
function handleSettings(e: MouseEvent) {
  navigateTo(`/workspaces/${props.app.slug}/settings`, e)
}


const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="app-card" @click="(e) => handleClick(e)">
    <div class="app-card__icon">
      <Icon 
        :name="app.icon || 'lucide:grid-3x3'" 
        size="32"
      />
    </div>
    <div class="app-card__content">
      <h3 class="app-card__title">{{ app.name }}</h3>
      <p v-if="app.description" class="app-card__description">
        {{ app.description }}
      </p>
      <div class="app-card__meta">
        <span class="app-card__date">
          Created {{ formatDate(app.createdAt) }}
        </span>
      </div>
    </div>
    <div class="app-card__actions" @click.stop>
      <el-dropdown trigger="click" >
        <div class="app-card__menu-trigger">
          <Icon name="tabler:dots-vertical" size="20" />
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="(e) => handleEdit(e)">
              <Icon name="lucide:edit" size="16" class="dropdown-icon" />
              Edit
            </el-dropdown-item>
            <el-dropdown-item @click="(e) => handleSettings(e)">
              <Icon name="lucide:settings" size="16" class="dropdown-icon" />
              Settings
            </el-dropdown-item>
            <el-dropdown-item divided @click="(e) => handleDelete(e)" class="danger-item">
              <Icon name="lucide:trash-2" size="16" class="dropdown-icon" />
              Delete
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-card {
  display: flex;
  align-items: flex-start;
  gap: var(--app-space-m);
  padding: var(--app-space-s);
  background: var(--app-paper);
  border: 1px solid var(--app-border-color-light);
  border-radius: var(--app-border-radius-m);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    border-color: var(--app-primary-color);
    box-shadow: var(--app-shadow-m);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }

  &__icon {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--app-primary-alpha-10);
    border-radius: var(--app-border-radius-m);
    color: var(--app-primary-color);
  }

  &__content {
    flex: 1;
    min-width: 0;
  }

  &__title {
    margin: 0 0 var(--app-space-xs) 0;
    font-size: var(--app-font-size-l);
    font-weight: var(--app-font-weight-title);
    color: var(--app-text-color-primary);
    line-height: 1.3;
  }

  &__description {
    margin: 0 0 var(--app-space-s) 0;
    font-size: var(--app-font-size-m);
    color: var(--app-text-color-secondary);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: var(--app-space-s);
  }

  &__date {
    font-size: var(--app-font-size-s);
    color: var(--app-text-color-placeholder);
  }

  &__actions {
    flex-shrink: 0;
  }

  &__menu-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    color: var(--app-text-color-placeholder);
    border-radius: var(--app-border-radius-s);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: var(--app-fill-color);
      color: var(--app-primary-color);
    }
  }
}

.dropdown-icon {
  margin-right: var(--app-space-xs);
  vertical-align: middle;
}

:deep(.danger-item) {
  color: var(--app-danger-color);

  &:hover {
    background: var(--app-danger-alpha-10);
  }
}
</style>

