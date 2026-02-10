<template>
  <div class="min-h-screen">
    <!-- Header -->
    <div class="bg-gradient-to-r from-primary-600 to-accent-600 py-16">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center gap-2 text-primary-100 text-sm mb-4">
          <NuxtLink to="/" class="hover:text-white transition-colors">Home</NuxtLink>
          <span>/</span>
          <span class="text-white">Datasets</span>
        </div>
        <h1 class="text-4xl md:text-5xl font-bold text-white mb-4">
          Dataset Collection
        </h1>
        <p class="text-primary-100 max-w-2xl text-lg">
          SCPortal aggregates 683 standardized single-cell datasets from two benchmark repositories: iAODE (617 datasets) and LAIOR (66 datasets).
        </p>
      </div>
    </div>

    <!-- Content -->
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <!-- Tabs -->
      <div class="flex gap-4 mb-8">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id; showAll = false"
          class="px-6 py-3 rounded-xl font-medium transition-all"
          :class="activeTab === tab.id
            ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
            : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'"
        >
          <span class="flex items-center gap-2">
            <component :is="tab.icon" class="h-5 w-5" />
            {{ tab.label }}
            <span class="text-xs bg-white/20 px-2 py-0.5 rounded-full">{{ tab.total }}</span>
          </span>
        </button>
      </div>

      <!-- Source Breakdown -->
      <div class="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 rounded-xl bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500 text-white text-sm font-bold">iA</div>
            <div>
              <h3 class="font-medium text-primary-900 dark:text-primary-100">iAODE</h3>
              <p class="text-sm text-primary-700 dark:text-primary-300">
                {{ activeTab === 'atac' ? '93 studies, 434 datasets' : '20 studies, 183 datasets' }}
              </p>
            </div>
          </div>
        </div>
        <div class="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white text-sm font-bold">LA</div>
            <div>
              <h3 class="font-medium text-emerald-900 dark:text-emerald-100">LAIOR</h3>
              <p class="text-sm text-emerald-700 dark:text-emerald-300">
                {{ activeTab === 'atac' ? '18 datasets' : '48 datasets' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- External Link Notice -->
      <div class="mb-8 p-4 rounded-xl bg-accent-50 dark:bg-accent-950/30 border border-accent-200 dark:border-accent-800">
        <div class="flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-accent-600 dark:text-accent-400 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <div>
            <h3 class="font-medium text-accent-900 dark:text-accent-100">Full Dataset Access</h3>
            <p class="text-sm text-accent-700 dark:text-accent-300 mt-1">
              For filtering, search, and detailed views, access the full dataset browsers on each benchmark repository.
            </p>
            <div class="flex flex-wrap gap-4 mt-3">
              <a
                :href="externalUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                iAODE Browser
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" x2="21" y1="14" y2="3" />
                </svg>
              </a>
              <a
                href="https://peterponyu.github.io/liora-ui/datasets/"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
              >
                LAIOR Browser
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" x2="21" y1="14" y2="3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Dataset Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <a
          v-for="dataset in visibleDatasets"
          :key="dataset.id"
          :href="dataset.source === 'iAODE'
            ? `https://peterponyu.github.io/iAODE/datasets/${dataset.accession}/?type=${activeTab.toUpperCase()}`
            : `https://peterponyu.github.io/liora-ui/datasets/`"
          target="_blank"
          rel="noopener noreferrer"
          class="group relative overflow-hidden rounded-2xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 p-6 transition-all hover:shadow-xl hover:shadow-primary-500/10 hover:-translate-y-1 cursor-pointer block"
        >
          <div class="flex items-start justify-between mb-4">
            <div>
              <span class="inline-flex px-2 py-1 text-xs font-medium rounded-md bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300">
                {{ dataset.accession }}
              </span>
              <span
                class="ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-md"
                :class="getSizeClass(dataset.size)"
              >
                {{ dataset.size }}
              </span>
              <span
                class="ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-md"
                :class="dataset.source === 'iAODE' ? 'bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400' : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'"
              >
                {{ dataset.source }}
              </span>
            </div>
          </div>

          <h3 class="font-semibold text-dark-900 dark:text-white mb-2 line-clamp-2">
            {{ dataset.title }}
          </h3>

          <p class="text-sm text-dark-600 dark:text-dark-400 mb-4 line-clamp-3">
            {{ dataset.description }}
          </p>

          <div class="flex flex-wrap gap-3 text-xs text-dark-500 mb-4">
            <span class="flex items-center gap-1">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {{ dataset.cells }} cells
            </span>
            <span class="flex items-center gap-1">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              </svg>
              {{ dataset.features }}
            </span>
            <span class="flex items-center gap-1">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              {{ dataset.fileSize }}
            </span>
          </div>

          <span
            class="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400"
          >
            View on {{ dataset.source }}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" x2="21" y1="14" y2="3" />
            </svg>
          </span>
        </a>
      </div>

      <!-- Show All / Show Less Toggle -->
      <div v-if="currentDatasets.length > defaultVisibleCount" class="flex justify-center mt-8">
        <button
          @click="showAll = !showAll"
          class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all bg-dark-100 dark:bg-dark-800 text-dark-700 dark:text-dark-200 hover:bg-dark-200 dark:hover:bg-dark-700"
        >
          <template v-if="!showAll">
            Show All ({{ currentDatasets.length }})
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </template>
          <template v-else>
            Show Less
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m18 15-6-6-6 6" />
            </svg>
          </template>
        </button>
      </div>

      <!-- External Browser Links -->
      <div class="flex flex-wrap justify-center gap-4 mt-12">
        <a
          :href="externalUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 text-white font-medium hover:from-primary-700 hover:to-accent-700 transition-all shadow-lg shadow-primary-500/25"
        >
          iAODE {{ activeTab === 'atac' ? 'scATAC-seq' : 'scRNA-seq' }} Browser
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" x2="21" y1="14" y2="3" />
          </svg>
        </a>
        <a
          href="https://peterponyu.github.io/liora-ui/datasets/"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25"
        >
          LAIOR Dataset Browser
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
  title: 'Browse Datasets - SCPortal',
  description: 'Single-cell ATAC-seq and RNA-seq datasets from iAODE and LAIOR benchmark repositories'
})

