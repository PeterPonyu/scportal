<template>
  <section class="space-y-6 rounded-2xl border border-dark-200 bg-dark-50/60 p-4 dark:border-dark-800 dark:bg-dark-950/40" aria-label="Advanced controls">
    <p class="text-sm text-dark-600 dark:text-dark-400">
      Advanced edits the same TaskProfile fields as Quick. It does not fork ranking.
    </p>
    <WeightEditor :weights="weights" @update:weights="emit('update:weights', $event)" />
    <MethodCandidatePicker
      :model-value="candidateMethodIds"
      @update:model-value="emit('update:candidateMethodIds', $event)"
    />
  </section>
</template>

<script setup lang="ts">
import type { MetricGroup } from '../../core/router/types'
import MethodCandidatePicker from './MethodCandidatePicker.vue'
import WeightEditor from './WeightEditor.vue'

defineProps<{
  weights: Record<MetricGroup, number>
  candidateMethodIds?: string[]
}>()

const emit = defineEmits<{
  'update:weights': [value: Record<MetricGroup, number>]
  'update:candidateMethodIds': [value: string[] | undefined]
}>()
</script>
