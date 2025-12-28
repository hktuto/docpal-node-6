/**
 * useUsers Composable
 * 
 * Provides access to the current user's data via Electric sync.
 * Data is synced from PostgreSQL and queried locally from PGlite.
 * 
 * POC: Currently only syncs the current user's own data.
 * TODO: Implement permission-based user syncing for collaboration features.
 * 
 * Lifecycle: Auto-initializes when user logs in, auto-cleans up on logout.
 */

import { getTableSchema } from '~/config/electric-schemas'

export const useUsers = () => {
  const { isAuthenticated } = useAuth()
  const { syncTable, watchQuery, getDB } = useSecureElectricSync()
  
  const users = ref<any[]>([])
  const isLoading = ref(false)
  const isInitialized = ref(false)

  const initialize = async () => {
    // Don't init if not authenticated
    if (!isAuthenticated.value) {
      console.log('[useUsers] Not authenticated, skipping initialization')
      return
    }

    if (isInitialized.value) {
      console.log('[useUsers] Already initialized')
      return
    }

    isLoading.value = true

    try {
      // 1. Create users table schema in PGlite (fetched from server)
      const db = await getDB()
      
      console.log('[useUsers] Fetching users schema...')
      const schema = await getTableSchema('users')
      
      if (!schema) {
        throw new Error('Users schema not found - check /api/electric/schemas endpoint')
      }
      
      console.log('[useUsers] Creating users table in PGlite...')
      await db.exec(schema)
      console.log('[useUsers] ✓ Schema created successfully')

      // 2. Sync users table (filtered by current user ID on server)
      await syncTable('users')
      console.log('[useUsers] Table synced (current user only)')

      // 3. Watch for changes
      const result = await watchQuery(`
        SELECT 
          id,
          email,
          name,
          avatar,
          email_verified_at,
          last_login_at,
          created_at,
          updated_at
        FROM users 
        ORDER BY name ASC
      `)

      users.value = result.value || []
      isInitialized.value = true
      isLoading.value = false

      // 4. Reactively update users
      watch(result, (newUsers) => {
        users.value = newUsers || []
      }, { deep: true })

      console.log('[useUsers] ✓ Initialized with', users.value.length, 'user(s)')

    } catch (error) {
      console.error('[useUsers] Failed to initialize:', error)
      isLoading.value = false
      throw error
    }
  }

  const cleanup = () => {
    console.log('[useUsers] Cleaning up on logout')
    users.value = []
    isInitialized.value = false
    isLoading.value = false
  }

  // Watch auth state - auto-initialize on login, cleanup on logout
  watch(isAuthenticated, (authenticated) => {
    if (authenticated && !isInitialized.value) {
      console.log('[useUsers] User authenticated, initializing Electric sync')
      initialize()
    } else if (!authenticated && isInitialized.value) {
      cleanup()
    }
  }, { immediate: true })

  /**
   * Get current user (the only synced user)
   */
  const currentUser = computed(() => users.value[0] || null)

  /**
   * Get user by ID
   */
  const getUserById = (userId: string | null | undefined) => {
    if (!userId) return null
    return computed(() => users.value.find(u => u.id === userId))
  }

  /**
   * Get user by email
   */
  const getUserByEmail = (email: string) => {
    return computed(() => users.value.find(u => u.email === email))
  }

  /**
   * Search users by name or email
   */
  const searchUsers = (query: string) => {
    const lowerQuery = query.toLowerCase()
    return computed(() => 
      users.value.filter(u => 
        u.name?.toLowerCase().includes(lowerQuery) ||
        u.email?.toLowerCase().includes(lowerQuery)
      )
    )
  }

  return {
    users: readonly(users),
    currentUser: readonly(currentUser),
    isLoading: readonly(isLoading),
    getUserById,
    getUserByEmail,
    searchUsers,
    initialize,
  }
}

