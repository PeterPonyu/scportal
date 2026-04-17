<template>
  <div class="min-h-screen bg-white dark:bg-dark-950 text-dark-900 dark:text-dark-100 transition-colors duration-300 font-sans">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const siteUrl = 'https://peterponyu.github.io'
const basePath = '/scportal'

useHead(() => {
  const routePath = route.path === '/' ? '' : route.path
  const canonical = `${siteUrl}${basePath}${routePath}`
  return {
    titleTemplate: (title?: string) =>
      title ? `${title} | SCPortal` : 'SCPortal | Single-Cell Discovery Hub',
    link: [
      { rel: 'canonical', href: canonical }
    ],
    meta: [
      { property: 'og:site_name', content: 'SCPortal' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: canonical },
      { name: 'twitter:card', content: 'summary_large_image' }
    ]
  }
})

// Handle GitHub Pages SPA redirect
if (import.meta.client) {
  const url = new URL(window.location.href)
  const redirectPath = url.searchParams.get('__spa_redirect')
  if (redirectPath) {
    url.searchParams.delete('__spa_redirect')
    const newPath = decodeURIComponent(redirectPath)
    // Use replaceState to clean up URL, then navigate
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
    navigateTo(newPath, { replace: true })
  }
}
</script>

<style>
/* Global styles */
html {
  scroll-behavior: smooth;
}

/* Page transitions */
.page-enter-active,
.page-leave-active {
  transition: all 0.3s ease-out;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
