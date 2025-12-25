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
  
  // Vite configuration for PGlite WASM support
  vite: {
    optimizeDeps: {
      // Exclude PGlite from optimization to preserve WASM loading
      exclude: ['@electric-sql/pglite'],
    },
    worker: {
      // Worker format for SharedWorker support
      format: 'es',
    },
    // Ensure WASM files are handled correctly
    assetsInclude: ['**/*.wasm'],
  },
})