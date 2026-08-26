<template>
  <fieldset class="space-y-4">
    <legend class="text-lg font-semibold text-dark-900 dark:text-white">Review</legend>
    <p class="text-sm text-dark-600 dark:text-dark-400">
      No expression matrix or cell-level data leaves this browser.
    </p>
    <dl class="grid gap-3 text-sm">
      <div class="rounded-2xl border border-dark-200 bg-white p-4 dark:border-dark-800 dark:bg-dark-900">
        <dt class="font-medium text-dark-500 dark:text-dark-400">Modality</dt>
        <dd class="mt-1 font-mono text-dark-900 dark:text-white">{{ modalityLabel }}</dd>
      </div>
      <div class="rounded-2xl border border-dark-200 bg-white p-4 dark:border-dark-800 dark:bg-dark-900">
        <dt class="font-medium text-dark-500 dark:text-dark-400">Scale</dt>
        <dd class="mt-1 font-mono text-dark-900 dark:text-white">{{ scale }}</dd>
      </div>
      <div class="rounded-2xl border border-dark-200 bg-white p-4 dark:border-dark-800 dark:bg-dark-900">
        <dt class="font-medium text-dark-500 dark:text-dark-400">Goals</dt>
        <dd class="mt-1 font-mono text-dark-900 dark:text-white">{{ goalsLabel }}</dd>
      </div>
      <div class="rounded-2xl border border-dark-200 bg-white p-4 dark:border-dark-800 dark:bg-dark-900">
        <dt class="font-medium text-dark-500 dark:text-dark-400">Topology</dt>
        <dd class="mt-1 font-mono text-dark-900 dark:text-white">{{ topology }}</dd>
      </div>
      <div class="rounded-2xl border border-dark-200 bg-white p-4 dark:border-dark-800 dark:bg-dark-900">
        <dt class="font-medium text-dark-500 dark:text-dark-400">Priors</dt>
        <dd class="mt-1 font-mono text-dark-900 dark:text-white">{{ priorsLabel }}</dd>
      </div>
      <div class="rounded-2xl border border-dark-200 bg-white p-4 dark:border-dark-800 dark:bg-dark-900">
        <dt class="font-medium text-dark-500 dark:text-dark-400">Perturbation</dt>
        <dd class="mt-1 font-mono text-dark-900 dark:text-white">{{ String(perturbation) }}</dd>
      </div>
      <div class="rounded-2xl border border-dark-200 bg-white p-4 dark:border-dark-800 dark:bg-dark-900">
        <dt class="font-medium text-dark-500 dark:text-dark-400">Priority weights</dt>
        <dd class="mt-1 font-mono text-dark-900 dark:text-white">{{ weightsLabel }}</dd>
      </div>
      <div class="rounded-2xl border border-dark-200 bg-white p-4 dark:border-dark-800 dark:bg-dark-900">
        <dt class="font-medium text-dark-500 dark:text-dark-400">Resource tier</dt>
        <dd class="mt-1 font-mono text-dark-900 dark:text-white">{{ maxResourceTier }}</dd>
      </div>
      <div class="rounded-2xl border border-dark-200 bg-white p-4 dark:border-dark-800 dark:bg-dark-900">
        <dt class="font-medium text-dark-500 dark:text-dark-400">Candidate methods</dt>
        <dd class="mt-1 font-mono text-dark-900 dark:text-white">{{ candidateMethodsLabel }}</dd>
      </div>
      <div class="rounded-2xl border border-dark-200 bg-white p-4 dark:border-dark-800 dark:bg-dark-900">
        <dt class="font-medium text-dark-500 dark:text-dark-400">Evidence thresholds</dt>
        <dd v-if="mode === 'advanced'" class="mt-1 font-mono text-dark-900 dark:text-white">
          minEffectiveDatasets={{ minEffectiveDatasets }}; minCriticalCoverage={{ minCriticalCoverage }}; seed={{ seed }}
        </dd>
        <dd v-else class="mt-1 font-mono text-dark-900 dark:text-white">
          Locked Quick defaults: minEffectiveDatasets={{ minEffectiveDatasets }}; minCriticalCoverage={{ minCriticalCoverage }}; seed={{ seed }}
        </dd>
      </div>
    </dl>
  </fieldset>
</template>

<script setup lang="ts">
import type { AutoSelectMode } from '../../../autoselect/state'
import type { MetricGroup, Modality, PriorKey, ScaleBand, TaskGoal, Topology } from '../../../core/router/types'

const props = defineProps<{
  mode: AutoSelectMode
  modality: Modality | null
  scale: ScaleBand
  goals: TaskGoal[]
  topology: Topology
  priors: Partial<Record<PriorKey, boolean | 'unknown'>>
  perturbation: boolean | 'unknown'
  weights: Record<MetricGroup, number>
  maxResourceTier: 1 | 2 | 3
  minEffectiveDatasets: number
  minCriticalCoverage: number
  seed: number
  candidateMethodIds?: string[]
}>()

const modalityLabel = computed(() => props.modality ?? 'not selected')
const goalsLabel = computed(() => props.goals.length > 0 ? props.goals.join(', ') : 'none')
const priorsLabel = computed(() => {
  const keys: PriorKey[] = ['time', 'root_state', 'terminal_states', 'labels', 'perturbation']
  return keys.map((key) => `${key}=${String(props.priors[key] ?? 'unknown')}`).join('; ')
})
const weightsLabel = computed(() => {
  const keys: MetricGroup[] = ['latent_geometry', 'continuity', 'trajectory', 'stability', 'biology', 'resources']
  return keys.map((key) => `${key}=${props.weights[key]}`).join('; ')
})
const candidateMethodsLabel = computed(() => {
  if (props.candidateMethodIds === undefined || props.candidateMethodIds.length === 0) {
    return 'all catalog methods'
  }
  return props.candidateMethodIds.join(', ')
})
</script>
