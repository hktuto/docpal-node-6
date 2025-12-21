export default defineNuxtPlugin((nuxtApp) => {
    const api = $fetch.create({
      baseURL: '/api',
      onRequest ({ request, options, error }) {
        
      },
      async onResponse ({ response }) {
      },
      async onResponseError ({ response }) {
        if (response.status === 401) {
          await nuxtApp.runWithContext(() => navigateTo('/auth/login'))
        }
      },
    })
  
    // Expose to useNuxtApp().$api
    return {
      provide: {
        api,
      },
    }
  })