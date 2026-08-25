import methodsJson from '../../data/router/methods.json' with { type: 'json' }
import type {
  MetricGroup,
  Modality,
  PriorKey,
  ScaleBand,
  TaskGoal,
  TaskProfile,
  Topology,
} from '../core/router/types.ts'

export type AutoSelectMode = 'quick' | 'advanced'
export type WizardStep = 'data' | 'goals' | 'topology' | 'priors' | 'priorities' | 'environment' | 'review'

export const WIZARD_STEPS: WizardStep[] = ['data', 'goals', 'topology', 'priors', 'priorities', 'environment', 'review']

export const DEFAULT_SEED = 20260823

const METRIC_GROUPS: MetricGroup[] = [
  'latent_geometry',
  'continuity',
  'trajectory',
  'stability',
  'biology',
  'resources',
]

const DEFAULT_WEIGHTS: Record<MetricGroup, number> = {
  latent_geometry: 0.2,
  continuity: 0.25,
  trajectory: 0.3,
  stability: 0.1,
  biology: 0.1,
  resources: 0.05,
}

const MODALITIES: readonly Modality[] = ['scrna', 'scatac', 'multiome']
const SCALES: readonly ScaleBand[] = ['lt_10k', '10k_50k', '50k_200k', 'gt_200k', 'unknown']
const GOALS: readonly TaskGoal[] = [
  'latent_representation',
  'trajectory_reconstruction',
  'fate_decision',
  'lineage_contribution',
]
const TOPOLOGIES: readonly Topology[] = ['linear', 'bifurcating', 'multibranch', 'cyclic', 'mixed', 'unknown']
const PRIOR_KEYS: readonly PriorKey[] = ['time', 'root_state', 'terminal_states', 'labels', 'perturbation']
const PROTO_UNSAFE_IDS = new Set(['__proto__', 'prototype', 'constructor'])
const CATALOG_METHOD_IDS = new Set(
  (methodsJson as Array<{ id: string }>).map((method) => method.id),
)

export interface AutoSelectState {
  mode: AutoSelectMode
  step: WizardStep
  modality: Modality | null
  scale: ScaleBand
  goals: TaskGoal[]
  topology: Topology
  priors: Partial<Record<PriorKey, boolean | 'unknown'>>
  perturbation: boolean | 'unknown'
  weights: Record<MetricGroup, number>
  maxResourceTier: 1 | 2 | 3
  minEffectiveDatasets: number
  minCriticalCoverage: number
  seed: number
  candidateMethodIds?: string[]
}

function isModality(value: unknown): value is Modality {
  return typeof value === 'string' && (MODALITIES as readonly string[]).includes(value)
}

function isScale(value: unknown): value is ScaleBand {
  return typeof value === 'string' && (SCALES as readonly string[]).includes(value)
}

function isGoal(value: unknown): value is TaskGoal {
  return typeof value === 'string' && (GOALS as readonly string[]).includes(value)
}

function isTopology(value: unknown): value is Topology {
  return typeof value === 'string' && (TOPOLOGIES as readonly string[]).includes(value)
}

function isPriorValue(value: unknown): value is boolean | 'unknown' {
  return value === true || value === false || value === 'unknown'
}

function copyWeights(weights: Record<MetricGroup, number>): Record<MetricGroup, number> {
  return {
    latent_geometry: weights.latent_geometry,
    continuity: weights.continuity,
    trajectory: weights.trajectory,
    stability: weights.stability,
    biology: weights.biology,
    resources: weights.resources,
  }
}

function copyPriors(priors: Partial<Record<PriorKey, boolean | 'unknown'>>): Partial<Record<PriorKey, boolean | 'unknown'>> {
  const copied: Partial<Record<PriorKey, boolean | 'unknown'>> = {}
  for (const key of PRIOR_KEYS) {
    if (!Object.hasOwn(priors, key)) continue
    copied[key] = priors[key]
  }
  return copied
}

function unknownPriors(): Partial<Record<PriorKey, boolean | 'unknown'>> {
  return {
    time: 'unknown',
    root_state: 'unknown',
    terminal_states: 'unknown',
    labels: 'unknown',
    perturbation: 'unknown',
  }
}

function validateWeights(weights: Record<MetricGroup, number>): string | null {
  let sum = 0
  for (const group of METRIC_GROUPS) {
    if (!Object.hasOwn(weights, group)) return 'Keep all six metric-group weights.'
    const weight = weights[group]
    if (!Number.isFinite(weight) || weight < 0) return 'Weights must be finite and non-negative.'
    sum += weight
  }
  if (!(sum > 0)) return 'Weights must sum to a positive value.'
  return null
}

function validateGoals(goals: readonly TaskGoal[]): string | null {
  if (goals.length < 1) return 'Select at least one scientific goal.'
  if (goals.length > 2) return 'Select at most two scientific goals.'
  if (goals.some((goal) => !isGoal(goal))) return 'Goals must be known task goals.'
  if (new Set(goals).size !== goals.length) return 'Goals must be unique.'
  return null
}

