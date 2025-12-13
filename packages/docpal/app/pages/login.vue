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
  <div class="login-page">
    <div class="login-card">
      <h1 class="login-title">DocPal</h1>
      <p class="login-subtitle">Sign in to your account</p>
      
      <form @submit.prevent="handleSubmit" class="login-form">
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        
        <div class="form-group">
          <label for="username">Username</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            placeholder="Enter username"
            required
          />
        </div>
        
        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="Enter password"
            required
          />
        </div>
        
        <button type="submit" :disabled="loading" class="submit-button">
          {{ loading ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>
      
      <p class="login-note">
        POC: Use any username/password (mock auth)
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--app-bg-color-page);
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: var(--app-space-xxl);
  background: var(--app-paper);
  border-radius: var(--app-border-radius-l);
  box-shadow: var(--app-shadow-l);
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
  display: flex;
  flex-direction: column;
  gap: var(--app-space-m);
}

.error-message {
  padding: var(--app-space-m);
  background: var(--app-danger-alpha-10);
  border: 1px solid var(--app-danger-1);
  border-radius: var(--app-border-radius-m);
  color: var(--app-danger-color);
  font-size: var(--app-font-size-s);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-xs);
  
  label {
    font-size: var(--app-font-size-s);
    font-weight: var(--app-font-weight);
    color: var(--app-text-color-primary);
  }
  
  input {
    padding: var(--app-space-m);
    border: 1px solid var(--app-border-color);
    border-radius: var(--app-border-radius-m);
    font-size: var(--app-font-size-m);
    background: var(--app-paper);
    color: var(--app-text-color-primary);
    
    &:focus {
      outline: none;
      border-color: var(--app-primary-color);
    }
    
    &::placeholder {
      color: var(--app-text-color-placeholder);
    }
  }
}

.submit-button {
  padding: var(--app-space-m);
  background: var(--app-primary-color);
  color: white;
  border: none;
  border-radius: var(--app-border-radius-m);
  font-size: var(--app-font-size-m);
  font-weight: var(--app-font-weight);
  cursor: pointer;
  transition: all 150ms ease;
  
  &:hover:not(:disabled) {
    background: var(--app-primary-4);
    box-shadow: var(--app-shadow-primary-m);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
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

