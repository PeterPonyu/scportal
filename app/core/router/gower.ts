import type { DatasetContext, PriorKey, TaskProfile } from './types.ts'

export interface ContextFeatureWeights {
  modality: number
  scale: number
  topology: number
  priors: number
  perturbation: number
}

const scalePositions = {
  lt_10k: 0,
  '10k_50k': 1 / 3,
  '50k_200k': 2 / 3,
  gt_200k: 1,
} as const

const priorKeys: readonly PriorKey[] = ['labels', 'root_state', 'terminal_states', 'time']

function requireWeight(weights: ContextFeatureWeights, feature: keyof ContextFeatureWeights): number {
  if (!Object.hasOwn(weights, feature)) throw new Error(`weights must have an own ${feature} value`)
  const weight = weights[feature]
  if (!Number.isFinite(weight) || weight < 0) throw new Error(`weights.${feature} must be finite and non-negative`)
  return weight
}

function knownPrior(value: boolean | 'unknown' | undefined): value is boolean {
  return value === true || value === false
}

function priorSimilarity(profile: TaskProfile, dataset: DatasetContext): number | undefined {
  let matching = 0
  let comparable = 0
  for (const prior of priorKeys) {
    const profileValue = Object.hasOwn(profile.priors, prior) ? profile.priors[prior] : undefined
    const datasetValue = Object.hasOwn(dataset.priors, prior) ? dataset.priors[prior] : undefined
    if (!knownPrior(profileValue) || !knownPrior(datasetValue)) continue
    comparable += 1
    if (profileValue === datasetValue) matching += 1
  }
  return comparable === 0 ? undefined : matching / comparable
}

export function gowerSimilarity(
  profile: TaskProfile,
  dataset: DatasetContext,
  weights: ContextFeatureWeights,
): number {
  let weightedSimilarity = 0
  let usableWeight = 0
  const add = (weight: number, similarity: number | undefined) => {
    if (similarity === undefined || weight === 0) return
    weightedSimilarity += weight * similarity
    usableWeight += weight
  }

  const modalityWeight = requireWeight(weights, 'modality')
  const scaleWeight = requireWeight(weights, 'scale')
  const topologyWeight = requireWeight(weights, 'topology')
  const priorsWeight = requireWeight(weights, 'priors')
  const perturbationWeight = requireWeight(weights, 'perturbation')

  add(modalityWeight, profile.modality === dataset.modality ? 1 : 0)
  add(
    scaleWeight,
    profile.scale === 'unknown' || dataset.scale === 'unknown'
      ? undefined
      : 1 - Math.abs(scalePositions[profile.scale] - scalePositions[dataset.scale]),
  )
  add(
    topologyWeight,
    profile.topology === 'unknown' || dataset.topology === 'unknown'
      ? undefined
      : profile.topology === dataset.topology ? 1 : 0,
  )
  add(priorsWeight, priorSimilarity(profile, dataset))
  add(
    perturbationWeight,
    profile.perturbation === 'unknown' || dataset.perturbation === 'unknown'
      ? undefined
      : profile.perturbation === dataset.perturbation ? 1 : 0,
  )

  if (usableWeight === 0) throw new Error('zero usable context weight')
  return weightedSimilarity / usableWeight
}
