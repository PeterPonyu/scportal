<template>
  <div class="space-y-6">
    <ModeToggle :mode="state.mode" @update:mode="setMode" />
    <AdvancedControls
      v-if="state.mode === 'advanced'"
      :weights="state.weights"
      :candidate-method-ids="state.candidateMethodIds"
      @update:weights="state.weights = $event"
      @update:candidate-method-ids="onCandidateMethodIds"
    />
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
      :mode="state.mode"
      :weights="state.weights"
    />
    <EnvironmentStep
      v-else-if="state.step === 'environment'"
      :mode="state.mode"
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
      :mode="state.mode"
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
      :candidate-method-ids="state.candidateMethodIds"
    />

    <p v-if="validationMessage" aria-live="polite" class="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100" role="status">
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
        :disabled="validationMessage !== null || routerState.status === 'loading'"
        @click="onContinue"
      >
        {{ state.step === 'review' ? 'Run' : 'Continue' }}
      </button>
      <button
        v-if="routerState.status === 'loading'"
        type="button"
        class="min-h-11 rounded-xl border border-dark-300 px-5 py-3 text-sm font-medium text-dark-700 transition-colors hover:bg-dark-100 dark:border-dark-700 dark:text-dark-200 dark:hover:bg-dark-800"
        @click="cancel"
      >
        Cancel
      </button>
    </div>

    <p v-if="routerState.status === 'loading'" aria-live="polite" class="text-sm text-dark-600 dark:text-dark-400" role="status">
      Computing a recommendation without blocking the page…
    </p>
    <p
      v-else-if="routerState.status === 'error'"
      aria-live="polite"
      class="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-700 dark:bg-red-950/40 dark:text-red-100"
      role="status"
    >
      {{ routerState.message }}
    </p>
    <p
      v-if="staleResult"
      aria-live="polite"
      class="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
      role="status"
    >
      Results apply only to the submitted profile. Run again after editing.
    </p>
    <RecommendationResults
      v-if="visibleOutcome"
      :outcome="visibleOutcome"
    />
  </div>
</template>

<script setup lang="ts">
import {
  boundRunFromWorkerState,
  currentBoundOutcome,
  isBoundRunStale,
} from '../../autoselect/resultBinding'
import { toTaskProfile } from '../../autoselect/state'
import type { TaskProfile } from '../../core/router/types'
import AdvancedControls from './AdvancedControls.vue'
import AutoSelectStepper from './AutoSelectStepper.vue'
import ModeToggle from './ModeToggle.vue'
import RecommendationResults from './RecommendationResults.vue'
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

const { state, canGoBack, validationMessage, next, back, setMode } = useAutoSelect()
const { state: routerState, run, cancel } = useRouterWorker()

const liveProfile = computed(() => {
  try {
    return toTaskProfile(state.value)
  }
  catch {
    return null
  }
})
const boundRun = computed(() => boundRunFromWorkerState({
  outcome: routerState.value.outcome,
  submittedProfile: routerState.value.submittedProfile,
}))
const visibleOutcome = computed(() => currentBoundOutcome(boundRun.value, liveProfile.value))
const staleResult = computed(() => {
  return routerState.value.status !== 'loading' && isBoundRunStale(boundRun.value, liveProfile.value)
})

function onCandidateMethodIds(ids: string[] | undefined) {
  const nextState = { ...state.value }
  if (ids === undefined) {
    delete nextState.candidateMethodIds
  }
  else {
    nextState.candidateMethodIds = ids
  }
  state.value = nextState
}

function onContinue() {
  if (validationMessage.value !== null) return
  if (state.value.step === 'review') {
    const profile = toTaskProfile(state.value)
    emit('run', profile)
    void run(profile)
    return
  }
  next()
}
</script>
