<script setup lang="ts">
interface Props {
  error: {
    statusCode: number
    statusMessage: string
    message?: string
  }
}

const props = defineProps<Props>()

const router = useRouter()
const route = useRoute()

const is404 = computed(() => props.error.statusCode === 404)
const errorTitle = computed(() => {
  if (is404.value) return 'Page Not Found'
  return 'Something Went Wrong'
})

const errorMessage = computed(() => {
  if (is404.value) {
    return 'The page you are looking for doesn\'t exist or has been moved.'
  }
  return props.error.message || props.error.statusMessage || 'An unexpected error occurred'
})

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>

<template>
  <div class="error-page">
    <div class="error-page__container">
      <div class="error-page__content">
        <!-- Illustration -->
        <div class="error-page__illustration">
          <Icon 
            :name="is404 ? 'lucide:file-question' : 'lucide:alert-circle'" 
            size="120" 
            class="error-page__icon"
          />
        </div>

        <!-- Error Code -->
        <div class="error-page__code">
          {{ error.statusCode }}
        </div>

        <!-- Title -->
        <h1 class="error-page__title">
          {{ errorTitle }}
        </h1>

        <!-- Message -->
        <p class="error-page__message">
          {{ errorMessage }}
        </p>

        <!-- Actions -->
        <div class="error-page__actions">
          <el-button 
            type="primary" 
            size="large"
            @click="goHome"
          >
            <Icon name="lucide:home" class="button-icon" />
            Go Home
          </el-button>
          
          <el-button 
            size="large"
            @click="goBack"
          >
            <Icon name="lucide:arrow-left" class="button-icon" />
            Go Back
          </el-button>
        </div>

        <!-- Additional Help for 404 -->
        <div v-if="is404" class="error-page__help">
          <p class="help-text">You might want to:</p>
          <ul class="help-links">
            <li>
              <NuxtLink to="/" class="help-link">
                <Icon name="lucide:house" size="16" />
                Visit Home Dashboard
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/workspaces" class="help-link">
                <Icon name="lucide:database" size="16" />
                Browse Apps
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--app-space-l);
  background: var(--app-bg-color-page);

  &__container {
    max-width: 600px;
    width: 100%;
  }

  &__content {
    text-align: center;
  }

  &__illustration {
    margin-bottom: var(--app-space-l);
    display: flex;
    justify-content: center;
  }

  &__icon {
    color: var(--app-text-color-placeholder);
    opacity: 0.6;
  }

  &__code {
    font-size: 120px;
    font-weight: var(--app-font-weight-title);
    line-height: 1;
    color: var(--app-primary-color);
    margin-bottom: var(--app-space-m);
    font-family: var(--app-font-family);
    opacity: 0.8;
  }

  &__title {
    margin: 0 0 var(--app-space-m) 0;
    font-size: var(--app-font-size-xxl);
    font-weight: var(--app-font-weight-title);
    color: var(--app-text-color-primary);
    line-height: 1.2;
  }

  &__message {
    margin: 0 0 var(--app-space-xl) 0;
    font-size: var(--app-font-size-l);
    color: var(--app-text-color-secondary);
    line-height: 1.6;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }

  &__actions {
    display: flex;
    justify-content: center;
    gap: var(--app-space-m);
    margin-bottom: var(--app-space-xl);
    flex-wrap: wrap;
  }

  &__help {
    margin-top: var(--app-space-xl);
    padding-top: var(--app-space-xl);
    border-top: 1px solid var(--app-border-color-light);
  }
}

.button-icon {
  margin-right: var(--app-space-xs);
}

.help-text {
  margin: 0 0 var(--app-space-m) 0;
  font-size: var(--app-font-size-m);
  color: var(--app-text-color-secondary);
}

.help-links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  justify-content: center;
  gap: var(--app-space-l);
  flex-wrap: wrap;
}

.help-link {
  display: inline-flex;
  align-items: center;
  gap: var(--app-space-xs);
  color: var(--app-primary-color);
  text-decoration: none;
  font-size: var(--app-font-size-m);
  transition: all 0.2s ease;
  padding: var(--app-space-xs) var(--app-space-s);
  border-radius: var(--app-border-radius-s);

  &:hover {
    background: var(--app-primary-alpha-10);
    color: var(--app-primary-color);
  }

  &:visited {
    color: var(--app-primary-color);
  }
}

// Responsive
@media (max-width: 768px) {
  .error-page {
    padding: var(--app-space-m);

    &__code {
      font-size: 80px;
    }

    &__title {
      font-size: var(--app-font-size-xl);
    }

    &__message {
      font-size: var(--app-font-size-m);
    }

    &__actions {
      flex-direction: column;
      align-items: stretch;

      .el-button {
        width: 100%;
      }
    }

    .help-links {
      flex-direction: column;
      align-items: center;
      gap: var(--app-space-m);
    }
  }
}
</style>

