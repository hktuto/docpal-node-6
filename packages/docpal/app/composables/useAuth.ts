/**
 * useAuth Composable
 * 
 * ONLY global state composable in the application.
 * Manages authentication state and provides auth methods.
 */

export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  role: string;
}
const useUser = () => useState<User | null>('auth_user', () => null);
const useToken = () => useState<string | null>('auth_token', () => null);
const useCompanies = () => useState<Company[]>('auth_companies', () => []);

export const useAuth = () => {
  // Global state (shared across all components)
  const user = useUser();
  const token = useToken();
  const companies = useCompanies();
  
  // Computed
  const isAuthenticated = computed(() => !!user.value);
  const currentCompany = computed(() => companies.value[0] || null);
  
  /**
   * Login user with credentials
   */
  const login = async (credentials: { username: string; password: string }) => {
    try {
      const data = await $fetch('/api/auth/login', {
        method: 'POST',
        body: credentials
      });
      
      user.value = data.user;
      token.value = data.token;
      companies.value = data.companies || [];
      
      // Persist token in localStorage
      if (process.client) {
        localStorage.setItem('auth_token', data.token);
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.data?.message || 'Login failed'
      };
    }
  };
  
  /**
   * Logout user and clear state
   */
  const logout = async () => {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Clear state
    user.value = null;
    token.value = null;
    companies.value = [];
    
    // Clear localStorage
    if (process.client) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('tabs'); // Clear tabs on logout
    }
  };
  
  /**
   * Restore session from localStorage token
   */
  const restoreSession = async () => {
    if (!process.client) return;
    
    const storedToken = localStorage.getItem('auth_token');
    if (!storedToken) return;
    
    try {
      const data = await $fetch('/api/auth/me');
      user.value = data.user;
      token.value = storedToken;
      companies.value = data.companies || [];
    } catch (error) {
      console.error('Session restore failed:', error);
      // Token invalid, clear it
      localStorage.removeItem('auth_token');
    }
  };
  
  return {
    // State
    user: readonly(user),
    token: readonly(token),
    companies: readonly(companies),
    
    // Computed
    isAuthenticated,
    currentCompany,
    
    // Methods
    login,
    logout,
    restoreSession
  };
};

