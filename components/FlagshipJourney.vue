<template>
  <section class="py-16 bg-white dark:bg-dark-950">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <div class="rounded-3xl border border-dark-200 bg-gradient-to-br from-white via-primary-50/40 to-accent-50/40 p-6 shadow-sm dark:border-dark-800 dark:from-dark-900 dark:via-primary-950/20 dark:to-accent-950/20 md:p-8">
        <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-primary-600 dark:text-primary-300">
              Connected flagship journey
            </p>
            <h2 class="mt-3 text-3xl font-semibold tracking-tight text-dark-900 dark:text-white">
              Start with identity, discover in SCPortal, then inspect benchmark evidence.
            </h2>
            <p class="mt-3 max-w-3xl text-sm leading-6 text-dark-600 dark:text-dark-400">
              SCPortal is the discovery hub in the PeterPonyu public graph: it keeps broad route-finding here while sending visitors to focused destinations only when a task is clear.
            </p>
          </div>
          <div class="flex flex-wrap gap-2 text-xs font-semibold text-dark-600 dark:text-dark-300">
            <span class="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 dark:border-primary-800 dark:bg-primary-950/40">Route clarity</span>
            <span class="rounded-full border border-accent-200 bg-accent-50 px-3 py-1 dark:border-accent-800 dark:bg-accent-950/40">Academic provenance</span>
            <span class="rounded-full border border-dark-200 bg-white px-3 py-1 dark:border-dark-700 dark:bg-dark-900">No boundary promotion</span>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <a
            :href="homepageLink.canonical_url"
            target="_blank"
            rel="noopener noreferrer"
            class="group rounded-2xl border border-dark-200 bg-white p-5 transition-all hover:-translate-y-1 hover:border-primary-300 hover:shadow-xl hover:shadow-primary-500/10 dark:border-dark-800 dark:bg-dark-900 dark:hover:border-primary-700"
          >
            <div class="flex items-center justify-between gap-3">
              <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-950 dark:text-primary-300">01</span>
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-dark-500 dark:text-dark-400">Identity root</span>
            </div>
            <h3 class="mt-4 text-lg font-semibold text-dark-900 dark:text-white">{{ homepageLink.name }}</h3>
            <p class="mt-2 text-sm leading-6 text-dark-600 dark:text-dark-400">
              Verify Zeyu Fu / PeterPonyu identity, publications, software provenance, and authoritative profile links.
            </p>
            <span class="mt-4 inline-flex text-sm font-medium text-primary-600 dark:text-primary-300">Open homepage →</span>
          </a>

          <div class="rounded-2xl border-2 border-primary-300 bg-primary-50/80 p-5 shadow-lg shadow-primary-500/10 dark:border-primary-700 dark:bg-primary-950/30">
            <div class="flex items-center justify-between gap-3">
              <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">02</span>
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-primary-700 dark:text-primary-200">Discovery hub</span>
            </div>
            <h3 class="mt-4 text-lg font-semibold text-dark-900 dark:text-white">{{ scportalLink.name }}</h3>
            <p class="mt-2 text-sm leading-6 text-dark-600 dark:text-dark-300">
              Choose between datasets, models, continuity exploration, and benchmark references without turning the homepage into a portal.
            </p>
            <span class="mt-4 inline-flex text-sm font-medium text-primary-700 dark:text-primary-200">You are here</span>
          </div>

          <a
            :href="lioraBenchmarkLink.canonical_url"
            target="_blank"
            rel="noopener noreferrer"
            class="group rounded-2xl border border-dark-200 bg-white p-5 transition-all hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/10 dark:border-dark-800 dark:bg-dark-900 dark:hover:border-emerald-700"
          >
            <div class="flex items-center justify-between gap-3">
              <span class="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">03</span>
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-dark-500 dark:text-dark-400">Benchmark microsite</span>
            </div>
            <h3 class="mt-4 text-lg font-semibold text-dark-900 dark:text-white">{{ lioraBenchmarkLink.name }}</h3>
            <p class="mt-2 text-sm leading-6 text-dark-600 dark:text-dark-400">
              Inspect LAIOR model summaries, dataset coverage, and metric definitions when the visitor is ready for benchmark depth.
            </p>
            <span class="mt-4 inline-flex text-sm font-medium text-emerald-600 dark:text-emerald-300">Open benchmarks →</span>
          </a>

          <a
            :href="scccvgbenLink.canonical_url"
            target="_blank"
            rel="noopener noreferrer"
            class="group rounded-2xl border border-dark-200 bg-white p-5 transition-all hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl hover:shadow-sky-500/10 dark:border-dark-800 dark:bg-dark-900 dark:hover:border-sky-700"
          >
            <div class="flex items-center justify-between gap-3">
              <span class="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">04</span>
              <span class="text-xs font-semibold uppercase tracking-[0.16em] text-dark-500 dark:text-dark-400">Paper benchmark resource</span>
            </div>
            <h3 class="mt-4 text-lg font-semibold text-dark-900 dark:text-white">{{ scccvgbenLink.name }}</h3>
            <p class="mt-2 text-sm leading-6 text-dark-600 dark:text-dark-400">
              Open the scCCVGBen companion site for the paper benchmark cohort, method comparisons, metrics, and online resource figures.
            </p>
            <span class="mt-4 inline-flex text-sm font-medium text-sky-600 dark:text-sky-300">Open scCCVGBen →</span>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { homepageLink, lioraBenchmarkLink, scccvgbenLink, scportalLink } from '~/utils/publicGraph'
</script>
