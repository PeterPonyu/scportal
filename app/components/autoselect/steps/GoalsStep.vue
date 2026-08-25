<template>
  <fieldset class="space-y-4">
    <legend class="text-lg font-semibold text-dark-900 dark:text-white">Goals</legend>
    <p class="text-sm text-dark-600 dark:text-dark-400">
      Choose one or two scientific goals. The Router uses these groups to decide which evidence is mandatory.
    </p>
    <ChoiceGroup
      legend="Scientific goals"
      description="Select at most two goals."
      :options="goalOptions"
      multiple
      :max="2"
      :model-value="goals"
      @update:model-value="onGoals"
    />
    <p class="text-sm text-dark-600 dark:text-dark-400" aria-live="polite">
      {{ liveMessage }}
    </p>
  </fieldset>
</template>

<script setup lang="ts">
import type { TaskGoal } from '../../../core/router/types'
import ChoiceGroup from '../ChoiceGroup.vue'

const props = defineProps<{
  goals: TaskGoal[]
}>()

const emit = defineEmits<{
  'update:goals': [value: TaskGoal[]]
}>()

const goalOptions = [
  { value: 'latent_representation', label: 'Latent representation', help: 'A low-dimensional embedding of cell state.' },
  { value: 'trajectory_reconstruction', label: 'Trajectory reconstruction', help: 'A continuous path or pseudotime along development.' },
  { value: 'fate_decision', label: 'Fate decision', help: 'Where cells choose among outgoing branches.' },
  { value: 'lineage_contribution', label: 'Lineage contribution', help: 'How ancestors contribute to terminal populations.' },
]

const liveMessage = computed(() => {
  if (props.goals.length >= 2) return 'Select at most two scientific goals.'
  if (props.goals.length === 0) return 'Select at least one scientific goal.'
  return 'One more goal is optional.'
})

function onGoals(value: string | string[] | null) {
  const selected = Array.isArray(value) ? value : []
  const goals = selected.filter((entry): entry is TaskGoal => {
    return entry === 'latent_representation'
      || entry === 'trajectory_reconstruction'
      || entry === 'fate_decision'
      || entry === 'lineage_contribution'
  }).slice(0, 2)
  emit('update:goals', goals)
}
</script>
