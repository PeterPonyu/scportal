<template>
  <nav aria-label="AutoSelect steps">
    <ol class="grid gap-2 sm:grid-cols-7">
      <li
        v-for="(step, index) in steps"
        :key="step.id"
        class="rounded-xl border px-2 py-2 text-center text-xs font-medium"
        :class="step.id === current
          ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-950/50 dark:text-primary-300'
          : 'border-dark-200 text-dark-500 dark:border-dark-800 dark:text-dark-400'"
        :aria-current="step.id === current ? 'step' : undefined"
      >
        <span class="block font-mono">{{ index + 1 }}</span>
        <span>{{ step.label }}</span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import { WIZARD_STEPS, type WizardStep } from '../../autoselect/state'

defineProps<{
  current: WizardStep
}>()

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
