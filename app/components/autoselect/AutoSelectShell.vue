<template>
  <div class="space-y-6">
    <AutoSelectStepper :current="state.step" />

    <DataStep
      v-if="state.step === 'data'"
      :modality="state.modality"
      :scale="state.scale"
      @update:modality="state.modality = $event"
      @update:scale="state.scale = $event"
    />
    <GoalsStep
      v-else-if="state.step === 'goals'"
      :goals="state.goals"
      @update:goals="state.goals = $event"
    />
    <TopologyStep
      v-else-if="state.step === 'topology'"
      :topology="state.topology"
      @update:topology="state.topology = $event"
    />
    <PriorsStep
      v-else-if="state.step === 'priors'"
      :priors="state.priors"
      :perturbation="state.perturbation"
      @update:priors="state.priors = $event"
      @update:perturbation="state.perturbation = $event"
    />
    <PrioritiesStep
      v-else-if="state.step === 'priorities'"
      :weights="state.weights"
      @update:weights="state.weights = $event"
    />
    <EnvironmentStep
      v-else-if="state.step === 'environment'"
      :max-resource-tier="state.maxResourceTier"
      :min-effective-datasets="state.minEffectiveDatasets"
      :min-critical-coverage="state.minCriticalCoverage"
      :seed="state.seed"
      @update:max-resource-tier="state.maxResourceTier = $event"
      @update:min-effective-datasets="state.minEffectiveDatasets = $event"
      @update:min-critical-coverage="state.minCriticalCoverage = $event"
      @update:seed="state.seed = $event"
    />
    <ReviewStep
      v-else
      :modality="state.modality"
      :scale="state.scale"
      :goals="state.goals"
      :topology="state.topology"
      :priors="state.priors"
      :perturbation="state.perturbation"
      :weights="state.weights"
      :max-resource-tier="state.maxResourceTier"
      :min-effective-datasets="state.minEffectiveDatasets"
      :min-critical-coverage="state.minCriticalCoverage"
      :seed="state.seed"
    />

    <p v-if="validationMessage" class="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100" role="status">
      {{ validationMessage }}
    </p>

    <div class="flex flex-wrap gap-3">
      <button
        type="button"
        class="min-h-11 rounded-xl border border-dark-300 px-5 py-3 text-sm font-medium text-dark-700 transition-colors hover:bg-dark-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-700 dark:text-dark-200 dark:hover:bg-dark-800"
        :disabled="!canGoBack"
        @click="back"
      >
        Back
      </button>
      <button
        type="button"
        class="min-h-11 rounded-xl bg-primary-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="validationMessage !== null"
        @click="onContinue"
      >
        {{ state.step === 'review' ? 'Run' : 'Continue' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toTaskProfile } from '../../autoselect/state'
import type { TaskProfile } from '../../core/router/types'
import DataStep from './steps/DataStep.vue'
import EnvironmentStep from './steps/EnvironmentStep.vue'
import GoalsStep from './steps/GoalsStep.vue'
import PrioritiesStep from './steps/PrioritiesStep.vue'
import PriorsStep from './steps/PriorsStep.vue'
import ReviewStep from './steps/ReviewStep.vue'
import TopologyStep from './steps/TopologyStep.vue'

const emit = defineEmits<{
  run: [profile: TaskProfile]
}>()

const { state, canGoBack, validationMessage, next, back } = useAutoSelect()

function onContinue() {
  if (validationMessage.value !== null) return
  if (state.value.step === 'review') {
    emit('run', toTaskProfile(state.value))
    return
  }
  next()
}
</script>
