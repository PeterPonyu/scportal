<template>
  <section class="py-20 overflow-hidden">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Hero Content -->
      <div class="text-center max-w-4xl mx-auto mb-16">
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 text-sm font-medium mb-6">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
          </span>
          Unified Single-Cell Analysis Platform
        </div>
        
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
          <span class="text-dark-900 dark:text-white">Explore </span>
          <span class="bg-gradient-to-r from-primary-600 via-accent-500 to-primary-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
            Single-Cell Data
          </span>
          <br />
          <span class="text-dark-900 dark:text-white">Like Never Before</span>
        </h1>
        
        <p class="text-lg md:text-xl text-dark-600 dark:text-dark-400 mb-8 max-w-2xl mx-auto">
          A comprehensive platform combining iAODE Dataset Browser and LAIOR Benchmarking Dashboard 
          for exploring single-cell ATAC-seq and RNA-seq datasets with state-of-the-art models.
        </p>

        <div class="flex flex-wrap justify-center gap-4">
          <NuxtLink
            to="/datasets"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 text-white font-medium hover:from-primary-700 hover:to-accent-700 transition-all shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            Browse Datasets
          </NuxtLink>
          
          <NuxtLink
            to="/benchmarks"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-dark-200 dark:border-dark-700 text-dark-700 dark:text-dark-200 font-medium hover:bg-dark-100 dark:hover:bg-dark-800 transition-all hover:-translate-y-0.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
            View Benchmarks
          </NuxtLink>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
        <div v-for="stat in stats" :key="stat.label" class="text-center p-6 rounded-2xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-800">
          <div class="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
            {{ stat.value }}
          </div>
          <div class="text-sm text-dark-600 dark:text-dark-400 mt-1">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <!-- Background decoration -->
    <div class="absolute inset-0 -z-10 overflow-hidden">
      <div class="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary-500/10 blur-3xl" />
      <div class="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-accent-500/10 blur-3xl" />
    </div>
  </section>
</template>

<script setup lang="ts">
const stats = [
  { value: '100+', label: 'Datasets' },
  { value: '600+', label: 'Samples' },
  { value: '23+', label: 'Models' },
  { value: '50+', label: 'Metrics' }
]
</script>

<style scoped>
@keyframes gradient {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.animate-gradient {
  animation: gradient 3s ease infinite;
}
</style>
