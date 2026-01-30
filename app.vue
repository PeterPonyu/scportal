<template>
  <div class="min-h-screen bg-white dark:bg-dark-950 text-dark-900 dark:text-dark-100 transition-colors duration-300">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

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
