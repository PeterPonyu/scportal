<template>
  <section class="space-y-5" aria-labelledby="thesis-method-atlas-heading">
    <header class="space-y-2">
      <div class="flex flex-wrap items-center gap-3">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700 dark:text-primary-300">
          Thesis traceability atlas
        </p>
        <span class="rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-800 dark:bg-primary-950/60 dark:text-primary-200">
          {{ scope.identityCount }} identities
        </span>
      </div>
      <h2 id="thesis-method-atlas-heading" class="text-xl font-semibold text-dark-900 dark:text-white">
        Thirteen published method identities
      </h2>
      <p class="max-w-3xl text-sm leading-6 text-dark-600 dark:text-dark-400">
        This atlas records provenance and the application handoff across the thesis layers. It is a
        non-executable traceability view, not a leaderboard and not a claim that every method is
        available through the browser Router.
      </p>
    </header>

    <div class="grid gap-3 sm:grid-cols-3" aria-label="AutoSelect scope counts">
      <div class="rounded-2xl border border-dark-200 bg-white/80 p-4 dark:border-dark-800 dark:bg-dark-900/70">
        <p class="text-xs uppercase tracking-wide text-dark-500 dark:text-dark-400">Thesis identities</p>
        <p class="mt-1 font-mono text-2xl font-semibold text-dark-900 dark:text-white">{{ scope.identityCount }}</p>
      </div>
      <div class="rounded-2xl border border-dark-200 bg-white/80 p-4 dark:border-dark-800 dark:bg-dark-900/70">
        <p class="text-xs uppercase tracking-wide text-dark-500 dark:text-dark-400">Synthetic candidates</p>
        <p class="mt-1 font-mono text-2xl font-semibold text-dark-900 dark:text-white">{{ scope.syntheticCandidateCount }}</p>
      </div>
      <div class="rounded-2xl border border-dark-200 bg-white/80 p-4 dark:border-dark-800 dark:bg-dark-900/70">
        <p class="text-xs uppercase tracking-wide text-dark-500 dark:text-dark-400">Local provider families</p>
        <p class="mt-1 font-mono text-2xl font-semibold text-dark-900 dark:text-white">{{ scope.providerFamilyCount }}</p>
      </div>
    </div>

    <ol class="grid gap-3 md:grid-cols-2" aria-label="Thesis method identities">
      <li
        v-for="row in rows"
        :key="row.method.id"
        class="rounded-2xl border border-dark-200 bg-white/80 p-4 dark:border-dark-800 dark:bg-dark-900/70"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="font-mono text-base font-semibold text-dark-900 dark:text-white">{{ row.method.id }}</p>
            <p class="mt-1 text-xs uppercase tracking-wide text-primary-700 dark:text-primary-300">
              {{ row.method.layer }}
            </p>
          </div>
          <span class="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
            traceability only
          </span>
        </div>
        <p class="mt-3 text-xs leading-5 text-dark-600 dark:text-dark-400">
          Identity {{ row.method.identity_status }} · evidence {{ row.method.evidence_status }} · executable false
        </p>
        <nav class="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs" :aria-label="`${row.method.id} public links`">
          <a
            :href="row.method.paper_url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary-700 underline decoration-primary-400 underline-offset-4 dark:text-primary-300"
          >Paper</a>
          <a
            :href="row.method.source_repo"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary-700 underline decoration-primary-400 underline-offset-4 dark:text-primary-300"
          >Code</a>
          <template v-for="site in row.sites" :key="site.id">
            <a
              v-if="site.canonical_url"
              :href="site.canonical_url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary-700 underline decoration-primary-400 underline-offset-4 dark:text-primary-300"
            >{{ methodSiteLabel(site) }}</a>
          </template>
        </nav>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import {
  methodSiteLabel,
  resolveMethodSites,
  thesisMethodScope,
  thesisMethods,
} from '~/utils/thesisMethods'

const scope = thesisMethodScope
const rows = thesisMethods.map((method) => ({
  method,
  sites: resolveMethodSites(method),
}))
</script>
