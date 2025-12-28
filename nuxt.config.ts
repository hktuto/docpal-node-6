// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  app:{
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' },
  },
  devtools: { enabled: true },
  modules: ['@element-plus/nuxt', '@nuxthub/core', '@nuxt/icon'],
  hub:{
    blob: false,
    db: 'postgresql',
    dir: '.data'
  },
  css: ['@/assets/style/main.scss'],
  
  // Runtime config
  runtimeConfig: {
    // Private server-side config (not exposed to client)
    electricUrl: process.env.ELECTRIC_URL || 'http://localhost:30000',
    
    // Public config (available to client)
    public: {
      // No Electric URL needed on client anymore!
    }
  },
  
  // Vite configuration for ElectricSQL/PGlite
  vite: {
    optimizeDeps: {
      // Exclude PGlite packages from optimization (they contain WASM files)
      exclude: [
        '@electric-sql/pglite',
        '@electric-sql/pglite-sync'
      ]
    }
  }
})