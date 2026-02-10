<template>
  <div>
    <!-- Hero Section -->
    <HeroSection />

    <!-- Features Section -->
    <section class="py-20 bg-dark-50 dark:bg-dark-900/50">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="text-3xl md:text-4xl font-bold text-dark-900 dark:text-white mb-4">
            Available Resources
          </h2>
          <p class="text-dark-600 dark:text-dark-400 max-w-2xl mx-auto">
            SCPortal provides access to single-cell datasets and evaluation metrics
            through unified navigation.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- iAODE Dataset Browser -->
          <FeatureCard
            title="Dataset Collection"
            description="Access 683 single-cell ATAC-seq and RNA-seq datasets from iAODE (617) and LAIOR (66) benchmark repositories. Standardized in 10X h5 format."
            to="/datasets"
            link-text="Browse Datasets"
            variant="primary"
            :stats="[
              { label: 'iAODE', value: '617' },
              { label: 'LAIOR', value: '66' }
            ]"
          >
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v14a9 3 0 0 0 18 0V5" />
                <path d="M3 12a9 3 0 0 0 18 0" />
              </svg>
            </template>
          </FeatureCard>

          <!-- iAODE Continuity Explorer -->
          <FeatureCard
            title="Trajectory Explorer"
            description="Explore trajectory structures and continuity metrics across PCA, UMAP, and t-SNE embedding methods."
            to="/explorer"
            link-text="Launch Explorer"
            variant="accent"
            :stats="[
              { label: 'Methods', value: '3' },
              { label: 'Trajectories', value: '4' }
            ]"
          >
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
            </template>
          </FeatureCard>

          <!-- LAIOR Benchmarking -->
          <FeatureCard
            title="Evaluation Metrics"
            description="24 evaluation metrics across 4 categories for benchmarking 23 single-cell analysis models on 66 datasets."
            to="/benchmarks"
            link-text="View Metrics"
            variant="emerald"
            :stats="[
              { label: 'Models', value: '23' },
              { label: 'Metrics', value: '24' }
            ]"
          >
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" x2="18" y1="20" y2="10" />
                <line x1="12" x2="12" y1="20" y2="4" />
                <line x1="6" x2="6" y1="20" y2="14" />
              </svg>
            </template>
          </FeatureCard>

          <!-- Model Catalog -->
          <FeatureCard
            title="Model Catalog"
            description="Documentation for 23 models across 6 categories with architecture details and evaluation metrics."
            to="/models"
            link-text="View Models"
            variant="purple"
            :stats="[
              { label: 'Categories', value: '6' },
              { label: 'Models', value: '23' }
            ]"
          >
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </template>
          </FeatureCard>

          <!-- Metrics Reference -->
          <FeatureCard
            title="Metrics Reference"
            description="Reference library explaining 24 evaluation metrics with definitions and use cases."
            to="/benchmarks#metrics"
            link-text="View Metrics"
            variant="primary"
          >
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </template>
          </FeatureCard>

          <!-- Statistics -->
          <FeatureCard
            title="Dataset Statistics"
            description="Statistics and visualizations of dataset distributions, cell counts, and peak numbers."
            href="https://peterponyu.github.io/iAODE/statistics/"
            link-text="View Statistics"
            variant="accent"
          >
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                <path d="M2 12h20" />
              </svg>
            </template>
          </FeatureCard>
        </div>
      </div>
    </section>

    <!-- Data Sources Section -->
    <section class="py-20">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="text-3xl md:text-4xl font-bold text-dark-900 dark:text-white mb-4">
            Data Modalities
          </h2>
          <p class="text-dark-600 dark:text-dark-400 max-w-2xl mx-auto">
            Comprehensive coverage of single-cell omics data types
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <!-- scATAC-seq -->
          <div class="relative p-8 rounded-2xl border border-dark-200 dark:border-dark-800 bg-gradient-to-br from-primary-50 to-white dark:from-primary-950/30 dark:to-dark-900">
            <div class="flex items-center gap-4 mb-4">
              <div class="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-500 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.5 20.5 10 18a2 2 0 0 1 2-2h.5" />
                  <path d="M20.5 10.5 18 10a2 2 0 0 1-2 2v.5" />
                  <path d="M13.5 3.5 14 6a2 2 0 0 1-2 2h-.5" />
                  <path d="M3.5 13.5 6 14a2 2 0 0 1 2-2v-.5" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <div>
                <h3 class="text-xl font-bold text-dark-900 dark:text-white">scATAC-seq</h3>
                <p class="text-sm text-dark-500">Chromatin Accessibility</p>
              </div>
            </div>
            <ul class="space-y-2 text-sm text-dark-600 dark:text-dark-400">
              <li class="flex items-center gap-2">
                <svg class="h-4 w-4 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                iAODE: 93 studies, 434 datasets
              </li>
              <li class="flex items-center gap-2">
                <svg class="h-4 w-4 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                LAIOR: 18 datasets
              </li>
              <li class="flex items-center gap-2">
                <svg class="h-4 w-4 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Total: 452 datasets
              </li>
              <li class="flex items-center gap-2">
                <svg class="h-4 w-4 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Peak accessibility analysis
              </li>
            </ul>
          </div>

          <!-- scRNA-seq -->
          <div class="relative p-8 rounded-2xl border border-dark-200 dark:border-dark-800 bg-gradient-to-br from-accent-50 to-white dark:from-accent-950/30 dark:to-dark-900">
            <div class="flex items-center gap-4 mb-4">
              <div class="flex h-14 w-14 items-center justify-center rounded-xl bg-accent-500 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                  <line x1="12" x2="12" y1="2" y2="12" />
                </svg>
              </div>
              <div>
                <h3 class="text-xl font-bold text-dark-900 dark:text-white">scRNA-seq</h3>
                <p class="text-sm text-dark-500">Gene Expression</p>
              </div>
            </div>
            <ul class="space-y-2 text-sm text-dark-600 dark:text-dark-400">
              <li class="flex items-center gap-2">
                <svg class="h-4 w-4 text-accent-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                iAODE: 20 studies, 183 datasets
              </li>
              <li class="flex items-center gap-2">
                <svg class="h-4 w-4 text-accent-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                LAIOR: 48 datasets
              </li>
              <li class="flex items-center gap-2">
                <svg class="h-4 w-4 text-accent-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Total: 231 datasets
              </li>
              <li class="flex items-center gap-2">
                <svg class="h-4 w-4 text-accent-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Gene expression profiling
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-20 bg-gradient-to-br from-primary-600 to-accent-600">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">
          Start Exploring
        </h2>
        <p class="text-primary-100 max-w-2xl mx-auto mb-8">
          Access single-cell datasets and evaluation metrics.
        </p>
        <div class="flex flex-wrap justify-center gap-4">
          <NuxtLink
            to="/datasets"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-primary-700 font-medium hover:bg-primary-50 transition-colors"
          >
            Browse Datasets
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </NuxtLink>
          <a
            href="https://github.com/PeterPonyu/scportal"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-white/30 text-white font-medium hover:bg-white/10 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Page metadata
useSeoMeta({
  title: 'SCPortal - Single-Cell Data Portal',
  description: 'Single-cell data portal aggregating iAODE dataset browser and LAIOR benchmarking evaluation metrics'
})
</script>
