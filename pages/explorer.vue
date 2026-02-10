<template>
  <div class="min-h-screen">
    <!-- Header -->
    <div class="bg-gradient-to-r from-accent-600 to-primary-600 py-16">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center gap-2 text-accent-100 text-sm mb-4">
          <NuxtLink to="/" class="hover:text-white transition-colors">Home</NuxtLink>
          <span>/</span>
          <span class="text-white">Continuity Explorer</span>
        </div>
        <h1 class="text-4xl md:text-5xl font-bold text-white mb-4">
          Continuity Explorer
        </h1>
        <p class="text-accent-100 max-w-2xl text-lg">
          SCPortal provides access to trajectory analysis tools for exploring embedding methods and continuity metrics.
        </p>
      </div>
    </div>

    <!-- Content -->
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <!-- Features Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div class="p-6 rounded-2xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900">
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
          </div>
          <h3 class="font-semibold text-dark-900 dark:text-white mb-2">Multiple Trajectories</h3>
          <p class="text-sm text-dark-600 dark:text-dark-400">
            Compare linear, branching, cyclic, and discrete cluster structures.
          </p>
        </div>

        <div class="p-6 rounded-2xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900">
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10" />
              <path d="M2 12h20" />
            </svg>
          </div>
          <h3 class="font-semibold text-dark-900 dark:text-white mb-2">Embedding Methods</h3>
          <p class="text-sm text-dark-600 dark:text-dark-400">
            Visualize with PCA, UMAP, and t-SNE dimensionality reduction.
          </p>
        </div>

        <div class="p-6 rounded-2xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900">
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <h3 class="font-semibold text-dark-900 dark:text-white mb-2">Continuity Analysis</h3>
          <p class="text-sm text-dark-600 dark:text-dark-400">
            Explore how continuity parameters affect structural preservation.
          </p>
        </div>
      </div>

      <!-- Launch Explorer -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <a
          href="https://peterponyu.github.io/iAODE/explorer/explorer/"
          target="_blank"
          rel="noopener noreferrer"
          class="group p-6 rounded-2xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 transition-all duration-300 hover:shadow-xl hover:shadow-accent-500/10 hover:-translate-y-1 hover:border-accent-300 dark:hover:border-accent-700 block cursor-pointer"
        >
          <div class="flex items-center gap-4 mb-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-primary-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-dark-900 dark:text-white">iAODE Explorer</h3>
              <p class="text-sm text-dark-500">Interactive trajectory visualization</p>
            </div>
          </div>
          <p class="text-sm text-dark-600 dark:text-dark-400 mb-3">
            Pre-computed single-cell simulation data for exploring embeddings and continuity metrics.
          </p>
          <span class="inline-flex items-center gap-2 text-sm font-medium text-accent-600 dark:text-accent-400">
            Launch Explorer
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" x2="21" y1="14" y2="3" />
            </svg>
          </span>
        </a>
        <a
          href="https://peterponyu.github.io/liora-ui/"
          target="_blank"
          rel="noopener noreferrer"
          class="group p-6 rounded-2xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 hover:border-emerald-300 dark:hover:border-emerald-700 block cursor-pointer"
        >
          <div class="flex items-center gap-4 mb-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" x2="18" y1="20" y2="10" />
                <line x1="12" x2="12" y1="20" y2="4" />
                <line x1="6" x2="6" y1="20" y2="14" />
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-dark-900 dark:text-white">LAIOR Dashboard</h3>
              <p class="text-sm text-dark-500">Model evaluation metrics</p>
            </div>
          </div>
          <p class="text-sm text-dark-600 dark:text-dark-400 mb-3">
            Interactive dashboard with evaluation metrics for 23 models across 66 datasets.
          </p>
          <span class="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            Open Dashboard
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" x2="21" y1="14" y2="3" />
            </svg>
          </span>
        </a>
      </div>

      <!-- Trajectory Types -->
      <div class="mb-12">
        <h2 class="text-2xl font-bold text-dark-900 dark:text-white mb-6">Trajectory Types</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            v-for="trajectory in trajectoryTypes"
            :key="trajectory.name"
            class="p-6 rounded-2xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900"
          >
            <div
              class="flex h-12 w-12 items-center justify-center rounded-xl mb-4"
              :class="trajectory.bgClass"
            >
              <component :is="trajectory.icon" class="h-6 w-6 text-white" />
            </div>
            <h3 class="font-semibold text-dark-900 dark:text-white mb-2">{{ trajectory.name }}</h3>
            <p class="text-sm text-dark-600 dark:text-dark-400">{{ trajectory.description }}</p>
          </div>
        </div>
      </div>

      <!-- About Section -->
      <div class="p-8 rounded-2xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-800">
        <h2 class="text-xl font-semibold text-dark-900 dark:text-white mb-4">About This Tool</h2>
        <p class="text-dark-600 dark:text-dark-400 mb-4">
          This interactive tool allows researchers to explore pre-computed single-cell simulation data
          across varying continuity parameters and trajectory types.
        </p>
        <p class="text-dark-600 dark:text-dark-400">
          All data is pre-computed and stored in chunked JSON files for fast loading and efficient exploration
          without requiring server-side computation.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Page metadata
useSeoMeta({
  title: 'Continuity Explorer - SCPortal',
  description: 'Exploration of trajectory structures and continuity metrics across embedding methods'
})

// Trajectory icon components
const LinearIcon = defineComponent({
  render() {
    return h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
      h('path', { d: 'M5 12h14' }),
      h('path', { d: 'm12 5 7 7-7 7' })
    ])
  }
})

const BranchingIcon = defineComponent({
  render() {
    return h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
      h('path', { d: 'M6 3v12' }),
      h('path', { d: 'm18 9-6-6' }),
      h('path', { d: 'm18 15-6-6' }),
      h('circle', { cx: '6', cy: '18', r: '3' }),
      h('circle', { cx: '18', cy: '9', r: '3' }),
      h('circle', { cx: '18', cy: '15', r: '3' })
    ])
  }
})

const CyclicIcon = defineComponent({
  render() {
    return h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
      h('path', { d: 'M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8' }),
      h('path', { d: 'M21 3v5h-5' })
    ])
  }
})

const ClusterIcon = defineComponent({
  render() {
    return h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
      h('circle', { cx: '6', cy: '6', r: '3' }),
      h('circle', { cx: '18', cy: '6', r: '3' }),
      h('circle', { cx: '6', cy: '18', r: '3' }),
      h('circle', { cx: '18', cy: '18', r: '3' }),
      h('circle', { cx: '12', cy: '12', r: '3' })
    ])
  }
})

const trajectoryTypes = [
  {
    name: 'Linear',
    description: 'Single directional progression from one state to another',
    icon: LinearIcon,
    bgClass: 'bg-gradient-to-br from-blue-500 to-blue-600'
  },
  {
    name: 'Branching',
    description: 'Multiple divergent paths from a common origin',
    icon: BranchingIcon,
    bgClass: 'bg-gradient-to-br from-emerald-500 to-emerald-600'
  },
  {
    name: 'Cyclic',
    description: 'Circular progression returning to initial state',
    icon: CyclicIcon,
    bgClass: 'bg-gradient-to-br from-amber-500 to-amber-600'
  },
  {
    name: 'Discrete',
    description: 'Distinct clusters without continuous connections',
    icon: ClusterIcon,
    bgClass: 'bg-gradient-to-br from-purple-500 to-purple-600'
  }
]
</script>
