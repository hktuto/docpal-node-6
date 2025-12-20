/**
 * Company Context Plugin
 * 
 * Phase 1: Sets a dummy company ID in a cookie for all API requests
 * Phase 2+: Will use real session/auth to determine active company
 */
export default defineNuxtPlugin(() => {
  const companyIdCookie = useCookie('active_company_id', {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  })

  // Phase 1: Use dummy company if not set
  if (!companyIdCookie.value) {
    companyIdCookie.value = '00000000-0000-0000-0000-000000000001'
    console.log('[Company Context] Set dummy company ID:', companyIdCookie.value)
  } else {
    console.log('[Company Context] Using existing company ID:', companyIdCookie.value)
  }

  // Phase 2+: This will be replaced with:
  // const { user } = useUserSession()
  // companyIdCookie.value = user.value?.activeCompanyId
})

