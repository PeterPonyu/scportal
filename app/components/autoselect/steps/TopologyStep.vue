<template>
  <fieldset class="space-y-4">
    <legend class="text-lg font-semibold text-dark-900 dark:text-white">Topology</legend>
    <p class="text-sm text-dark-600 dark:text-dark-400">
      Expected trajectory shape, including mixed discrete–continuous structure. Unknown is kept as unknown.
    </p>
    <ChoiceGroup
      legend="Expected topology"
      description="Pick the closest structure, or Unknown if it is not known."
      :options="topologyOptions"
      :model-value="topology"
      @update:model-value="onTopology"
    />
  </fieldset>
</template>

<script setup lang="ts">
import type { Topology } from '../../../core/router/types'
import ChoiceGroup from '../ChoiceGroup.vue'

defineProps<{
  topology: Topology
}>()

const emit = defineEmits<{
  'update:topology': [value: Topology]
}>()

const topologyOptions = [
  { value: 'linear', label: 'Linear', help: 'A single path from start to end.' },
  { value: 'bifurcating', label: 'Bifurcating', help: 'One split into two outgoing fates.' },
  { value: 'multibranch', label: 'Multibranch', help: 'More than two outgoing branches.' },
  { value: 'cyclic', label: 'Cyclic', help: 'A cycle such as a cell cycle.' },
  { value: 'mixed', label: 'Mixed discrete and continuous', help: 'Clusters plus continuous structure in the same dataset.' },
  { value: 'unknown', label: 'Unknown / not sure', help: 'Widens matching. Not rewritten to linear or mixed.' },
]

function onTopology(value: string | string[] | null) {
  if (
    value === 'linear'
    || value === 'bifurcating'
    || value === 'multibranch'
    || value === 'cyclic'
    || value === 'mixed'
    || value === 'unknown'
  ) {
    emit('update:topology', value)
  }
}

</script>