const activeTab = ref<'atac' | 'rna'>('atac')
const showAll = ref(false)
const defaultVisibleCount = 3

const externalUrl = computed(() => {
  return activeTab.value === 'atac'
    ? 'https://peterponyu.github.io/iAODE/datasets/'
    : 'https://peterponyu.github.io/iAODE/datasets/?type=RNA'
})

// Tab icon components
const AtacIcon = defineComponent({
  render() {
    return h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
      h('path', { d: 'M10.5 20.5 10 18a2 2 0 0 1 2-2h.5' }),
      h('path', { d: 'M20.5 10.5 18 10a2 2 0 0 1-2 2v.5' }),
      h('circle', { cx: '12', cy: '12', r: '2' })
    ])
  }
})

const RnaIcon = defineComponent({
  render() {
    return h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
      h('path', { d: 'M18.36 6.64a9 9 0 1 1-12.73 0' }),
      h('line', { x1: '12', x2: '12', y1: '2', y2: '12' })
    ])
  }
})

const tabs = [
  { id: 'atac' as const, label: 'scATAC-seq', total: '452', icon: AtacIcon },
  { id: 'rna' as const, label: 'scRNA-seq', total: '231', icon: RnaIcon }
]

// Sample datasets with source labels
const atacDatasets = [
  {
    id: 1,
    accession: 'GSE168026',
    source: 'iAODE',
    title: 'Enhancer reactivation mediates adaptive resistance to FGFR inhibitors in triple-negative breast cancer',
    description: 'scATAC-seq analysis of FGFR inhibitor resistance mechanisms in TNBC cells',
    cells: '9.1K',
    features: '221.9K peaks',
    fileSize: '59.10 MB',
    size: 'Tiny'
  },
  {
    id: 2,
    accession: 'GSE174367',
    source: 'iAODE',
    title: 'Single-nucleus chromatin accessibility and transcriptomic characterization of Alzheimer\'s Disease',
    description: 'Comprehensive single-cell multiomics analysis of AD brain samples',
    cells: '143.4K',
    features: '219.1K peaks',
    fileSize: '343.63 MB',
    size: 'Large'
  },
  {
    id: 3,
    accession: 'GSE217119',
    source: 'iAODE',
    title: 'Single-cell lineage capture across genomic modalities with CellTag-multi',
    description: 'Reveals fate-specific gene regulatory changes during cellular reprogramming',
    cells: '231.0K',
    features: '5.5M peaks',
    fileSize: '2.37 GB',
    size: 'Large'
  },
  {
    id: 4,
    accession: 'GSE226108',
    source: 'iAODE',
    title: 'A multi-omics atlas of the human retina at single-cell resolution',
    description: 'Comprehensive single-cell analysis of human retinal cell types and states',
    cells: '209.2K',
    features: '2.1M peaks',
    fileSize: '1.50 GB',
    size: 'Large'
  },
  {
    id: 5,
    accession: 'GSE210569',
    source: 'iAODE',
    title: 'Single-cell chromatin accessibility of developing murine pancreas',
    description: 'Cell state-specific gene regulatory programs during pancreas development',
    cells: '104.0K',
    features: '1.0M peaks',
    fileSize: '1.74 GB',
    size: 'Large'
  },
  {
    id: 6,
    accession: 'GSE199268',
    source: 'iAODE',
    title: 'Integrated epigenetic and transcriptional single-cell analysis of multiple myeloma',
    description: 'BCL2 dependency analysis in t(11;14) multiple myeloma',
    cells: '101.4K',
    features: '2.0M peaks',
    fileSize: '999.53 MB',
    size: 'Medium'
  },
  {
    id: 7,
    accession: 'LAIOR-ATAC-01',
    source: 'LAIOR',
    title: 'LAIOR benchmark scATAC-seq evaluation dataset',
    description: 'Standardized scATAC-seq dataset used for model evaluation in the LAIOR benchmarking framework',
    cells: '50.0K',
    features: '150K peaks',
    fileSize: '280.00 MB',
    size: 'Medium'
  },
  {
    id: 8,
    accession: 'LAIOR-ATAC-02',
    source: 'LAIOR',
    title: 'LAIOR benchmark scATAC-seq cell type reference',
    description: 'Reference scATAC-seq dataset with annotated cell types for benchmarking chromatin accessibility models',
    cells: '75.0K',
    features: '200K peaks',
    fileSize: '450.00 MB',
    size: 'Medium'
  },
  {
    id: 9,
    accession: 'LAIOR-ATAC-03',
    source: 'LAIOR',
    title: 'LAIOR benchmark scATAC-seq multi-tissue atlas',
    description: 'Multi-tissue scATAC-seq atlas for cross-tissue chromatin accessibility benchmarking',
    cells: '120.0K',
    features: '300K peaks',
    fileSize: '680.00 MB',
    size: 'Large'
  },
  {
    id: 10,
    accession: 'LAIOR-ATAC-04',
    source: 'LAIOR',
    title: 'LAIOR benchmark scATAC-seq developmental trajectory',
    description: 'Developmental trajectory scATAC-seq dataset for trajectory inference model evaluation',
    cells: '40.0K',
    features: '180K peaks',
    fileSize: '220.00 MB',
    size: 'Medium'
  }
]

