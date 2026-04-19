<template>
  <div class="min-h-screen bg-white dark:bg-dark-950 text-dark-900 dark:text-dark-100 transition-colors duration-300 font-sans">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl.replace(/\/+$/, '')

const buildCanonicalUrl = (routePath: string) => {
  const normalizedPath = routePath === '/' ? '' : `${routePath.replace(/^\/+/, '').replace(/\/+$/, '')}/`
  return new URL(normalizedPath, `${siteUrl}/`).toString()
}

useHead(() => {
  const canonical = buildCanonicalUrl(route.path)
  return {
    titleTemplate: (title?: string) => {
      if (!title) {
        return 'SCPortal | Single-Cell Discovery Hub'
      }

      const normalizedTitle = title
        .trim()
        .replace(/\s*[-|]\s*SCPortal\s*$/i, '')

      return normalizedTitle
        ? `${normalizedTitle} | SCPortal`
        : 'SCPortal | Single-Cell Discovery Hub'
    },
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
