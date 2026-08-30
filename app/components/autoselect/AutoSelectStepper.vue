<template>
  <nav aria-label="AutoSelect steps" class="space-y-3">
    <div class="flex items-center justify-between text-xs font-medium text-dark-600 dark:text-dark-400">
      <span>Step {{ currentIndex + 1 }} of {{ steps.length }}</span>
      <span>{{ steps[currentIndex]?.label }}</span>
    </div>
    <div class="h-1 overflow-hidden rounded-full bg-dark-200 dark:bg-dark-800">
      <div
        class="h-full rounded-full bg-primary-700 transition-[width] duration-300 dark:bg-primary-500"
        :style="{ width: `${((currentIndex + 1) / steps.length) * 100}%` }"
      />
    </div>
    <ol class="grid gap-2 sm:grid-cols-7">
      <li
        v-for="(step, index) in steps"
        :key="step.id"
        class="flex items-center gap-2 rounded-xl border px-2 py-2 text-xs font-medium transition-colors sm:flex-col sm:gap-1 sm:text-center"
        :class="index === currentIndex
          ? 'border-primary-500 bg-primary-50 text-primary-800 dark:border-primary-500 dark:bg-primary-950/60 dark:text-primary-200'
          : index < currentIndex
            ? 'border-primary-200 text-primary-800 dark:border-primary-900 dark:text-primary-300'
            : 'border-dark-200 text-dark-500 dark:border-dark-800 dark:text-dark-400'"
        :aria-current="index === currentIndex ? 'step' : undefined"
      >
        <span
          class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[0.65rem]"
          :class="index < currentIndex
            ? 'bg-primary-700 text-white'
            : index === currentIndex
              ? 'bg-primary-700 text-white'
              : 'bg-dark-200 text-dark-600 dark:bg-dark-800 dark:text-dark-300'"
        >
          <svg v-if="index < currentIndex" class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <template v-else>{{ index + 1 }}</template>
        </span>
        <span>{{ step.label }}</span>
        <span v-if="index < currentIndex" class="sr-only">completed</span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import { WIZARD_STEPS, type WizardStep } from '../../autoselect/state'

const props = defineProps<{
  current: WizardStep
}>()

const currentIndex = computed(() => Math.max(0, WIZARD_STEPS.indexOf(props.current)))

const steps = WIZARD_STEPS.map((id) => ({
  id,
  label: ({
    data: 'Data',
    goals: 'Goals',
    topology: 'Topology',
    priors: 'Priors',
    priorities: 'Priorities',
    environment: 'Environment',
    review: 'Review',
  })[id],
}))
</script>
