<template>
  <fieldset class="space-y-4">
    <legend class="text-lg font-semibold text-dark-900 dark:text-white">Metric-group weights</legend>
    <p class="text-sm text-dark-600 dark:text-dark-400">
      These six primary groups are the only weight sliders. ARI and NMI are auxiliary
      metrics; they are mentioned here as text and are not additional weight sliders.
    </p>
    <div class="grid gap-4">
      <label class="grid gap-2 rounded-2xl border border-dark-200 bg-white p-4 dark:border-dark-800 dark:bg-dark-900">
        <span class="flex items-baseline justify-between gap-3 text-sm">
          <span class="font-medium text-dark-900 dark:text-white">Latent geometry</span>
          <span class="font-mono text-dark-500 dark:text-dark-400">{{ weights.latent_geometry.toFixed(2) }}</span>
        </span>
        <input
          :value="weights.latent_geometry"
          type="range"
          min="0"
          max="1"
          step="0.01"
          class="w-full accent-primary-600"
          aria-label="Latent geometry"
          @input="onWeight('latent_geometry', Number(($event.target as HTMLInputElement).value))"
        >
      </label>
      <label class="grid gap-2 rounded-2xl border border-dark-200 bg-white p-4 dark:border-dark-800 dark:bg-dark-900">
        <span class="flex items-baseline justify-between gap-3 text-sm">
          <span class="font-medium text-dark-900 dark:text-white">Continuity</span>
          <span class="font-mono text-dark-500 dark:text-dark-400">{{ weights.continuity.toFixed(2) }}</span>
        </span>
        <input
          :value="weights.continuity"
          type="range"
          min="0"
          max="1"
          step="0.01"
          class="w-full accent-primary-600"
          aria-label="Continuity"
          @input="onWeight('continuity', Number(($event.target as HTMLInputElement).value))"
        >
      </label>
      <label class="grid gap-2 rounded-2xl border border-dark-200 bg-white p-4 dark:border-dark-800 dark:bg-dark-900">
        <span class="flex items-baseline justify-between gap-3 text-sm">
          <span class="font-medium text-dark-900 dark:text-white">Trajectory</span>
          <span class="font-mono text-dark-500 dark:text-dark-400">{{ weights.trajectory.toFixed(2) }}</span>
        </span>
        <input
          :value="weights.trajectory"
          type="range"
          min="0"
          max="1"
          step="0.01"
          class="w-full accent-primary-600"
          aria-label="Trajectory"
          @input="onWeight('trajectory', Number(($event.target as HTMLInputElement).value))"
        >
      </label>
      <label class="grid gap-2 rounded-2xl border border-dark-200 bg-white p-4 dark:border-dark-800 dark:bg-dark-900">
        <span class="flex items-baseline justify-between gap-3 text-sm">
          <span class="font-medium text-dark-900 dark:text-white">Stability</span>
          <span class="font-mono text-dark-500 dark:text-dark-400">{{ weights.stability.toFixed(2) }}</span>
        </span>
        <input
          :value="weights.stability"
          type="range"
          min="0"
          max="1"
          step="0.01"
          class="w-full accent-primary-600"
          aria-label="Stability"
          @input="onWeight('stability', Number(($event.target as HTMLInputElement).value))"
        >
      </label>
      <label class="grid gap-2 rounded-2xl border border-dark-200 bg-white p-4 dark:border-dark-800 dark:bg-dark-900">
        <span class="flex items-baseline justify-between gap-3 text-sm">
          <span class="font-medium text-dark-900 dark:text-white">Biology</span>
          <span class="font-mono text-dark-500 dark:text-dark-400">{{ weights.biology.toFixed(2) }}</span>
        </span>
        <input
          :value="weights.biology"
          type="range"
          min="0"
          max="1"
          step="0.01"
          class="w-full accent-primary-600"
          aria-label="Biology"
          @input="onWeight('biology', Number(($event.target as HTMLInputElement).value))"
        >
      </label>
      <label class="grid gap-2 rounded-2xl border border-dark-200 bg-white p-4 dark:border-dark-800 dark:bg-dark-900">
        <span class="flex items-baseline justify-between gap-3 text-sm">
          <span class="font-medium text-dark-900 dark:text-white">Resources</span>
          <span class="font-mono text-dark-500 dark:text-dark-400">{{ weights.resources.toFixed(2) }}</span>
        </span>
        <input
          :value="weights.resources"
          type="range"
          min="0"
          max="1"
          step="0.01"
          class="w-full accent-primary-600"
          aria-label="Resources"
          @input="onWeight('resources', Number(($event.target as HTMLInputElement).value))"
        >
      </label>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import type { MetricGroup } from '../../core/router/types'

const props = defineProps<{
  weights: Record<MetricGroup, number>
}>()

const emit = defineEmits<{
  'update:weights': [value: Record<MetricGroup, number>]
}>()

function onWeight(key: MetricGroup, value: number) {
  emit('update:weights', { ...props.weights, [key]: value })
}
</script>
