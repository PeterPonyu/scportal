<template>
  <div class="autoselect-page">
    <div class="bg-gradient-to-r from-primary-700 to-accent-700 py-16">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="mb-4 flex items-center gap-2 text-sm text-primary-100">
          <NuxtLink to="/" class="transition-colors hover:text-white">Home</NuxtLink>
          <span>/</span>
          <span class="text-white">AutoSelect</span>
        </div>
        <h1 class="mb-4 text-4xl font-bold text-white md:text-5xl">
          AutoSelect
        </h1>
        <p class="max-w-2xl text-lg text-primary-100">
          Describe a lightweight task profile. The Router returns a transparent recommendation or an evidence-aware refusal.
        </p>
      </div>
    </div>

    <div class="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <p class="mb-4 text-sm text-dark-600 dark:text-dark-400">
        No expression matrix or cell-level data leaves this browser.
      </p>
      <p class="mb-8 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100" role="status">
        Synthetic evidence preview. This release cannot support biological claims.
      </p>
      <ThesisIntegrationPanel class="mb-10" />
      <AutoSelectShell @run="onRun" />
    </div>
  </div>
</template>

<script setup lang="ts">
import AutoSelectShell from '../../components/autoselect/AutoSelectShell.vue'
import ThesisIntegrationPanel from '../../components/autoselect/ThesisIntegrationPanel.vue'
import type { TaskProfile } from '../../core/router/types'

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
