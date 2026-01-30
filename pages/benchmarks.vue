<template>
  <div class="min-h-screen">
    <!-- Header -->
    <div class="bg-gradient-to-r from-emerald-600 to-teal-600 py-16">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center gap-2 text-emerald-100 text-sm mb-4">
          <NuxtLink to="/" class="hover:text-white transition-colors">Home</NuxtLink>
          <span>/</span>
          <span class="text-white">Benchmarks</span>
        </div>
        <h1 class="text-4xl md:text-5xl font-bold text-white mb-4">
          Benchmarking Results
        </h1>
        <p class="text-emerald-100 max-w-2xl text-lg">
          SCPortal aggregates benchmarking data for 23 single-cell analysis models evaluated across 24 metrics and 66 datasets.
        </p>
      </div>
    </div>

    <!-- Content -->
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <!-- Stats Overview -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        <div v-for="stat in stats" :key="stat.label" class="p-6 rounded-2xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 text-center">
          <div class="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            {{ stat.value }}
          </div>
          <div class="text-sm text-dark-600 dark:text-dark-400 mt-1">{{ stat.label }}</div>
        </div>
      </div>

      <!-- External Link Notice -->
      <div class="mb-8 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
        <div class="flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <div>
            <h3 class="font-medium text-emerald-900 dark:text-emerald-100">Full LAIOR Dashboard</h3>
            <p class="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
              For interactive charts, detailed comparisons, and full filtering capabilities,
              visit the LAIOR Benchmarking Dashboard.
            </p>
            <a
              href="https://peterponyu.github.io/liora-ui"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 mt-3 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
            >
              Open Full Dashboard
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" x2="21" y1="14" y2="3" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <!-- Metric Categories -->
      <div class="mb-12" id="metrics">
        <h2 class="text-2xl font-bold text-dark-900 dark:text-white mb-6">Evaluation Metrics</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            v-for="category in metricCategories"
            :key="category.name"
            class="p-6 rounded-2xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900"
          >
            <div
              class="flex h-12 w-12 items-center justify-center rounded-xl mb-4"
              :class="category.bgClass"
            >
              <component :is="category.icon" class="h-6 w-6 text-white" />
            </div>
            <h3 class="font-semibold text-dark-900 dark:text-white mb-2">{{ category.name }}</h3>
            <ul class="text-sm text-dark-600 dark:text-dark-400 space-y-1">
              <li v-for="metric in category.metrics" :key="metric" class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                {{ metric }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Model Categories Overview -->
      <div class="mb-12">
        <h2 class="text-2xl font-bold text-dark-900 dark:text-white mb-6">Model Categories</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="category in modelCategories"
            :key="category.name"
            class="p-6 rounded-2xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900"
          >
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-dark-900 dark:text-white">{{ category.name }}</h3>
              <span class="text-sm text-dark-500">{{ category.count }} models</span>
            </div>
            <p class="text-sm text-dark-600 dark:text-dark-400 mb-4">{{ category.description }}</p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="model in category.models"
                :key="model"
                class="inline-flex px-2 py-1 text-xs font-medium rounded-md bg-dark-100 dark:bg-dark-800 text-dark-700 dark:text-dark-300"
              >
                {{ model }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Sources -->
      <div class="mb-12">
        <h2 class="text-2xl font-bold text-dark-900 dark:text-white mb-6">Data Sources</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="p-6 rounded-2xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900">
            <h3 class="font-semibold text-dark-900 dark:text-white mb-2">LAIOR Benchmark</h3>
            <p class="text-sm text-dark-600 dark:text-dark-400 mb-4">
              Model evaluation results with 24 metrics across 66 datasets (48 RNA, 18 ATAC).
            </p>
            <a
              href="https://peterponyu.github.io/liora-ui/"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
            >
              View LAIOR Dashboard
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" x2="21" y1="14" y2="3" />
              </svg>
            </a>
          </div>
          <div class="p-6 rounded-2xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900">
            <h3 class="font-semibold text-dark-900 dark:text-white mb-2">iAODE Dataset Collection</h3>
            <p class="text-sm text-dark-600 dark:text-dark-400 mb-4">
              Source datasets used in benchmarking from 113 studies (617 datasets total).
            </p>
            <a
              href="https://peterponyu.github.io/iAODE/"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700"
            >
              View iAODE Browser
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" x2="21" y1="14" y2="3" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="flex flex-wrap justify-center gap-4">
        <a
          href="https://peterponyu.github.io/liora-ui/"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25"
        >
          LAIOR Dashboard
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" x2="21" y1="14" y2="3" />
          </svg>
        </a>
        <a
          href="https://peterponyu.github.io/iAODE/"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 text-white font-medium hover:from-primary-700 hover:to-accent-700 transition-all shadow-lg shadow-primary-500/25"
        >
          iAODE Browser
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" x2="21" y1="14" y2="3" />
          </svg>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Page metadata
useSeoMeta({
  title: 'Benchmarking Dashboard - SCPortal',
  description: 'Benchmarking results comparing single-cell analysis models'
})

const stats = [
  { value: '23', label: 'Models' },
  { value: '66', label: 'Datasets' },
  { value: '24', label: 'Metrics' },
  { value: '6', label: 'Categories' }
]

// Metric icons
const ClusteringIcon = defineComponent({
  render() {
    return h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
      h('circle', { cx: '6', cy: '6', r: '3' }),
      h('circle', { cx: '18', cy: '18', r: '3' }),
      h('path', { d: 'M8.59 13.51 15.42 17.49' }),
      h('path', { d: 'M15.41 6.51 8.59 10.49' }),
      h('circle', { cx: '18', cy: '6', r: '3' }),
      h('circle', { cx: '6', cy: '18', r: '3' })
    ])
  }
})

