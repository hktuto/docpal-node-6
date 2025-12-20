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
})