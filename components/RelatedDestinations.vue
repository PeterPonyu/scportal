<template>
  <section class="mt-12">
    <div class="flex items-center justify-between gap-3 mb-5">
      <div>
        <h2 class="text-xl font-semibold text-dark-900 dark:text-white">{{ title }}</h2>
        <p class="text-sm text-dark-600 dark:text-dark-400 mt-1">{{ intro }}</p>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <a
        v-for="destination in destinations"
        :key="destination.href"
        :href="destination.href"
        target="_blank"
        rel="noopener noreferrer"
        class="group rounded-2xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 p-6 transition-all duration-300 hover:shadow-xl hover:shadow-primary-500/10 hover:-translate-y-1 block"
      >
        <div class="flex items-center justify-between gap-3 mb-3">
          <h3 class="font-semibold text-dark-900 dark:text-white">{{ destination.name }}</h3>
          <span class="inline-flex px-2 py-1 text-xs font-medium rounded-md bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300">
            Public Destination
          </span>
        </div>
        <p class="text-sm text-dark-600 dark:text-dark-400 mb-4">
          {{ destination.summary }}
        </p>
        <span class="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
          {{ destination.ctaLabel }}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" x2="21" y1="14" y2="3" />
          </svg>
        </span>
      </a>
    </div>
  </section>
</template>

<script setup lang="ts">
type Destination = {
  name: string
  href: string
  summary: string
  ctaLabel: string
}

defineProps<{
  title: string
  intro: string
  destinations: Destination[]
}>()
</script>
