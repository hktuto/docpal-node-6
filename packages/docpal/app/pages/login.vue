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
  background: var(--bg-secondary, #f8fafc);
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: var(--spacing-2xl, 48px);
  background: var(--bg-primary, #ffffff);
  border-radius: var(--border-radius-lg, 8px);
  box-shadow: var(--shadow-lg);
}

.login-title {
  font-size: var(--font-size-2xl, 24px);
  font-weight: var(--font-weight-bold, 700);
  text-align: center;
  margin-bottom: var(--spacing-sm, 8px);
  color: var(--text-primary, #0f172a);
}

.login-subtitle {
  font-size: var(--font-size-sm, 14px);
  text-align: center;
  color: var(--text-secondary, #475569);
  margin-bottom: var(--spacing-xl, 32px);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md, 16px);
}

.error-message {
  padding: var(--spacing-md, 16px);
  background: #fee;
  border: 1px solid #fcc;
  border-radius: var(--border-radius, 6px);
  color: var(--color-danger, #ef4444);
  font-size: var(--font-size-sm, 14px);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
  
  label {
    font-size: var(--font-size-sm, 14px);
    font-weight: var(--font-weight-medium, 500);
    color: var(--text-primary, #0f172a);
  }
  
  input {
    padding: var(--spacing-md, 16px) var(--spacing-md, 16px);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: var(--border-radius, 6px);
    font-size: var(--font-size-base, 16px);
    transition: border-color var(--transition-fast, 150ms ease);
    
    &:focus {
      outline: none;
      border-color: var(--color-primary, #3b82f6);
    }
    
    &::placeholder {
      color: var(--text-tertiary, #94a3b8);
    }
  }
}

.submit-button {
  padding: var(--spacing-md, 16px);
  background: var(--color-primary, #3b82f6);
  color: white;
  border: none;
  border-radius: var(--border-radius, 6px);
  font-size: var(--font-size-base, 16px);
  font-weight: var(--font-weight-medium, 500);
  cursor: pointer;
  transition: background var(--transition-fast, 150ms ease);
  
  &:hover:not(:disabled) {
    background: var(--color-primary-hover, #2563eb);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.login-note {
  margin-top: var(--spacing-lg, 24px);
  padding-top: var(--spacing-lg, 24px);
  border-top: 1px solid var(--border-color, #e2e8f0);
  text-align: center;
  font-size: var(--font-size-xs, 12px);
  color: var(--text-tertiary, #94a3b8);
}
</style>

