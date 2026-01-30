// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-30',
  devtools: { enabled: true },
  
  // Modules
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
    '@vueuse/nuxt',
    '@nuxt/eslint'
  ],

  // App Configuration
  app: {
    baseURL: '/scportal/',
    head: {
      title: 'SCPortal - Single-Cell Data Portal',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { 
          name: 'description', 
          content: 'Single-cell data portal aggregating resources from iAODE and LAIOR' 
        },
        { name: 'theme-color', content: '#059669' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/scportal/favicon.svg' }
      ]
    },
    pageTransition: { name: 'page', mode: 'out-in' }
  },

  // Color Mode Configuration
  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'dark'
  },

  // Runtime Configuration
  runtimeConfig: {
    public: {
      iaodeBaseUrl: 'https://peterponyu.github.io/iAODE',
      lioraBaseUrl: 'https://peterponyu.github.io/liora-ui'
    }
  },

  // SSR Configuration for Static Generation
  ssr: true,
  
  // Nitro Configuration for Static Deployment
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/']
    }
  },

  // TypeScript Configuration
  typescript: {
    strict: true,
    typeCheck: false  // Disabled to avoid vite-plugin-checker compatibility issues
  },

  // Experimental Features
  experimental: {
    payloadExtraction: false
  }
})
