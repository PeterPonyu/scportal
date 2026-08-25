<template>
  <fieldset class="space-y-4">
    <legend class="text-lg font-semibold text-dark-900 dark:text-white">Priors</legend>
    <p class="text-sm text-dark-600 dark:text-dark-400">
      Say whether each prior is available. Unknown is valid and is not treated as absent or present.
    </p>
    <ChoiceGroup
      v-for="field in priorFields"
      :key="field.key"
      :legend="field.label"
      :description="field.help"
      :options="priorOptions"
      :model-value="choiceValue(field.key)"
      @update:model-value="onPrior(field.key, $event)"
    />
  </fieldset>
</template>

<script setup lang="ts">
import type { PriorKey } from '../../../core/router/types'

const props = defineProps<{
  priors: Partial<Record<PriorKey, boolean | 'unknown'>>
  perturbation: boolean | 'unknown'
}>()

const emit = defineEmits<{
  'update:priors': [value: Partial<Record<PriorKey, boolean | 'unknown'>>]
  'update:perturbation': [value: boolean | 'unknown']
}>()

const priorFields: Array<{ key: PriorKey, label: string, help: string }> = [
  { key: 'time', label: 'Time prior', help: 'Experimental time points or a known temporal order.' },
  { key: 'root_state', label: 'Root state', help: 'A known starting population or root cell set.' },
  { key: 'terminal_states', label: 'Terminal states', help: 'Known end points or terminal lineages.' },
  { key: 'labels', label: 'Cell labels', help: 'Cluster, type, or other discrete labels.' },
  { key: 'perturbation', label: 'Perturbation', help: 'A treatment, knockout, or other perturbation condition.' },
]

const priorOptions = [
  { value: 'true', label: 'Yes', help: 'This prior is available.' },
  { value: 'false', label: 'No', help: 'This prior is not available.' },
  { value: 'unknown', label: 'Unknown / not sure', help: 'Leave unresolved. Do not invent yes or no.' },
]

function asPrior(value: string | string[] | null): boolean | 'unknown' | null {
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'unknown') return 'unknown'
  return null
}

function choiceValue(key: PriorKey): string {
  const value = key === 'perturbation' ? props.perturbation : props.priors[key]
  if (value === true) return 'true'
  if (value === false) return 'false'
  return 'unknown'
}

function onPrior(key: PriorKey, raw: string | string[] | null) {
  const value = asPrior(raw)
  if (value === null) return
  const next = { ...props.priors, [key]: value }
  emit('update:priors', next)
  if (key === 'perturbation') emit('update:perturbation', value)
}
</script>
