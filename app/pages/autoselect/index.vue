<template>
  <div class="autoselect-page">
    <div class="relative overflow-hidden border-b border-dark-800 bg-dark-900 py-12 sm:py-16">
      <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-500/70 to-transparent" />
      <div class="pointer-events-none absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-primary-600/10 blur-3xl" />
      <div class="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div class="mb-4 flex items-center gap-2 text-sm text-dark-300">
          <NuxtLink to="/" class="transition-colors hover:text-white">Home</NuxtLink>
          <span class="text-dark-400">/</span>
          <span class="text-white">AutoSelect</span>
        </div>
        <h1 class="mb-4 text-4xl font-bold text-white md:text-5xl">
          AutoSelect
        </h1>
        <p class="max-w-2xl text-lg text-dark-300">
          Describe a lightweight task profile. The Router returns a transparent recommendation or an evidence-aware refusal.
        </p>
      </div>
    </div>

    <div class="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div
        class="mb-10 flex flex-col gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 dark:border-amber-800 dark:bg-amber-950/30 sm:flex-row sm:items-start sm:gap-4"
        role="status"
      >
        <svg
          class="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v5" />
          <path d="M12 16h.01" />
        </svg>
        <div class="space-y-1 text-sm">
          <p class="font-medium text-amber-950 dark:text-amber-100">
            Synthetic evidence preview. This release cannot support biological claims.
          </p>
          <p class="text-amber-900/90 dark:text-amber-200/80">
            No expression matrix or cell-level data leaves this browser.
          </p>
        </div>
      </div>

      <AutoSelectShell @run="onRun" />

      <RelatedDestinations
        title="Connected benchmark surfaces"
        intro="The traceability layer links the benchmark companion and atlas without changing the synthetic ranking catalog."
        :destinations="autoselectDestinations"
      />

      <details class="group mt-12 rounded-3xl border border-dark-200 bg-dark-50/60 dark:border-dark-800 dark:bg-dark-900/40">
        <summary
          class="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-3xl px-6 py-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          <span>
            <span class="block text-xs font-semibold uppercase tracking-[0.18em] text-primary-700 dark:text-primary-300">
              Provenance
            </span>
            <span class="mt-1 block text-base font-semibold text-dark-900 dark:text-white">
              How this recommender traces back to the thesis
            </span>
          </span>
          <span class="inline-flex items-center gap-2 text-sm font-medium text-dark-600 dark:text-dark-300">
            <span class="group-open:hidden">Show details</span>
            <span class="hidden group-open:inline">Hide details</span>
            <svg
              class="h-4 w-4 transition-transform group-open:rotate-180"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </summary>
        <div class="px-3 pb-3 sm:px-4 sm:pb-4">
          <ThesisMethodAtlas />
          <div class="my-8 border-t border-dark-200 dark:border-dark-800" />
          <ThesisIntegrationPanel />
        </div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import AutoSelectShell from '../../components/autoselect/AutoSelectShell.vue'
import RelatedDestinations from '../../components/RelatedDestinations.vue'
import ThesisMethodAtlas from '../../components/autoselect/ThesisMethodAtlas.vue'
import ThesisIntegrationPanel from '../../components/autoselect/ThesisIntegrationPanel.vue'
import type { TaskProfile } from '../../core/router/types'
import { getRouteDestinations } from '../../utils/publicGraph'

const autoselectDestinations = getRouteDestinations('autoselect')

useSeoMeta({
  title: 'AutoSelect',
  description: 'Describe a lightweight task profile and get a transparent method recommendation or an evidence-aware refusal. No expression matrix is uploaded.',
  ogTitle: 'AutoSelect | SCPortal',
  ogDescription: 'Describe a lightweight task profile and get a transparent method recommendation or an evidence-aware refusal.',
  twitterTitle: 'AutoSelect | SCPortal',
  twitterDescription: 'Describe a lightweight task profile and get a transparent method recommendation or an evidence-aware refusal.',
})

function onRun(_profile: TaskProfile) {
  void _profile
}
</script>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  .autoselect-page,
  .autoselect-page :deep(*) {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
</style>
