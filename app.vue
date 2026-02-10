<template>
  <div class="min-h-screen bg-white dark:bg-dark-950 text-dark-900 dark:text-dark-100 transition-colors duration-300 font-sans">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
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