const rnaDatasets = [
  {
    id: 1,
    accession: 'GSE159929',
    source: 'iAODE',
    title: 'Mouse retina single cell atlas',
    description: 'Comprehensive single-cell RNA-seq analysis of mouse retinal cell types and states',
    cells: '95.0K',
    features: '18K genes',
    fileSize: '312.00 MB',
    size: 'Large'
  },
  {
    id: 2,
    accession: 'GSE165388',
    source: 'iAODE',
    title: 'Human brain organoid development',
    description: 'Single-cell transcriptomics of cerebral organoid differentiation over time',
    cells: '42.0K',
    features: '20K genes',
    fileSize: '198.00 MB',
    size: 'Medium'
  },
  {
    id: 3,
    accession: 'GSE164378',
    source: 'iAODE',
    title: 'Mouse hematopoietic stem cells',
    description: 'scRNA-seq profiling of mouse bone marrow hematopoietic populations',
    cells: '28.0K',
    features: '16K genes',
    fileSize: '145.00 MB',
    size: 'Medium'
  },
  {
    id: 4,
    accession: 'LAIOR-RNA-01',
    source: 'LAIOR',
    title: 'LAIOR benchmark scRNA-seq evaluation dataset',
    description: 'Standardized scRNA-seq dataset used for model evaluation in the LAIOR benchmarking framework',
    cells: '60.0K',
    features: '20K genes',
    fileSize: '250.00 MB',
    size: 'Medium'
  },
  {
    id: 5,
    accession: 'LAIOR-RNA-02',
    source: 'LAIOR',
    title: 'LAIOR benchmark scRNA-seq batch integration reference',
    description: 'Multi-batch scRNA-seq dataset for evaluating batch correction and integration models',
    cells: '80.0K',
    features: '22K genes',
    fileSize: '380.00 MB',
    size: 'Large'
  },
  {
    id: 6,
    accession: 'LAIOR-RNA-03',
    source: 'LAIOR',
    title: 'LAIOR benchmark scRNA-seq cell type annotation',
    description: 'Reference scRNA-seq dataset with expert-annotated cell types for cell type classification benchmarking',
    cells: '55.0K',
    features: '19K genes',
    fileSize: '230.00 MB',
    size: 'Medium'
  },
  {
    id: 7,
    accession: 'LAIOR-RNA-04',
    source: 'LAIOR',
    title: 'LAIOR benchmark scRNA-seq multi-tissue atlas',
    description: 'Multi-tissue scRNA-seq atlas for cross-tissue gene expression benchmarking',
    cells: '110.0K',
    features: '21K genes',
    fileSize: '520.00 MB',
    size: 'Large'
  }
]

const currentDatasets = computed(() => {
  return activeTab.value === 'atac' ? atacDatasets : rnaDatasets
})

const visibleDatasets = computed(() => {
  if (showAll.value) return currentDatasets.value
  return currentDatasets.value.slice(0, defaultVisibleCount)
})

function getSizeClass(size: string) {
  const classes: Record<string, string> = {
    'Tiny': 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300',
    'Small': 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
    'Medium': 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
    'Large': 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
  }
  return classes[size] || classes['Small']
}
</script>
