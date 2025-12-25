import { initDocpalDB } from './useDocpalDB'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  avatar: string | null
  emailVerifiedAt: Date | null
}

export interface AuthCompany {
  id: string
  name: string
  slug: string
  role: string
}

export interface AuthState {
  user: AuthUser | null
  company: AuthCompany | null
}

/**
 * Auth composable for managing authentication state
 */
export const useUserState = () => useState<AuthUser | null>('auth:user', () => null)
export const useCompanyState = () => useState<AuthCompany | null>('auth:company', () => null)
export const useAuth = () => {
  const user = useUserState()
  const company = useCompanyState()
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)
  const hasCompany = computed(() => !!company.value)
  const {$api} = useNuxtApp()
  /**
   * Fetch current user from server
   * Uses getData() for automatic caching via SharedWorker
   */
  const fetchUser = async (options?: { skip401Redirect?: boolean, skipCache?: boolean }) => {
    try {
      loading.value = true
      error.value = null
      
      const { getData } = useDocpalDB()
      const result = await getData<{ user: AuthUser, company: AuthCompany }>(
        '/api/auth/me',
        { forceRefresh: options?.skipCache }
      )
      
      console.log('[Auth] getData:', result.source, result.fresh)
      
      if (result.data) {
        user.value = {
          ...result.data.user,
          emailVerifiedAt: result.data.user.emailVerifiedAt 
            ? new Date(result.data.user.emailVerifiedAt) 
            : null,
        }
        company.value = result.data.company
      } else {
        user.value = null
        company.value = null
      }
    } catch (e) {
      console.error('[Auth] fetchUser failed:', e)
      user.value = null
      company.value = null
    } finally {
      loading.value = false
    }
  }

  /**
   * Login with email and password
   */
  const login = async (email: string, password: string) => {
    try {
      loading.value = true
      error.value = null

      const response = await $api<SuccessResponse<{
        user: AuthUser
        session: { token: string; expiresAt: Date }
      }>>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      })

      user.value = response.data.user
      
      // Fetch full user data including company
      await fetchUser({ skipCache: true }) // Skip cache on fresh login
      
      // Initialize worker and sync essential data (non-blocking)
      initDocpalDB()
      syncEssentialDataInBackground()

      return { success: true }
    } catch (e: any) {
      error.value = e.data?.message || 'Login failed'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Sync essential data to worker in background
   */
  const syncEssentialDataInBackground = () => {
    try {
      const { syncEssentialData } = useDocpalDB()
      syncEssentialData().catch(e => {
        console.warn('[Auth] Background sync failed:', e)
      })
    } catch (e) {
      console.warn('[Auth] Worker not available for sync:', e)
    }
  }

  /**
   * Send magic link to email
   */
  const sendMagicLink = async (email: string) => {
    try {
      loading.value = true
      error.value = null

      await $api('/api/auth/magic-link/send', {
        method: 'POST',
        body: { email },
      })

      return { success: true }
    } catch (e: any) {
      error.value = e.data?.message || 'Failed to send magic link'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * Verify magic link token
   */
  const verifyMagicLink = async (token: string) => {
    try {
      loading.value = true
      error.value = null

      const response = await $api<SuccessResponse<{
        user: AuthUser
        session: { token: string; expiresAt: Date }
      }>>('/api/auth/magic-link/verify', {
        method: 'POST',
        body: { token },
      })

      user.value = response.data.user

      // Fetch full user data including company
      await fetchUser({ skipCache: true }) // Skip cache on fresh login
      
      // Initialize worker and sync essential data (non-blocking)
      initDocpalDB()
      syncEssentialDataInBackground()

      return { success: true }
    } catch (e: any) {
      error.value = e.data?.message || 'Invalid or expired magic link'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * Logout
   */
  const logout = async () => {
    try {
      loading.value = true
      await $api('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      console.error('Logout error:', e)
    } finally {
      user.value = null
      company.value = null
      loading.value = false
      
      // Redirect to login
      await navigateTo('/auth/login')
    }
  }

  /**
   * Switch company
   */
  const switchCompany = async (companyId: string) => {
    try {
      loading.value = true
      error.value = null

      await $api('/api/companies/switch', {
        method: 'POST',
        body: { companyId },
      })

      // Refresh user data
      await fetchUser()

      return { success: true }
    } catch (e: any) {
      error.value = e.data?.message || 'Failed to switch company'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * Accept company invite
   */
  const acceptInvite = async (inviteCode: string) => {
    try {
      loading.value = true
      error.value = null

      const response = await $api<any>('/api/companies/invites/accept', {
        method: 'POST',
        body: { inviteCode },
      })

      // Update company state with the returned company data
      if (response.data?.company) {
        company.value = {
          id: response.data.company.id,
          name: response.data.company.name,
          slug: response.data.company.slug,
          role: response.data.company.role,
        }
      }

      // Refresh user data to ensure everything is in sync
      await fetchUser({ skip401Redirect: true })

      return { success: true }
    } catch (e: any) {
      error.value = e.data?.message || 'Failed to accept invite'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    user: readonly(user),
    company: readonly(company),
    loading: readonly(loading),
    error: readonly(error),
    
    // Computed
    isAuthenticated,
    hasCompany,
    
    // Methods
    fetchUser,
    login,
    sendMagicLink,
    verifyMagicLink,
    logout,
    switchCompany,
    acceptInvite,
  }
}

