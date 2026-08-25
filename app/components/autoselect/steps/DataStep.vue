<template>
  <fieldset class="space-y-4">
    <legend class="text-lg font-semibold text-dark-900 dark:text-white">Data</legend>
    <p class="text-sm text-dark-600 dark:text-dark-400">
      Describe the assay and cell count. Unknown scale is a first-class choice and is not invented as a band.
    </p>
    <ChoiceGroup
      legend="Modality"
      description="Which assay generated this dataset?"
      :options="modalityOptions"
      :model-value="modality"
      @update:model-value="onModality"
    />
    <ChoiceGroup
      legend="Scale"
      description="Approximate cell count, or Unknown if the band is not known."
      :options="scaleOptions"
      :model-value="scale"
      @update:model-value="onScale"
    />
  </fieldset>
</template>

<script setup lang="ts">
import type { Modality, ScaleBand } from '../../../core/router/types'

defineProps<{
  modality: Modality | null
  scale: ScaleBand
}>()

const emit = defineEmits<{
  'update:modality': [value: Modality]
  'update:scale': [value: ScaleBand]
}>()

const modalityOptions = [
  { value: 'scrna', label: 'scRNA-seq', help: 'Gene expression counts.' },
  { value: 'scatac', label: 'scATAC-seq', help: 'Chromatin accessibility.' },
  { value: 'multiome', label: 'Multiome', help: 'Paired RNA and ATAC from the same cells.' },
]

const scaleOptions = [
  { value: 'lt_10k', label: 'Fewer than 10k cells', help: 'Small atlas or pilot study.' },
  { value: '10k_50k', label: '10k to 50k cells', help: 'Typical tissue-scale experiment.' },
  { value: '50k_200k', label: '50k to 200k cells', help: 'Large tissue or multi-sample study.' },
  { value: 'gt_200k', label: 'More than 200k cells', help: 'Atlas-scale collection.' },
  { value: 'unknown', label: 'Unknown / not sure', help: 'Widens matching and lowers confidence. Not treated as a guessed band.' },
]

function onModality(value: string | string[] | null) {
  if (value === 'scrna' || value === 'scatac' || value === 'multiome') {
    emit('update:modality', value)
  }
}

function onScale(value: string | string[] | null) {
  if (value === 'lt_10k' || value === '10k_50k' || value === '50k_200k' || value === 'gt_200k' || value === 'unknown') {
    emit('update:scale', value)
  }
}

</script>
