<template>
  <section class="py-16 bg-white dark:bg-dark-950">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <div class="mx-auto mb-10 max-w-3xl text-center">
        <p class="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-primary-600 dark:text-primary-300">
          Choose a research route
        </p>
        <h2 class="mb-4 text-3xl font-semibold text-dark-900 dark:text-white md:text-4xl">
          Start from the task, then follow the canonical public destination.
        </h2>
        <p class="text-dark-600 dark:text-dark-400">
          SCPortal is the discovery layer for the flagship triad: it orients visitors, explains which route fits their task, and sends deep interaction to focused public surfaces.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <NuxtLink
          v-for="route in taskRoutes"
          :key="route.to"
          :to="route.to"
          class="group rounded-2xl border border-dark-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-500/10 dark:border-dark-800 dark:bg-dark-900"
        >
          <div class="mb-4 flex items-center justify-between gap-3">
            <span class="inline-flex rounded-full bg-dark-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-dark-500 dark:bg-dark-800 dark:text-dark-300">
              {{ route.intent }}
            </span>
            <span class="text-primary-600 transition-transform group-hover:translate-x-1 dark:text-primary-300">→</span>
          </div>
          <h3 class="mb-2 text-lg font-semibold text-dark-900 dark:text-white">
            {{ route.title }}
          </h3>
          <p class="mb-4 text-sm leading-6 text-dark-600 dark:text-dark-400">
            {{ route.summary }}
          </p>
          <p class="text-xs font-medium text-dark-500 dark:text-dark-400">
            Next public surface: {{ route.destination }}
          </p>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { lioraBenchmarkLink } from '~/utils/publicGraph'

const taskRoutes = [
  {
    intent: 'Find data',
    title: 'Browse benchmark-ready datasets',
    summary: 'Compare modality coverage, source repositories, and representative studies before opening the full dataset browsers.',
    destination: 'iAODE Pages + LAIOR Benchmarks',
    to: '/datasets',
  },
  {
    intent: 'Explore structure',
    title: 'Inspect trajectory continuity',
    summary: 'Frame the continuity task in SCPortal, then launch the iAODE explorer for full interactive analysis.',
    destination: 'iAODE Pages',
    to: '/explorer',
  },
  {
    intent: 'Evaluate methods',
    title: 'Understand metrics and rankings',
    summary: 'Start with metric definitions and model categories, then continue into the benchmark product for deeper LAIOR views.',
    destination: lioraBenchmarkLink.name,
    to: '/benchmarks',
  },
  {
    intent: 'Choose models',
    title: 'Scan model families',
    summary: 'Review the model catalog by task family before jumping to focused LAIOR model documentation.',
    destination: lioraBenchmarkLink.name,
    to: '/models',
  },
]
</script>
