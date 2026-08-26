<template>
  <fieldset class="space-y-4">
    <legend class="text-lg font-semibold text-dark-900 dark:text-white">Priorities</legend>
    <p v-if="mode === 'quick'" class="text-sm text-dark-600 dark:text-dark-400">
      These defaults are locked in Quick; switch to Advanced to edit weights.
    </p>
    <p v-else class="text-sm text-dark-600 dark:text-dark-400">
      Edit weights in Advanced controls above.
    </p>
    <dl v-if="mode === 'quick'" class="grid gap-4">
      <div
        v-for="group in groups"
        :key="group.key"
        class="grid gap-2 rounded-2xl border border-dark-200 bg-white p-4 dark:border-dark-800 dark:bg-dark-900"
      >
        <div class="flex items-baseline justify-between gap-3 text-sm">
          <dt class="font-medium text-dark-900 dark:text-white">{{ group.label }}</dt>
          <dd class="font-mono text-dark-500 dark:text-dark-400">{{ weights[group.key].toFixed(2) }}</dd>
        </div>
        <p class="text-xs text-dark-500 dark:text-dark-400">{{ group.help }}</p>
      </div>
    </dl>
  </fieldset>
</template>

<script setup lang="ts">
import type { AutoSelectMode } from '../../../autoselect/state'
import type { MetricGroup } from '../../../core/router/types'

defineProps<{
  mode: AutoSelectMode
  weights: Record<MetricGroup, number>
}>()

const groups: Array<{ key: MetricGroup, label: string, help: string }> = [
  { key: 'latent_geometry', label: 'Latent geometry', help: 'How faithfully the embedding preserves geometry.' },
  { key: 'continuity', label: 'Continuity', help: 'Smooth structure along a trajectory.' },
  { key: 'trajectory', label: 'Trajectory', help: 'Recovery of paths, branches, and order.' },
  { key: 'stability', label: 'Stability', help: 'Agreement under resampling or perturbation.' },
  { key: 'biology', label: 'Biology', help: 'Concordance with biological labels or genes.' },
  { key: 'resources', label: 'Resources', help: 'Compute and memory cost. Lower weight prefers cheaper methods less strongly.' },
]
</script>
