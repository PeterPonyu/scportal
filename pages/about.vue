<template>
  <div class="min-h-screen">
    <!-- Header -->
    <div class="bg-gradient-to-r from-dark-800 to-dark-900 py-16">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center gap-2 text-dark-400 text-sm mb-4">
          <NuxtLink to="/" class="hover:text-white transition-colors">Home</NuxtLink>
          <span>/</span>
          <span class="text-white">About</span>
        </div>
        <h1 class="text-4xl md:text-5xl font-bold text-white mb-4">
          About SCPortal
        </h1>
        <p class="text-dark-300 max-w-2xl text-lg">
          A portal aggregating single-cell analysis resources.
        </p>
      </div>
    </div>

    <!-- Content -->
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="max-w-4xl mx-auto">
        <!-- Introduction -->
        <section class="mb-16">
          <h2 class="text-2xl font-bold text-dark-900 dark:text-white mb-6">Overview</h2>
          <div class="prose dark:prose-invert max-w-none">
            <p class="text-dark-600 dark:text-dark-400 mb-4">
              <strong>SCPortal</strong> serves as a unified entry point for accessing single-cell analysis resources.
              It aggregates 683 datasets from two benchmark repositories — iAODE (617 datasets) and LAIOR (66 datasets) — along with 24 evaluation metrics for 23 models.
            </p>
            <p class="text-dark-600 dark:text-dark-400 mb-4">
              The portal links to two homogeneous benchmark dataset repositories: iAODE and LAIOR, both serving as standardized sources for single-cell model evaluation under different frameworks.
              All data remains hosted on the original project sites.
            </p>
          </div>
        </section>

        <!-- Data Sources -->
        <section class="mb-16">
          <h2 class="text-2xl font-bold text-dark-900 dark:text-white mb-6">Benchmark Repositories</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="p-6 rounded-2xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900">
              <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M3 5v14a9 3 0 0 0 18 0V5" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-dark-900 dark:text-white mb-2">iAODE</h3>
              <p class="text-sm text-dark-600 dark:text-dark-400 mb-4">
                Benchmark dataset repository with dataset browser and continuity explorer:
              </p>
              <ul class="text-sm text-dark-600 dark:text-dark-400 space-y-2">
                <li class="flex items-center gap-2">
                  <svg class="h-4 w-4 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  93 scATAC-seq studies (434 datasets)
                </li>
                <li class="flex items-center gap-2">
                  <svg class="h-4 w-4 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  20 scRNA-seq studies (183 datasets)
                </li>
                <li class="flex items-center gap-2">
                  <svg class="h-4 w-4 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Interactive trajectory explorer
                </li>
              </ul>
              <div class="flex flex-wrap gap-4 mt-4">
                <a
                  href="https://peterponyu.github.io/iAODE/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700"
                >
                  Online Browser
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" x2="21" y1="14" y2="3" />
                  </svg>
                </a>
                <a
                  href="https://github.com/PeterPonyu/iAODE"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-2 text-sm font-medium text-dark-600 dark:text-dark-400 hover:text-dark-700"
                >
                  GitHub
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
              </div>
            </div>

            <div class="p-6 rounded-2xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900">
              <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" x2="18" y1="20" y2="10" />
                  <line x1="12" x2="12" y1="20" y2="4" />
                  <line x1="6" x2="6" y1="20" y2="14" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-dark-900 dark:text-white mb-2">LAIOR</h3>
              <p class="text-sm text-dark-600 dark:text-dark-400 mb-4">
                Benchmark dataset repository with model evaluation dashboard:
              </p>
              <ul class="text-sm text-dark-600 dark:text-dark-400 space-y-2">
                <li class="flex items-center gap-2">
                  <svg class="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  23 models across 6 categories
                </li>
                <li class="flex items-center gap-2">
                  <svg class="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  24 evaluation metrics
                </li>
                <li class="flex items-center gap-2">
                  <svg class="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  66 datasets (48 scRNA-seq, 18 scATAC-seq)
                </li>
              </ul>
              <div class="flex flex-wrap gap-4 mt-4">
                <a
                  href="https://peterponyu.github.io/liora-ui/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                >
                  Online Dashboard
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" x2="21" y1="14" y2="3" />
                  </svg>
                </a>
                <a
                  href="https://github.com/PeterPonyu/Liora"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-2 text-sm font-medium text-dark-600 dark:text-dark-400 hover:text-dark-700"
                >
                  GitHub
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </section>

        <!-- Technology Stack -->
        <section class="mb-16">
          <h2 class="text-2xl font-bold text-dark-900 dark:text-white mb-6">Technology Stack</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div v-for="tech in technologies" :key="tech.name" class="p-4 rounded-xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 text-center">
              <div class="text-2xl mb-2">{{ tech.icon }}</div>
              <div class="font-medium text-dark-900 dark:text-white text-sm">{{ tech.name }}</div>
              <div class="text-xs text-dark-500">{{ tech.version }}</div>
            </div>
          </div>
        </section>

        <!-- Contact -->
        <section>
          <h2 class="text-2xl font-bold text-dark-900 dark:text-white mb-6">Contact & Resources</h2>
          <div class="p-6 rounded-2xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 class="font-semibold text-dark-900 dark:text-white mb-4">Author</h3>
                <p class="text-dark-600 dark:text-dark-400 mb-2">Zeyu Fu</p>
                <a href="mailto:fuzeyu99@126.com" class="text-primary-600 dark:text-primary-400 hover:underline text-sm">
                  fuzeyu99@126.com
                </a>
              </div>
              <div>
                <h3 class="font-semibold text-dark-900 dark:text-white mb-4">Links</h3>
                <ul class="space-y-2">
                  <li>
                    <a
                      href="https://github.com/PeterPonyu/scportal"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      SCPortal Repository
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://github.com/PeterPonyu/iAODE"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      iAODE Repository
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://github.com/PeterPonyu/Liora"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      LAIOR Repository
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Page metadata
useSeoMeta({
  title: 'About - SCPortal',
  description: 'About SCPortal - a portal for single-cell analysis resources'
})

const technologies = [
  { name: 'Nuxt', version: '3.15+', icon: 'N' },
  { name: 'Vue', version: '3.5+', icon: 'V' },
  { name: 'Tailwind CSS', version: '4.0', icon: 'T' },
  { name: 'TypeScript', version: '5.7+', icon: 'TS' }
]
</script>
