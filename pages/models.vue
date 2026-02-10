<template>
  <div class="min-h-screen">
    <!-- Header -->
    <div class="bg-gradient-to-r from-purple-600 to-indigo-600 py-16">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center gap-2 text-purple-100 text-sm mb-4">
          <NuxtLink to="/" class="hover:text-white transition-colors">Home</NuxtLink>
          <span>/</span>
          <span class="text-white">Models</span>
        </div>
        <h1 class="text-4xl md:text-5xl font-bold text-white mb-4">
          Model Catalog
        </h1>
        <p class="text-purple-100 max-w-2xl text-lg">
          SCPortal indexes 23 single-cell analysis models across 6 categories with documentation and evaluation metrics.
        </p>
      </div>
    </div>

    <!-- Content -->
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <!-- Filter Tabs -->
      <div class="flex flex-wrap gap-2 mb-8">
        <button
          v-for="category in categories"
          :key="category.id"
          @click="activeCategory = category.id"
          class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
          :class="activeCategory === category.id
            ? 'bg-purple-600 text-white'
            : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'"
        >
          {{ category.name }}
        </button>
      </div>

      <!-- Model Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <div
          v-for="model in filteredModels"
          :key="model.name"
          class="group relative overflow-hidden rounded-2xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 transition-all hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1"
        >
          <div class="p-6">
            <div class="flex items-start justify-between mb-4">
              <div
                class="flex h-12 w-12 items-center justify-center rounded-xl"
                :class="getCategoryClass(model.category)"
              >
                <span class="text-lg font-bold text-white">{{ model.name.charAt(0) }}</span>
              </div>
              <span class="inline-flex px-2 py-1 text-xs font-medium rounded-md bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                {{ model.category }}
              </span>
            </div>

            <h3 class="text-lg font-semibold text-dark-900 dark:text-white mb-2">{{ model.name }}</h3>
            <p class="text-sm text-dark-600 dark:text-dark-400 mb-4 line-clamp-3">
              {{ model.description }}
            </p>

            <!-- Key Features -->
            <div class="flex flex-wrap gap-2 mb-4">
              <span
                v-for="feature in model.features"
                :key="feature"
                class="inline-flex px-2 py-1 text-xs rounded-md bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-400"
              >
                {{ feature }}
              </span>
            </div>

            <a
              :href="`https://peterponyu.github.io/liora-ui/models/${model.slug}/`"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
            >
              View Details
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
          href="https://peterponyu.github.io/liora-ui/models/"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/25"
        >
          LAIOR Model Documentation
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
          iAODE Dataset Browser
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
  title: 'Model Catalog - SCPortal',
  description: 'Documentation of 23 single-cell analysis models from the LAIOR benchmark with evaluation metrics'
})

const activeCategory = ref('all')

const categories = [
  { id: 'all', name: 'All Models' },
  { id: 'predictive', name: 'Predictive' },
  { id: 'generative', name: 'Generative' },
  { id: 'scatac', name: 'scATAC' },
  { id: 'trajectory', name: 'Trajectory' },
  { id: 'geometric', name: 'Geometric' },
  { id: 'disentangle', name: 'Disentanglement' }
]

