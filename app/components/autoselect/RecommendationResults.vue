<template>
  <section v-if="outcome" class="space-y-6" aria-label="Router results">
    <template v-if="outcome.status === 'OK'">
      <p class="text-sm text-dark-600 dark:text-dark-400">
        Recommendations apply only to the submitted profile. No method is treated as universally best.
      </p>
      <RecommendationCard
        v-for="recommendation in outcome.recommendations"
        :key="recommendation.methodId"
        :recommendation="recommendation"
      />
      <ReceiptStrip :receipt="outcome.receipt" />
    </template>
    <RefusalPanel v-else :outcome="outcome" />
  </section>
</template>

<script setup lang="ts">
import type { RouterOutcome } from '../../core/router/types'
import ReceiptStrip from './ReceiptStrip.vue'
import RecommendationCard from './RecommendationCard.vue'
import RefusalPanel from './RefusalPanel.vue'

defineProps<{
  outcome: RouterOutcome | null
}>()
</script>
