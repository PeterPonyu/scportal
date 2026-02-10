<template>
  <section class="relative py-20 overflow-hidden">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid gap-10 lg:grid-cols-12 lg:items-center">
        <div class="lg:col-span-7">
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100/80 dark:bg-primary-950 text-primary-700 dark:text-primary-300 text-sm font-semibold tracking-wide mb-6">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
            </span>
            Unified Single-Cell Gateway
          </div>

          <h1 class="text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight">
            <span class="text-dark-900 dark:text-white">SCPortal</span>
            <br />
            <span class="bg-gradient-to-r from-primary-600 via-accent-500 to-primary-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              Dataset + Continuity Hub
            </span>
          </h1>

          <p class="text-lg md:text-xl text-dark-600 dark:text-dark-400 mt-6 max-w-2xl">
            Navigate curated single-cell datasets, continuity simulations, and LAIOR benchmarking metrics from one focused, research-first portal.
          </p>

          <div class="flex flex-wrap gap-4 mt-8">
            <NuxtLink
              to="/datasets"
              class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 text-white font-semibold hover:from-primary-700 hover:to-accent-700 transition-all shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              Dataset Browser
            </NuxtLink>
            <NuxtLink
              to="/explorer"
              class="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-dark-200 dark:border-dark-700 text-dark-700 dark:text-dark-200 font-semibold hover:bg-dark-100 dark:hover:bg-dark-800 transition-all hover:-translate-y-0.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
              Continuity Explorer
            </NuxtLink>
            <NuxtLink
              to="/benchmarks"
              class="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-primary-200/70 dark:border-primary-800 text-primary-700 dark:text-primary-200 font-semibold hover:bg-primary-50/60 dark:hover:bg-primary-950/40 transition-all"
            >
              Metrics Library
            </NuxtLink>
          </div>

          <div class="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <NuxtLink
              v-for="stat in stats"
              :key="stat.label"
              :to="stat.to"
              class="rounded-2xl border border-dark-200/80 dark:border-dark-800 bg-white/80 dark:bg-dark-900/80 px-4 py-5 text-center transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/10 hover:-translate-y-1"
            >
              <div class="text-2xl md:text-3xl font-semibold text-dark-900 dark:text-white">
                {{ stat.value }}
              </div>
              <div class="text-xs uppercase tracking-widest text-dark-500 dark:text-dark-400 mt-2">{{ stat.label }}</div>
            </NuxtLink>
          </div>
        </div>

        <div class="lg:col-span-5">
          <div class="space-y-4">
            <NuxtLink
              to="/datasets"
              class="block rounded-2xl border border-primary-200/80 dark:border-primary-900 bg-gradient-to-br from-primary-50 via-white to-white dark:from-primary-950/40 dark:via-dark-900 dark:to-dark-900 p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs uppercase tracking-widest text-primary-600 dark:text-primary-300">Dataset Browser</p>
                  <h3 class="text-xl font-semibold text-dark-900 dark:text-white mt-2">iAODE + LAIOR Collections</h3>
                  <p class="text-sm text-dark-600 dark:text-dark-400 mt-2">683 datasets across ATAC-seq and RNA-seq modalities.</p>
                </div>
                <span class="text-primary-600 dark:text-primary-300 text-2xl">→</span>
              </div>
            </NuxtLink>

            <NuxtLink
              to="/explorer"
              class="block rounded-2xl border border-accent-200/80 dark:border-accent-900 bg-gradient-to-br from-accent-50 via-white to-white dark:from-accent-950/40 dark:via-dark-900 dark:to-dark-900 p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs uppercase tracking-widest text-accent-600 dark:text-accent-300">Continuity Explorer</p>
                  <h3 class="text-xl font-semibold text-dark-900 dark:text-white mt-2">Trajectory Dynamics Lab</h3>
                  <p class="text-sm text-dark-600 dark:text-dark-400 mt-2">Compare PCA, UMAP, t-SNE across simulated trajectories.</p>
                </div>
                <span class="text-accent-600 dark:text-accent-300 text-2xl">→</span>
              </div>
            </NuxtLink>

            <NuxtLink
              to="/benchmarks"
              class="block rounded-2xl border border-dark-200/80 dark:border-dark-800 bg-white/90 dark:bg-dark-900/80 p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs uppercase tracking-widest text-dark-500 dark:text-dark-400">LAIOR Benchmarks</p>
                  <h3 class="text-xl font-semibold text-dark-900 dark:text-white mt-2">24 Metrics, 23 Models</h3>
                  <p class="text-sm text-dark-600 dark:text-dark-400 mt-2">Evaluation dashboards for model comparisons.</p>
                </div>
                <span class="text-dark-500 dark:text-dark-300 text-2xl">→</span>
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <div class="absolute inset-0 -z-10 overflow-hidden">
      <div class="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-primary-500/10 blur-3xl" />
      <div class="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-accent-500/10 blur-3xl" />
      <div class="absolute top-10 left-1/3 h-56 w-56 rounded-full bg-primary-300/10 blur-3xl" />
    </div>
  </section>
</template>

<script setup lang="ts">
const stats = [
  { value: '683', label: 'Datasets', to: '/datasets' },
  { value: '23', label: 'Models', to: '/models' },
  { value: '24', label: 'Metrics', to: '/benchmarks' },
  { value: '6', label: 'Categories', to: '/models' }
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
