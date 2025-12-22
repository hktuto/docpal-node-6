export default defineNuxtPlugin((nuxtApp) => {
    const api = $fetch.create({
      baseURL: '/api',
      onRequest ({ request, options, error }) {
        
      },
      async onResponse ({ response }) {
      },
      async onResponseError ({ response, request, options }) {
        if (response.status === 401) {
          // Skip redirect if the request has skip401Redirect option set to true
          // This can be set via: $api(url, { skip401Redirect: true })
          const skipRedirect = (options as any).skip401Redirect === true ||
                              (options.headers as any)?.['X-Skip-401-Redirect'] === 'true'
          
          if (!skipRedirect) {
            await nuxtApp.runWithContext(() => navigateTo('/auth/login'))
          }
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