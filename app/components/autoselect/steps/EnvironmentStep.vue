<template>
  <fieldset class="space-y-4">
    <legend class="text-lg font-semibold text-dark-900 dark:text-white">Environment</legend>
    <p class="text-sm text-dark-600 dark:text-dark-400">
      Resource ceiling and evidence thresholds used when the Router ranks methods. Defaults are safe for Quick mode.
    </p>
    <ChoiceGroup
      legend="Maximum resource tier"
      description="1 is lightest. 3 allows the most expensive methods."
      :options="tierOptions"
      :model-value="String(maxResourceTier)"
      @update:model-value="onTier"
    />
    <label class="grid gap-2 rounded-2xl border border-dark-200 bg-white p-4 text-sm dark:border-dark-800 dark:bg-dark-900">
      <span class="font-medium text-dark-900 dark:text-white">Minimum effective datasets</span>
      <input
        :value="minEffectiveDatasets"
        type="number"
        min="1"
        step="1"
        class="rounded-lg border border-dark-200 bg-white px-3 py-2 font-mono dark:border-dark-700 dark:bg-dark-950"
        @input="onDatasets(Number(($event.target as HTMLInputElement).value))"
      >
    </label>
    <label class="grid gap-2 rounded-2xl border border-dark-200 bg-white p-4 text-sm dark:border-dark-800 dark:bg-dark-900">
      <span class="font-medium text-dark-900 dark:text-white">Minimum critical coverage</span>
      <input
        :value="minCriticalCoverage"
        type="number"
        min="0"
        max="1"
        step="0.05"
        class="rounded-lg border border-dark-200 bg-white px-3 py-2 font-mono dark:border-dark-700 dark:bg-dark-950"
        @input="onCoverage(Number(($event.target as HTMLInputElement).value))"
      >
    </label>
    <label class="grid gap-2 rounded-2xl border border-dark-200 bg-white p-4 text-sm dark:border-dark-800 dark:bg-dark-900">
      <span class="font-medium text-dark-900 dark:text-white">Deterministic seed</span>
      <input
        :value="seed"
        type="number"
        min="0"
        max="4294967295"
        step="1"
        class="rounded-lg border border-dark-200 bg-white px-3 py-2 font-mono dark:border-dark-700 dark:bg-dark-950"
        @input="onSeed(Number(($event.target as HTMLInputElement).value))"
      >
    </label>
  </fieldset>
</template>

<script setup lang="ts">
defineProps<{
  maxResourceTier: 1 | 2 | 3
  minEffectiveDatasets: number
  minCriticalCoverage: number
  seed: number
}>()

const emit = defineEmits<{
  'update:maxResourceTier': [value: 1 | 2 | 3]
  'update:minEffectiveDatasets': [value: number]
  'update:minCriticalCoverage': [value: number]
  'update:seed': [value: number]
}>()

const tierOptions = [
  { value: '1', label: 'Tier 1', help: 'Laptop-scale methods only.' },
  { value: '2', label: 'Tier 2', help: 'Typical workstation budget. Default.' },
  { value: '3', label: 'Tier 3', help: 'Allow the most expensive registered methods.' },
]

function onTier(value: string | string[] | null) {
  if (value === '1' || value === '2' || value === '3') {
    emit('update:maxResourceTier', Number(value) as 1 | 2 | 3)
  }
}

function onDatasets(value: number) {
  emit('update:minEffectiveDatasets', value)
}

function onCoverage(value: number) {
  emit('update:minCriticalCoverage', value)
}

function onSeed(value: number) {
  emit('update:seed', value)
}

</script>