function validatePriors(priors: Partial<Record<PriorKey, boolean | 'unknown'>>): string | null {
  for (const key of Reflect.ownKeys(priors)) {
    if (typeof key !== 'string' || !(PRIOR_KEYS as readonly string[]).includes(key)) {
      return 'Priors contain an unknown key.'
    }
    if (!isPriorValue(priors[key as PriorKey])) return 'Prior values must be true, false, or unknown.'
  }
  return null
}

function validateCandidateMethodIds(ids: string[] | undefined): string | null {
  if (ids === undefined || ids.length === 0) return null
  for (const id of ids) {
    if (typeof id !== 'string') return 'Candidate allowlist contains an unknown method id.'
    const normalized = id.trim().toLowerCase()
    if (PROTO_UNSAFE_IDS.has(id) || PROTO_UNSAFE_IDS.has(normalized)) {
      return 'Candidate allowlist contains an unknown method id.'
    }
    if (!CATALOG_METHOD_IDS.has(id)) {
      return 'Candidate allowlist contains an unknown method id.'
    }
  }
  return null
}

function validateEnvironment(state: AutoSelectState): string | null {
  if (state.maxResourceTier !== 1 && state.maxResourceTier !== 2 && state.maxResourceTier !== 3) {
    return 'Resource tier must be 1, 2, or 3.'
  }
  if (!Number.isInteger(state.minEffectiveDatasets) || state.minEffectiveDatasets < 1) {
    return 'Minimum effective datasets must be an integer of at least 1.'
  }
  if (!Number.isFinite(state.minCriticalCoverage) || state.minCriticalCoverage < 0 || state.minCriticalCoverage > 1) {
    return 'Minimum critical coverage must be between 0 and 1.'
  }
  if (!Number.isInteger(state.seed) || state.seed < 0 || state.seed > 0xffffffff) {
    return 'Seed must be an integer in 0..0xffffffff.'
  }
  return validateCandidateMethodIds(state.candidateMethodIds)
}

export function createInitialAutoSelectState(mode: AutoSelectMode): AutoSelectState {
  return {
    mode,
    step: 'data',
    modality: null,
    scale: 'unknown',
    goals: [],
    topology: 'unknown',
    priors: unknownPriors(),
    perturbation: 'unknown',
    weights: copyWeights(DEFAULT_WEIGHTS),
    maxResourceTier: 2,
    minEffectiveDatasets: 2,
    minCriticalCoverage: 0.6,
    seed: DEFAULT_SEED,
  }
}

export function validateStep(step: WizardStep, state: AutoSelectState): string | null {
  if (step === 'data') {
    if (!isModality(state.modality)) return 'Select a data modality.'
    if (!isScale(state.scale)) return 'Select a known scale band, or unknown.'
    return null
  }
  if (step === 'goals') return validateGoals(state.goals)
  if (step === 'topology') return isTopology(state.topology) ? null : 'Select a known topology, or unknown.'
  if (step === 'priors') {
    if (state.perturbation !== true && state.perturbation !== false && state.perturbation !== 'unknown') {
      return 'Perturbation must be true, false, or unknown.'
    }
    return validatePriors(state.priors)
  }
  if (step === 'priorities') return validateWeights(state.weights)
  if (step === 'environment') return validateEnvironment(state)
  return (
    validateStep('data', state)
    ?? validateStep('goals', state)
    ?? validateStep('topology', state)
    ?? validateStep('priors', state)
    ?? validateStep('priorities', state)
    ?? validateStep('environment', state)
  )
}

export function advance(state: AutoSelectState): AutoSelectState {
  if (validateStep(state.step, state) !== null) return state
  const index = WIZARD_STEPS.indexOf(state.step)
  if (index < 0 || index >= WIZARD_STEPS.length - 1) return state
  return { ...state, step: WIZARD_STEPS[index + 1]! }
}

export function retreat(state: AutoSelectState): AutoSelectState {
  const index = WIZARD_STEPS.indexOf(state.step)
  if (index <= 0) return state
  return { ...state, step: WIZARD_STEPS[index - 1]! }
}

export function reset(state: AutoSelectState): AutoSelectState {
  return createInitialAutoSelectState(state.mode)
}

export function toTaskProfile(state: AutoSelectState): TaskProfile {
  const invalid = validateStep('review', state)
  if (invalid !== null) throw new Error(invalid)
  const profile: TaskProfile = {
    id: 'autoselect-session',
    modality: state.modality as Modality,
    scale: state.scale,
    goals: [...state.goals],
    topology: state.topology,
    priors: copyPriors(state.priors),
    perturbation: state.perturbation,
    weights: copyWeights(state.weights),
    maxResourceTier: state.maxResourceTier,
    minEffectiveDatasets: state.minEffectiveDatasets,
    minCriticalCoverage: state.minCriticalCoverage,
    seed: state.seed,
  }
  if (state.candidateMethodIds !== undefined && state.candidateMethodIds.length > 0) {
    profile.candidateMethodIds = [...state.candidateMethodIds]
  }
  return profile
}