const models = [
  {
    name: 'scVI',
    slug: 'scvi',
    category: 'Generative',
    categoryId: 'generative',
    description: 'Single-cell Variational Inference for probabilistic analysis of single-cell gene expression data.',
    features: ['VAE', 'NB Likelihood', 'Batch Correction']
  },
  {
    name: 'scGNN',
    slug: 'scgnn',
    category: 'Generative',
    categoryId: 'generative',
    description: 'Graph Neural Network for single-cell RNA-seq analysis with cell-cell interaction modeling.',
    features: ['GNN', 'Cell Graph', 'Imputation']
  },
  {
    name: 'SCALEX',
    slug: 'scalex',
    category: 'Generative',
    categoryId: 'generative',
    description: 'Single-Cell ATLAS eXtender for batch-effect free integration of single-cell atlases.',
    features: ['VAE', 'Atlas Integration', 'Projection']
  },
  {
    name: 'Cell BLAST',
    slug: 'cellblast',
    category: 'Generative',
    categoryId: 'generative',
    description: 'Cell type annotation and reference search using deep generative models.',
    features: ['VAE', 'Cell Annotation', 'Reference Atlas']
  },
  {
    name: 'PeakVI',
    slug: 'peakvi',
    category: 'scATAC',
    categoryId: 'scatac',
    description: 'Probabilistic modeling of scATAC-seq data using variational inference.',
    features: ['VAE', 'Peak Matrix', 'Chromatin']
  },
  {
    name: 'PoissonVI',
    slug: 'poissonvi',
    category: 'scATAC',
    categoryId: 'scatac',
    description: 'Poisson-based variational inference for count data in scATAC-seq.',
    features: ['Poisson', 'Count Data', 'scATAC']
  },
  {
    name: 'scTour',
    slug: 'sctour',
    category: 'Trajectory',
    categoryId: 'trajectory',
    description: 'Trajectory inference with optimal transport and neural ODE for single-cell data.',
    features: ['OT', 'Neural ODE', 'Trajectory']
  },
  {
    name: 'β-VAE',
    slug: 'betavae',
    category: 'Disentangle',
    categoryId: 'disentangle',
    description: 'Disentangled representation learning with adjustable β constraint on KL divergence.',
    features: ['Disentangle', 'β-VAE', 'Interpretable']
  },
  {
    name: 'InfoVAE',
    slug: 'infovae',
    category: 'Disentangle',
    categoryId: 'disentangle',
    description: 'Information maximizing variational autoencoder with MMD regularization.',
    features: ['MMD', 'InfoMax', 'VAE']
  },
  {
    name: 'TCVAE',
    slug: 'tcvae',
    category: 'Disentangle',
    categoryId: 'disentangle',
    description: 'Total correlation VAE for disentangled representation learning.',
    features: ['TC', 'Disentangle', 'VAE']
  },
  {
    name: 'DIPVAE',
    slug: 'dipvae',
    category: 'Disentangle',
    categoryId: 'disentangle',
    description: 'Disentangled Inferred Prior VAE for learning disentangled representations.',
    features: ['DIP', 'Prior', 'VAE']
  },
  {
    name: 'GMVAE (PGM)',
    slug: 'gmvae-pgm',
    category: 'Geometric',
    categoryId: 'geometric',
    description: 'Gaussian Mixture VAE with probabilistic graphical model structure.',
    features: ['GMM', 'PGM', 'Clustering']
  },
  {
    name: 'scGCC',
    slug: 'scgcc',
    category: 'Predictive',
    categoryId: 'predictive',
    description: 'Graph Contrastive Clustering for single-cell data analysis.',
    features: ['Contrastive', 'Graph', 'Clustering']
  },
  {
    name: 'CLEAR',
    slug: 'clear',
    category: 'Predictive',
    categoryId: 'predictive',
    description: 'Contrastive Learning for scRNA-seq data with augmentation strategies.',
    features: ['Contrastive', 'Augmentation', 'SSL']
  }
]

const filteredModels = computed(() => {
  if (activeCategory.value === 'all') return models
  return models.filter(m => m.categoryId === activeCategory.value)
})

function getCategoryClass(category: string) {
  const classes: Record<string, string> = {
    'Generative': 'bg-gradient-to-br from-blue-500 to-blue-600',
    'scATAC': 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    'Trajectory': 'bg-gradient-to-br from-amber-500 to-amber-600',
    'Disentangle': 'bg-gradient-to-br from-purple-500 to-purple-600',
    'Geometric': 'bg-gradient-to-br from-pink-500 to-pink-600',
    'Predictive': 'bg-gradient-to-br from-cyan-500 to-cyan-600'
  }
  return classes[category] || 'bg-gradient-to-br from-gray-500 to-gray-600'
}
</script>
