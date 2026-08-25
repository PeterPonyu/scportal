<template>
  <section class="space-y-3" aria-label="Evidence and provenance">
    <h4 class="text-sm font-medium text-dark-900 dark:text-white">Provenance</h4>
    <ul v-if="registryLinks.length > 0" class="space-y-2 text-sm">
      <li v-for="link in registryLinks" :key="link.href">
        <a
          :href="link.href"
          class="text-primary-700 underline decoration-primary-300 underline-offset-2 dark:text-primary-300"
          rel="noopener noreferrer"
          target="_blank"
        >
          {{ link.label }}
        </a>
      </li>
    </ul>
    <ul v-if="grouped.length > 0" class="space-y-2 text-sm">
      <li
        v-for="group in grouped"
        :key="`${group.paperId}:${group.locator}:${group.datasetId}`"
        class="rounded-xl border border-dark-200 px-3 py-2 dark:border-dark-700"
      >
        <p class="font-mono text-dark-900 dark:text-white">
          {{ group.paperId }} · {{ group.locator }} · {{ group.datasetId }}
        </p>
        <p v-if="group.synthetic" class="mt-1 text-xs font-medium uppercase tracking-wide text-amber-800 dark:text-amber-200">
          synthetic
        </p>
        <p
          v-for="link in group.links"
          :key="`${link.metricId}:${link.runConfigId}`"
          class="mt-1 font-mono text-xs text-dark-600 dark:text-dark-400"
        >
          {{ link.metricId }}
          <span v-if="link.synthetic" class="ml-1 uppercase">synthetic</span>
        </p>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import methodsJson from '../../../data/router/methods.json'
import { groupEvidenceLinks } from '../../services/download'
import type { MethodCapability, Recommendation } from '../../core/router/types'

const props = defineProps<{
  recommendation: Recommendation
}>()

const methods = methodsJson as MethodCapability[]
const method = computed(() => methods.find((entry) => entry.id === props.recommendation.methodId))
const grouped = computed(() => groupEvidenceLinks(props.recommendation.evidenceLinks))

const registryLinks = computed(() => {
  const current = method.value
  if (!current) return []
  return [
    { href: current.paperUrl, label: 'Paper' },
    { href: current.docsUrl, label: 'Docs' },
    { href: current.sourceUrl, label: 'Source' },
  ].filter((link) => link.href.startsWith('https://'))
})
</script>
