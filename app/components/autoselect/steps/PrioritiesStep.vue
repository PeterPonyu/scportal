<template>
  <fieldset class="space-y-4">
    <legend class="text-lg font-semibold text-dark-900 dark:text-white">Priorities</legend>
    <p class="text-sm text-dark-600 dark:text-dark-400">
      Relative emphasis across the six Router metric groups. Values stay as entered and must stay non-negative with a positive sum.
    </p>
    <div class="grid gap-4">
      <label
        v-for="group in groups"
        :key="group.key"
        class="grid gap-2 rounded-2xl border border-dark-200 bg-white p-4 dark:border-dark-800 dark:bg-dark-900"
      >
        <span class="flex items-baseline justify-between gap-3 text-sm">
          <span class="font-medium text-dark-900 dark:text-white">{{ group.label }}</span>
          <span class="font-mono text-dark-500 dark:text-dark-400">{{ weights[group.key].toFixed(2) }}</span>
        </span>
        <span class="text-xs text-dark-500 dark:text-dark-400">{{ group.help }}</span>
        <input
          :value="weights[group.key]"
          type="range"
          min="0"
          max="1"
          step="0.01"
          class="w-full accent-primary-600"
          :aria-valuemin="0"
          :aria-valuemax="1"
          :aria-valuenow="weights[group.key]"
          :aria-label="group.label"
          @input="onWeight(group.key, Number(($event.target as HTMLInputElement).value))"
        >
      </label>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import type { MetricGroup } from '../../../core/router/types'

const props = defineProps<{
  weights: Record<MetricGroup, number>
}>()

const emit = defineEmits<{
  'update:weights': [value: Record<MetricGroup, number>]
}>()

const groups: Array<{ key: MetricGroup, label: string, help: string }> = [
  { key: 'latent_geometry', label: 'Latent geometry', help: 'How faithfully the embedding preserves geometry.' },
  { key: 'continuity', label: 'Continuity', help: 'Smooth structure along a trajectory.' },
  { key: 'trajectory', label: 'Trajectory', help: 'Recovery of paths, branches, and order.' },
  { key: 'stability', label: 'Stability', help: 'Agreement under resampling or perturbation.' },
  { key: 'biology', label: 'Biology', help: 'Concordance with biological labels or genes.' },
  { key: 'resources', label: 'Resources', help: 'Compute and memory cost. Lower weight prefers cheaper methods less strongly.' },
]

function onWeight(key: MetricGroup, value: number) {
  emit('update:weights', { ...props.weights, [key]: value })
}
</script>
