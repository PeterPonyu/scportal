import {
  WIZARD_STEPS,
  advance,
  createInitialAutoSelectState,
  reset as resetState,
  retreat,
  validateStep,
  type AutoSelectMode,
  type AutoSelectState,
} from '../autoselect/state.ts'

export function useAutoSelect() {
  const state = useState<AutoSelectState>('autoselect-state', () => createInitialAutoSelectState('quick'))

  const stepIndex = computed(() => WIZARD_STEPS.indexOf(state.value.step))
  const validationMessage = computed(() => validateStep(state.value.step, state.value))
  const canGoBack = computed(() => stepIndex.value > 0)
  const canGoNext = computed(() => validationMessage.value === null && stepIndex.value < WIZARD_STEPS.length - 1)
  const progress = computed(() => (stepIndex.value + 1) / WIZARD_STEPS.length)

  function next() {
    state.value = advance(state.value)
  }

  function back() {
    state.value = retreat(state.value)
  }

  function reset() {
    state.value = resetState(state.value)
  }

  function setMode(mode: AutoSelectMode) {
    state.value = { ...state.value, mode }
  }

  return {
    state,
    canGoBack,
    canGoNext,
    progress,
    validationMessage,
    next,
    back,
    reset,
    setMode,
  }
}
