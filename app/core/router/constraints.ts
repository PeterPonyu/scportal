import type { MethodCapability, ScaleBand, TaskGoal, TaskProfile } from './types.ts'

export type ExclusionReason =
  | 'UNSUPPORTED_MODALITY'
  | 'SCALE_LIMIT'
  | 'RESOURCE_LIMIT'
  | 'MISSING_REQUIRED_PRIOR'
  | 'MISSING_OUTPUT'
  | 'UNSUPPORTED_GOAL'
  | 'NOT_EXECUTABLE'
  | 'NOT_SELECTED_CANDIDATE'

export interface Exclusion {
  methodId: string
  reasons: ExclusionReason[]
}

const scalePositions: Readonly<Record<Exclude<ScaleBand, 'unknown'>, number>> = {
  lt_10k: 0,
  '10k_50k': 1,
  '50k_200k': 2,
  gt_200k: 3,
}

const acceptableOutputs: Readonly<Record<TaskGoal, readonly MethodCapability['outputs'][number][]>> = {
  latent_representation: ['latent'],
  trajectory_reconstruction: ['latent', 'graph', 'pseudotime'],
  // Either an explicit branch assignment or an ordered pseudotime can resolve fate alternatives.
  fate_decision: ['branch', 'pseudotime'],
  lineage_contribution: ['graph', 'branch'],
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function supportsProfileScale(profileScale: ScaleBand, methodScale: MethodCapability['maxScale']): boolean {
  return profileScale === 'unknown' || scalePositions[profileScale] <= scalePositions[methodScale]
}

export function filterCompatibleMethods(
  profile: TaskProfile,
  methods: readonly MethodCapability[],
): { compatible: MethodCapability[]; excluded: Exclusion[] } {
  const selectedCandidates = profile.candidateMethodIds === undefined
    ? undefined
    : new Set(profile.candidateMethodIds)
  const compatible: MethodCapability[] = []
  const excluded: Exclusion[] = []

  for (const method of [...methods].sort((left, right) => compareCodeUnits(left.id, right.id))) {
    const reasons: ExclusionReason[] = []
    if (!method.modalities.includes(profile.modality)) reasons.push('UNSUPPORTED_MODALITY')
    if (!supportsProfileScale(profile.scale, method.maxScale)) reasons.push('SCALE_LIMIT')
    if (method.resourceTier > profile.maxResourceTier) reasons.push('RESOURCE_LIMIT')
    if (method.requiredPriors.some((prior) => !Object.hasOwn(profile.priors, prior) || profile.priors[prior] !== true)) {
      reasons.push('MISSING_REQUIRED_PRIOR')
    }
    const methodOutputs = new Set(method.outputs)
    if (profile.goals.some((goal) => !acceptableOutputs[goal].some((output) => methodOutputs.has(output)))) {
      reasons.push('MISSING_OUTPUT')
    }
    if (profile.goals.some((goal) => !method.supportedGoals.includes(goal))) reasons.push('UNSUPPORTED_GOAL')
    if (!method.executable) reasons.push('NOT_EXECUTABLE')
    if (selectedCandidates !== undefined && !selectedCandidates.has(method.id)) reasons.push('NOT_SELECTED_CANDIDATE')

    if (reasons.length === 0) compatible.push(method)
    else excluded.push({ methodId: method.id, reasons })
  }

  return { compatible, excluded }
}
