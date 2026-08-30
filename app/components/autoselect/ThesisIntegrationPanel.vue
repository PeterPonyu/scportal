<template>
  <section
    class="space-y-6 rounded-3xl border border-primary-200 bg-gradient-to-br from-primary-50 via-white to-accent-50 p-6 dark:border-primary-900 dark:from-primary-950/40 dark:via-dark-900 dark:to-accent-950/30"
    aria-labelledby="thesis-integration-heading"
  >
    <header class="max-w-3xl space-y-2">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700 dark:text-primary-300">
        Thesis integration
      </p>
      <h2 id="thesis-integration-heading" class="text-2xl font-semibold text-dark-900 dark:text-white">
        Thirteen publications, one traceable application layer
      </h2>
      <p class="text-sm leading-6 text-dark-700 dark:text-dark-300">
        AutoSelect is the reproducibility bridge across the thesis line: it makes method identity,
        evidence provenance, and downstream configuration visible without turning the published
        results into a universal leaderboard.
      </p>
    </header>

    <dl v-if="bridge" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Thesis integration counts">
      <div class="rounded-2xl border border-primary-200/80 bg-white/80 p-4 dark:border-primary-800 dark:bg-dark-900/70">
        <dt class="text-xs uppercase tracking-wide text-dark-500 dark:text-dark-400">Publications</dt>
        <dd class="mt-1 font-mono text-2xl font-semibold text-dark-900 dark:text-white">{{ bridge.publicationCount }}</dd>
      </div>
      <div class="rounded-2xl border border-primary-200/80 bg-white/80 p-4 dark:border-primary-800 dark:bg-dark-900/70">
        <dt class="text-xs uppercase tracking-wide text-dark-500 dark:text-dark-400">Layers</dt>
        <dd class="mt-1 font-mono text-2xl font-semibold text-dark-900 dark:text-white">{{ bridge.layerCount }}</dd>
      </div>
      <div class="rounded-2xl border border-primary-200/80 bg-white/80 p-4 dark:border-primary-800 dark:bg-dark-900/70">
        <dt class="text-xs uppercase tracking-wide text-dark-500 dark:text-dark-400">Resolved identities</dt>
        <dd class="mt-1 font-mono text-2xl font-semibold text-dark-900 dark:text-white">{{ bridge.chain.identityResolved }}/{{ bridge.publicationCount }}</dd>
      </div>
      <div class="rounded-2xl border border-primary-200/80 bg-white/80 p-4 dark:border-primary-800 dark:bg-dark-900/70">
        <dt class="text-xs uppercase tracking-wide text-dark-500 dark:text-dark-400">Config templates</dt>
        <dd class="mt-1 font-mono text-2xl font-semibold text-dark-900 dark:text-white">{{ bridge.chain.configTemplates }}/{{ bridge.publicationCount }}</dd>
      </div>
      <div class="rounded-2xl border border-primary-200/80 bg-white/80 p-4 dark:border-primary-800 dark:bg-dark-900/70">
        <dt class="text-xs uppercase tracking-wide text-dark-500 dark:text-dark-400">Pinned distributions</dt>
        <dd class="mt-1 font-mono text-2xl font-semibold text-dark-900 dark:text-white">{{ bridge.chain.pinnedDistributions }}/{{ bridge.publicationCount }}</dd>
      </div>
      <div class="rounded-2xl border border-primary-200/80 bg-white/80 p-4 dark:border-primary-800 dark:bg-dark-900/70">
        <dt class="text-xs uppercase tracking-wide text-dark-500 dark:text-dark-400">Pin contract matches</dt>
        <dd class="mt-1 font-mono text-2xl font-semibold text-dark-900 dark:text-white">{{ bridge.chain.contractsMatchingAtPin }}/{{ bridge.chain.contractsCheckedAtPin }}</dd>
      </div>
      <div class="rounded-2xl border border-primary-200/80 bg-white/80 p-4 dark:border-primary-800 dark:bg-dark-900/70">
        <dt class="text-xs uppercase tracking-wide text-dark-500 dark:text-dark-400">Admitted score cells</dt>
        <dd class="mt-1 font-mono text-2xl font-semibold text-dark-900 dark:text-white">{{ bridge.evidence.admittedObservationCount }}</dd>
      </div>
      <div class="rounded-2xl border border-primary-200/80 bg-white/80 p-4 dark:border-primary-800 dark:bg-dark-900/70">
        <dt class="text-xs uppercase tracking-wide text-dark-500 dark:text-dark-400">Study groups</dt>
        <dd class="mt-1 font-mono text-2xl font-semibold text-dark-900 dark:text-white">{{ bridge.evidence.studyGroupCount }}</dd>
      </div>
      <div class="rounded-2xl border border-primary-200/80 bg-white/80 p-4 dark:border-primary-800 dark:bg-dark-900/70">
        <dt class="text-xs uppercase tracking-wide text-dark-500 dark:text-dark-400">Evaluable holdouts</dt>
        <dd class="mt-1 font-mono text-2xl font-semibold text-dark-900 dark:text-white">{{ bridge.evidence.evaluableHoldouts }}</dd>
      </div>
    </dl>

    <ol v-if="bridge" class="grid gap-3 md:grid-cols-2 lg:grid-cols-5" aria-label="Thesis method layers">
      <li
        v-for="layer in bridge.layers"
        :key="layer.id"
        class="rounded-2xl border border-dark-200 bg-white/80 p-4 dark:border-dark-800 dark:bg-dark-900/70"
      >
        <p class="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300">{{ layer.label }}</p>
        <p class="mt-2 text-xs leading-5 text-dark-600 dark:text-dark-400">{{ layer.question }}</p>
        <p class="mt-3 font-mono text-xs text-dark-900 dark:text-white">{{ layer.methods.join(' · ') }}</p>
      </li>
    </ol>

    <div class="grid gap-3 rounded-2xl border border-amber-300 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100 sm:grid-cols-[1fr_auto] sm:items-center">
      <p>
        The application layer is currently a traceable software resource. AutoSelect evaluates
        profiles against the synthetic browser release; four pinned method contracts (LiVAE, CODE, GNODEVAE, and LAIOR) are
        now shape-checked. The dedicated scRL adapter now has a bounded synthetic CPU runtime receipt,
        identified by the <code class="font-mono text-[0.75rem]">scrl-adapter-v1</code> protocol,
        while public methods remain non-executable until its compiler/release binding and holdout gates close.
        The author-paper release remains an evidence and validation lane until a leakage-safe
        holdout is evaluable.
      </p>
      <div v-if="bridge" class="font-mono text-xs sm:text-right">
        <p>chain: {{ bridge.chain.rung }}</p>
        <p>claim: {{ bridge.evidence.claimStatus }}</p>
        <p>holdouts: {{ bridge.evidence.evaluableHoldouts }}</p>
      </div>
    </div>

    <p
      v-if="bridge"
      class="rounded-2xl border border-primary-200/80 bg-white/70 px-4 py-3 font-mono text-xs text-dark-700 dark:border-primary-800 dark:bg-dark-900/60 dark:text-dark-300"
      aria-label="scRL adapter runtime receipt"
    >
      scRL receipt: {{ bridge.runtime.scrlAdapter.protocol }} · {{ bridge.runtime.scrlAdapter.status }} ·
      {{ bridge.runtime.scrlAdapter.episodesCompleted }}/{{ bridge.runtime.scrlAdapter.episodesRequested }} episodes ·
      {{ bridge.runtime.scrlAdapter.fixtureObservations }}-cell synthetic CPU · compiler binding:
      {{ bridge.runtime.scrlAdapter.compilerBinding }}
    </p>

    <nav class="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Thesis integration links">
      <a
        v-if="bridge"
        :href="bridge.links.thesis"
        class="text-primary-700 underline decoration-primary-300 underline-offset-2 dark:text-primary-300"
        target="_blank"
        rel="noopener noreferrer"
      >
        Thesis repository
      </a>
      <a
        v-if="bridge"
        :href="bridge.links.portal"
        class="text-primary-700 underline decoration-primary-300 underline-offset-2 dark:text-primary-300"
        target="_blank"
        rel="noopener noreferrer"
      >
        SCPortal source
      </a>
    </nav>
  </section>
</template>

<script setup lang="ts">
import bridgeSnapshot from '../../../data/thesis-bridge.json'

interface ThesisLayer {
  id: string
  label: string
  question: string
  methods: string[]
}

interface ThesisBridge {
  publicationCount: number
  layerCount: number
  layers: ThesisLayer[]
  chain: {
    rung: string
    identityResolved: number
    configTemplates: number
    pinnedDistributions: number
    contractsCheckedAtPin: number
    contractsMatchingAtPin: number
  }
  runtime: {
    scrlAdapter: {
      protocol: string
      pinnedVersion: string
      status: string
      fixtureSynthetic: boolean
      fixtureObservations: number
      episodesRequested: number
      episodesCompleted: number
      stateValueShape: number[]
      compilerBinding: string
    }
  }
  evidence: {
    admittedObservationCount: number
    studyGroupCount: number
    evaluableHoldouts: number
    claimStatus: string
  }
  links: {
    thesis: string
    portal: string
  }
}

const bridge = bridgeSnapshot as ThesisBridge
</script>
