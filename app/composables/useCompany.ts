/**
 * useCompany Composable
 * 
 * Provides access to the current company via Electric sync.
 * Data is synced from PostgreSQL and queried locally from PGlite.
 * 
 * Lifecycle: Auto-initializes when user logs in with a company, auto-cleans up on logout.
 */

import { getTableSchema } from '~/config/electric-schemas'

export const useCompany = () => {
  const { isAuthenticated, hasCompany } = useAuth()
  const { syncTable, watchQuery, getDB } = useSecureElectricSync()
  const companyState = useCompanyState()
  const company = ref<any>(null)
  const isLoading = ref(false)
  const isInitialized = ref(false)

  const initialize = async () => {
    // Don't init if not authenticated or no company
    if (!isAuthenticated.value || !hasCompany.value) {
      console.log('[useCompany] Not ready to initialize (auth:', isAuthenticated.value, 'hasCompany:', hasCompany.value, ')')
      return
    }

    if (isInitialized.value) {
      console.log('[useCompany] Already initialized')
      return
    }

    if (!companyState.value?.id) {
      console.warn('[useCompany] No company ID available')
      return
    }

    isLoading.value = true

    try {
      // 1. Create companies table schema in PGlite (fetched from server)
      const db = await getDB()
      
      console.log('[useCompany] Fetching companies schema...')
      const schema = await getTableSchema('companies')
      
      if (!schema) {
        throw new Error('Companies schema not found - check /api/electric/schemas endpoint')
      }
      
      console.log('[useCompany] Creating companies table in PGlite...')
      await db.exec(schema)
      console.log('[useCompany] ✓ Schema created successfully')

      // 2. Sync companies table (filtered to user's company on server)
      await syncTable('companies')
      console.log('[useCompany] Table synced')

      // 3. Watch for changes to this company
      const result = await watchQuery(`
        SELECT 
          id,
          name,
          slug,
          logo,
          description,
          created_by,
          created_at,
          updated_at
        FROM companies 
        WHERE id = $1
      `, [companyState.value?.id])

      company.value = result.value?.[0] || null
      isInitialized.value = true
      isLoading.value = false

      // 4. Reactively update company
      watch(result, (rows) => {
        company.value = rows?.[0] || null
      }, { deep: true })

      console.log('[useCompany] ✓ Initialized:', company.value?.name)

    } catch (error) {
      console.error('[useCompany] Failed to initialize:', error)
      isLoading.value = false
      throw error
    }
  }

  const cleanup = () => {
    console.log('[useCompany] Cleaning up on logout')
    company.value = null
    isInitialized.value = false
    isLoading.value = false
  }

  // Watch auth state - auto-initialize when user has company, cleanup on logout
  watch([isAuthenticated, hasCompany], ([authenticated, hasComp]) => {
    if (authenticated && hasComp && !isInitialized.value) {
      console.log('[useCompany] User authenticated with company, initializing Electric sync')
      initialize()
    } else if (!authenticated && isInitialized.value) {
      cleanup()
    }
  }, { immediate: true })

  return {
    company: readonly(company),
    isLoading: readonly(isLoading),
    initialize,
  }
}

