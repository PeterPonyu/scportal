<template>
  <section class="space-y-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40" role="status">
    <h2 class="text-lg font-semibold text-amber-950 dark:text-amber-100">Recommendation refused</h2>
    <p class="text-sm text-amber-950 dark:text-amber-100">{{ sentence }}</p>
    <p
      v-if="hasExactTie"
      class="text-sm text-amber-950 dark:text-amber-100"
    >
      The leading methods are in an exact tie; no method is selected as a winner.
    </p>
    <p class="text-sm text-amber-950 dark:text-amber-100">
      This refusal does not invent a winner.
    </p>
    <div class="grid gap-3 text-sm">
      <div>
        <h3 class="font-medium text-amber-900 dark:text-amber-200">Candidates</h3>
        <ul v-if="outcome.candidates.length > 0" class="mt-1 list-disc pl-5 font-mono">
          <li v-for="candidate in outcome.candidates" :key="candidate">{{ candidate }}</li>
        </ul>
        <p v-else class="mt-1">None remaining after hard constraints.</p>
      </div>
      <div>
        <h3 class="font-medium text-amber-900 dark:text-amber-200">Evidence gaps</h3>
        <ul class="mt-1 list-disc pl-5">
          <li v-for="gap in outcome.evidenceGaps" :key="gap">{{ gap }}</li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { RefusalCode, RouterOutcome } from '../../core/router/types'

const REFUSAL_SENTENCES: Record<RefusalCode, string> = {
  NO_COMPATIBLE_METHOD: 'No catalog method satisfies the hard capability constraints for this profile.',
  INSUFFICIENT_EVIDENCE: 'The available evidence is not enough to rank methods for this profile.',
  UNSTABLE_TOP_THREE: 'The leading methods are not stable enough under resampling to recommend.',
  CRITICAL_COVERAGE_GAP: 'No candidate has enough critical metric-group coverage for this profile.',
  CONFLICTING_REQUIREMENTS: 'The selected goals, priors, and resource limits cannot be satisfied together.',
}

const props = defineProps<{
  outcome: Extract<RouterOutcome, { status: 'REFUSED' }>
}>()

const sentence = computed(() => REFUSAL_SENTENCES[props.outcome.code])
const hasExactTie = computed(() => (
  props.outcome.code === 'INSUFFICIENT_EVIDENCE'
  && props.outcome.evidenceGaps.some((gap) => gap.includes('exact tie'))
))
</script>
