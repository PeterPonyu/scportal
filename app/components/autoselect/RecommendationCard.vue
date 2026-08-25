<template>
  <article class="space-y-4 rounded-2xl border border-dark-200 bg-white p-4 dark:border-dark-800 dark:bg-dark-900">
    <header class="space-y-2">
      <p class="text-xs font-medium uppercase tracking-wide text-dark-500 dark:text-dark-400">
        Roles for this profile: {{ roleLabel }}
      </p>
      <h3 class="font-mono text-lg font-semibold text-dark-900 dark:text-white">
        {{ recommendation.methodId }}
        <span class="text-sm font-normal text-dark-500 dark:text-dark-400">version {{ methodVersion }}</span>
      </h3>
      <p class="text-sm text-dark-600 dark:text-dark-400">
        This is a profile-specific recommendation, not a universally ranked method.
      </p>
    </header>

    <dl class="grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <dt class="font-medium text-dark-500 dark:text-dark-400">Pareto layer</dt>
        <dd class="mt-1 font-mono text-dark-900 dark:text-white">{{ recommendation.paretoLayer }}</dd>
      </div>
      <div>
        <dt class="font-medium text-dark-500 dark:text-dark-400">Outranking flow</dt>
        <dd class="mt-1 font-mono text-dark-900 dark:text-white">{{ String(recommendation.outrankingFlow) }}</dd>
      </div>
      <div>
        <dt class="font-medium text-dark-500 dark:text-dark-400">Conservative utility</dt>
        <dd class="mt-1 font-mono text-dark-900 dark:text-white">{{ String(recommendation.conservativeUtility) }}</dd>
      </div>
      <div>
        <dt class="font-medium text-dark-500 dark:text-dark-400">Confidence</dt>
        <dd class="mt-1 text-dark-900 dark:text-white">
          <span class="font-medium">{{ recommendation.confidence }}</span>
          <span class="ml-1 text-dark-500 dark:text-dark-400">(text grade, not color-only)</span>
        </dd>
      </div>
      <div>
        <dt class="font-medium text-dark-500 dark:text-dark-400">Top-3 retention</dt>
        <dd class="mt-1 font-mono text-dark-900 dark:text-white">{{ String(recommendation.topThreeRetention) }}</dd>
      </div>
      <div>
        <dt class="font-medium text-dark-500 dark:text-dark-400">Effective datasets</dt>
        <dd class="mt-1 font-mono text-dark-900 dark:text-white">{{ String(recommendation.effectiveDatasets) }}</dd>
      </div>
      <div>
        <dt class="font-medium text-dark-500 dark:text-dark-400">Critical coverage</dt>
        <dd class="mt-1 font-mono text-dark-900 dark:text-white">{{ String(recommendation.criticalCoverage) }}</dd>
      </div>
    </dl>

    <section>
      <h4 class="text-sm font-medium text-dark-900 dark:text-white">Positive evidence details</h4>
      <ul v-if="recommendation.positiveEvidenceDetails.length > 0" class="mt-2 space-y-2 text-sm">
        <li
          v-for="detail in recommendation.positiveEvidenceDetails"
          :key="detail.group"
          class="rounded-xl border border-dark-200 px-3 py-2 dark:border-dark-700"
        >
          <p class="font-medium text-dark-900 dark:text-white">{{ detail.group }}</p>
          <p class="font-mono text-xs text-dark-600 dark:text-dark-400">
            score {{ String(detail.score) }}; baseline {{ String(detail.baseline) }}; contribution {{ String(detail.contribution) }}
          </p>
          <p class="mt-1 text-dark-600 dark:text-dark-400">{{ detail.text }}</p>
        </li>
      </ul>
      <p v-else class="mt-2 text-sm text-dark-600 dark:text-dark-400">No supporting group scored above baseline.</p>
    </section>

    <section>
      <h4 class="text-sm font-medium text-dark-900 dark:text-white">Limitations</h4>
      <ul class="mt-2 list-disc pl-5 text-sm text-dark-700 dark:text-dark-300">
        <li v-for="limitation in recommendation.limitations" :key="limitation">{{ limitation }}</li>
      </ul>
    </section>

    <section>
      <h4 class="text-sm font-medium text-dark-900 dark:text-white">Confidence reasons</h4>
      <ul class="mt-2 list-disc pl-5 text-sm text-dark-700 dark:text-dark-300">
        <li v-for="reason in recommendation.confidenceReasons" :key="reason">{{ reason }}</li>
      </ul>
    </section>

    <section>
      <h4 class="text-sm font-medium text-dark-900 dark:text-white">Alternative dispositions</h4>
      <ul class="mt-2 space-y-2 text-sm">
        <li
          v-for="disposition in recommendation.alternativeDispositions"
          :key="disposition.methodId"
          class="rounded-xl border border-dark-200 px-3 py-2 dark:border-dark-700"
        >
          <p class="font-mono text-dark-900 dark:text-white">{{ disposition.methodId }} — {{ disposition.status }}</p>
          <p class="text-dark-600 dark:text-dark-400">{{ disposition.reasons.join('; ') }}</p>
        </li>
      </ul>
    </section>
  </article>
</template>

<script setup lang="ts">
import methodsJson from '../../../data/router/methods.json'
import type { MethodCapability, Recommendation, RecommendationRole } from '../../core/router/types'

const ROLE_LABELS: Record<RecommendationRole, string> = {
  best_fit: 'best fit for this profile',
  robust_alternative: 'robust alternative',
  resource_aware: 'resource-aware alternative',
}

const props = defineProps<{
  recommendation: Recommendation
}>()

const methods = methodsJson as MethodCapability[]
const methodVersion = computed(() => methods.find((method) => method.id === props.recommendation.methodId)?.version ?? 'unknown')
const roleLabel = computed(() => props.recommendation.roles.map((role) => ROLE_LABELS[role]).join(', '))
</script>