const DimReductionIcon = defineComponent({
  render() {
    return h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
      h('path', { d: 'M12 3v18' }),
      h('path', { d: 'M3 12h18' }),
      h('circle', { cx: '8', cy: '8', r: '2' }),
      h('circle', { cx: '16', cy: '16', r: '2' })
    ])
  }
})

const LatentIcon = defineComponent({
  render() {
    return h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
      h('path', { d: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8' }),
      h('path', { d: 'M12 12L3 7' }),
      h('path', { d: 'M12 12l9-5' }),
      h('path', { d: 'M12 12v9' })
    ])
  }
})

const RuntimeIcon = defineComponent({
  render() {
    return h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
      h('circle', { cx: '12', cy: '12', r: '10' }),
      h('polyline', { points: '12 6 12 12 16 14' })
    ])
  }
})

const metricCategories = [
  {
    name: 'Clustering',
    bgClass: 'bg-gradient-to-br from-blue-500 to-blue-600',
    icon: ClusteringIcon,
    metrics: ['NMI', 'ARI', 'ASW', 'Calinski-Harabasz', 'Davies-Bouldin']
  },
  {
    name: 'Dim. Reduction',
    bgClass: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    icon: DimReductionIcon,
    metrics: ['Q_local', 'Q_global', 'Trustworthiness', 'Continuity']
  },
  {
    name: 'Latent Space',
    bgClass: 'bg-gradient-to-br from-purple-500 to-purple-600',
    icon: LatentIcon,
    metrics: ['Manifold Dim.', 'Intrinsic Dim.', 'Spectral Decay']
  },
  {
    name: 'Runtime',
    bgClass: 'bg-gradient-to-br from-amber-500 to-amber-600',
    icon: RuntimeIcon,
    metrics: ['Training Time', 'Memory Usage', 'Inference Speed']
  }
]

const modelCategories = [
  {
    name: 'Predictive Models',
    count: 2,
    description: 'Models focused on prediction tasks',
    models: ['scGCC', 'CLEAR']
  },
  {
    name: 'Generative Models',
    count: 10,
    description: 'VAE-based generative approaches',
    models: ['scVI', 'scGNN', 'SCALEX', 'CellBLAST', 'scDAC', '...']
  },
  {
    name: 'scATAC-Specific',
    count: 2,
    description: 'Chromatin accessibility focused',
    models: ['PeakVI', 'PoissonVI']
  },
  {
    name: 'Trajectory',
    count: 1,
    description: 'Trajectory inference models',
    models: ['scTour']
  },
  {
    name: 'Geometric',
    count: 4,
    description: 'Hyperbolic and geometric approaches',
    models: ['GMVAE-PGM', 'Poincaré', 'Hyperbolic-Wrapped', 'Learnable-PGM']
  },
  {
    name: 'Disentanglement',
    count: 4,
    description: 'Disentangled representation learning',
    models: ['β-VAE', 'InfoVAE', 'TCVAE', 'DIPVAE']
  }
]
</script>
