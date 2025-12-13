<script setup lang="ts">
/**
 * Login Page
 * 
 * Simple login form that calls useAuth().login()
 * For POC: accepts any credentials (mock auth)
 */

definePageMeta({
  layout: 'auth',
  middleware: 'guest'
});

const { login } = useAuth();
const router = useRouter();
const route = useRoute();

const form = ref({
  username: '',
  password: ''
});

const loading = ref(false);
const error = ref('');

const handleSubmit = async () => {
  loading.value = true;
  error.value = '';
  
  const result = await login(form.value);
  
  loading.value = false;
  
  if (result.success) {
    // Redirect to /app or to the redirect param if exists
    const redirect = route.query.redirect as string || '/app';
    router.push(redirect);
  } else {
    error.value = result.message || 'Login failed';
  }
};
</script>

<template>
  <div class="login-card glass">
    <h1 class="login-title">DocPal</h1>
    <p class="login-subtitle">Sign in to your account</p>
    
    <el-form 
      @submit.prevent="handleSubmit" 
      class="login-form"
      :model="form"
      label-position="top"
    >
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        :closable="false"
        show-icon
        class="error-alert"
      />
      
      <el-form-item label="Username" prop="username" required>
        <el-input
          v-model="form.username"
          placeholder="Enter username"
          size="large"
          :disabled="loading"
        />
      </el-form-item>
      
      <el-form-item label="Password" prop="password" required>
        <el-input
          v-model="form.password"
          type="password"
          placeholder="Enter password"
          size="large"
          :disabled="loading"
          show-password
        />
      </el-form-item>
      
      <el-form-item>
        <el-button
          type="primary"
          native-type="submit"
          :loading="loading"
          size="large"
          style="width: 100%"
        >
          {{ loading ? 'Signing in...' : 'Sign in' }}
        </el-button>
      </el-form-item>
    </el-form>
    
    <p class="login-note">
      POC: Use any username/password (mock auth)
    </p>
  </div>
</template>

<style scoped lang="scss">
.login-card {
  width: 100%;
  max-width: 400px;
  padding: var(--app-space-xxl);
  border-radius: var(--app-border-radius-l);
}

.login-title {
  font-size: var(--app-font-size-xxl);
  font-weight: var(--app-font-weight-title);
  text-align: center;
  margin-bottom: var(--app-space-s);
  color: var(--app-text-color-primary);
}

.login-subtitle {
  font-size: var(--app-font-size-s);
  text-align: center;
  color: var(--app-text-color-secondary);
  margin-bottom: var(--app-space-xl);
}

.login-form {
  :deep(.el-form-item) {
    margin-bottom: var(--app-space-m);
  }
  
  :deep(.el-form-item__label) {
    font-size: var(--app-font-size-s);
    color: var(--app-text-color-primary);
    font-weight: var(--app-font-weight);
    margin-bottom: var(--app-space-xs);
  }
  
  :deep(.el-input__wrapper) {
    background: var(--app-paper);
    box-shadow: none;
    border: 1px solid var(--app-border-color);
    border-radius: var(--app-border-radius-m);
    
    &:hover {
      border-color: var(--app-border-color-dark);
    }
    
    &.is-focus {
      border-color: var(--app-primary-color);
      box-shadow: 0 0 0 1px var(--app-primary-alpha-30);
    }
  }
  
  :deep(.el-input__inner) {
    color: var(--app-text-color-primary);
    
    &::placeholder {
      color: var(--app-text-color-placeholder);
    }
  }
}

.error-alert {
  margin-bottom: var(--app-space-m);
}

.login-note {
  margin-top: var(--app-space-l);
  padding-top: var(--app-space-l);
  border-top: 1px solid var(--app-border-color);
  text-align: center;
  font-size: var(--app-font-size-xs);
  color: var(--app-text-color-secondary);
}
</style>

