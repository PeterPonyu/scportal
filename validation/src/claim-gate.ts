export interface ClaimStatus {
  status: 'algorithmic_router' | 'software_resource'
  passed: boolean
  reasons: string[]
  protocolVersion: string
  routerVersion: string
  evidenceVersion: string
  evaluatedAt: string
}

export interface ClaimEvidenceBundle {
  protocol?: unknown
  primary?: unknown
  external?: unknown
  configSmoke?: unknown
  release?: unknown
  ablations?: unknown
  cases?: unknown
}

export const FROZEN_CLAIM_FLOORS = {
  regretImprovementCiLowerBound: 0,
  minimumEvaluableHoldoutTasks: 20,
  minimumStudyGroups: 5,
  top3NonInferiorityMargin: 0.05,
} as const

const CONTEXT_FREE_BASELINES = [
  'global_average',
  'most_frequent_top',
  'context_free_tree',
  'weighted_sum',
  'random_compatible',
] as const

const REQUIRED_ARTIFACTS = [
  'protocol',
  'primary',
  'external',
  'configSmoke',
  'release',
  'ablations',
  'cases',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function caseRows(value: unknown): unknown[] | undefined {
  if (Array.isArray(value)) return value
  if (isRecord(value) && Array.isArray(value.rows)) return value.rows
  return undefined
}

function meanTop3(rows: readonly Record<string, unknown>[], system: string): number | undefined {
  const values = rows.flatMap((row) => {
    if (row.system !== system) return []
    const metrics = isRecord(row.metrics) ? row.metrics : undefined
    const value = asNumber(metrics?.top3)
    return value === undefined ? [] : [value]
  })
  if (values.length === 0) return undefined
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function evaluableTaskCountFromRows(rows: readonly Record<string, unknown>[]): number {
  return rows.filter((row) => {
    if (row.system !== 'router') return false
    const metrics = isRecord(row.metrics) ? row.metrics : undefined
    return asNumber(metrics?.normalizedRegret) !== undefined
  }).length
}

function studyCountFromRows(rows: readonly Record<string, unknown>[]): number {
  return new Set(
    rows
      .filter((row) => row.system === 'router' && typeof row.studyGroup === 'string')
      .map((row) => row.studyGroup),
  ).size
}

function frozenThresholds(protocol: unknown) {
  const claimGate = isRecord(protocol) && isRecord(protocol.claimGate) ? protocol.claimGate : {}
  return {
    minimumEvaluableHoldoutTasks: Math.max(
      asNumber(claimGate.minimumEvaluableHoldoutTasks) ?? FROZEN_CLAIM_FLOORS.minimumEvaluableHoldoutTasks,
      FROZEN_CLAIM_FLOORS.minimumEvaluableHoldoutTasks,
    ),
    minimumStudyGroups: Math.max(
      asNumber(claimGate.minimumStudyGroups) ?? FROZEN_CLAIM_FLOORS.minimumStudyGroups,
      FROZEN_CLAIM_FLOORS.minimumStudyGroups,
    ),
    regretImprovementCiLowerBound: Math.max(
      asNumber(claimGate.regretImprovementCiLowerBound) ?? FROZEN_CLAIM_FLOORS.regretImprovementCiLowerBound,
      FROZEN_CLAIM_FLOORS.regretImprovementCiLowerBound,
    ),
    top3NonInferiorityMargin: Math.min(
      asNumber(claimGate.top3NonInferiorityMargin) ?? FROZEN_CLAIM_FLOORS.top3NonInferiorityMargin,
      FROZEN_CLAIM_FLOORS.top3NonInferiorityMargin,
    ),
  }
}

export function evaluateClaim(bundle: ClaimEvidenceBundle = {}): ClaimStatus {
  const reasons: string[] = []
  const protocol = isRecord(bundle.protocol) ? bundle.protocol : undefined
  const primary = isRecord(bundle.primary) ? bundle.primary : undefined
  const external = isRecord(bundle.external) ? bundle.external : undefined
  const configSmoke = isRecord(bundle.configSmoke) ? bundle.configSmoke : undefined
  const release = isRecord(bundle.release) ? bundle.release : undefined
  const rows = primary && Array.isArray(primary.rows)
    ? primary.rows.filter(isRecord)
    : undefined

  const protocolVersion = text(protocol?.version, text(primary?.protocolVersion, 'unknown'))
  const routerVersion = text(protocol?.routerVersion, text(primary?.routerVersion, 'unknown'))
  const evidenceVersion = text(
    release?.id,
    text(primary?.evidenceVersion, 'unknown'),
  )

  for (const key of REQUIRED_ARTIFACTS) {
    if (bundle[key] == null) reasons.push(`missing ${key} artifact`)
  }

  if (bundle.primary != null && !primary) reasons.push('schema error: primary must be an object')
  if (bundle.external != null && !external) reasons.push('schema error: external must be an object')
  if (bundle.configSmoke != null && !configSmoke) reasons.push('schema error: configSmoke must be an object')
  if (bundle.release != null && !release) reasons.push('schema error: release must be an object')
  if (bundle.ablations != null && !isRecord(bundle.ablations) && !Array.isArray(bundle.ablations)) {
    reasons.push('schema error: ablations must be an object or array')
  }
  if (bundle.cases != null && caseRows(bundle.cases) === undefined) {
    reasons.push('schema error: cases must be an array or { rows }')
  }

  const paired = primary && isRecord(primary.aggregates)
    && isRecord(primary.aggregates.paired_normalized_regret_improvement_vs_global_average)
    ? primary.aggregates.paired_normalized_regret_improvement_vs_global_average
    : undefined
  if (primary && !paired) {
    reasons.push('schema error: primary aggregates.paired_normalized_regret_improvement_vs_global_average is required')
  }

  const thresholds = frozenThresholds(protocol)
  const aggregateTasks = asNumber(paired?.evaluableTaskCount)
  const rowTasks = rows ? evaluableTaskCountFromRows(rows) : undefined
  const evaluableTaskCount = rowTasks !== undefined && aggregateTasks !== undefined
    ? Math.min(rowTasks, aggregateTasks)
    : rowTasks ?? aggregateTasks
  if (evaluableTaskCount === undefined || evaluableTaskCount < thresholds.minimumEvaluableHoldoutTasks) {
    reasons.push(`insufficient evaluable holdout tasks: ${evaluableTaskCount ?? 'missing'} < ${thresholds.minimumEvaluableHoldoutTasks}`)
  }

  const aggregateStudies = asNumber(paired?.studyCount)
  const rowStudies = rows && rows.length > 0 ? studyCountFromRows(rows) : undefined
  const studyCount = rowStudies !== undefined && aggregateStudies !== undefined
    ? Math.min(rowStudies, aggregateStudies)
    : rowStudies ?? aggregateStudies
  if (studyCount === undefined || studyCount < thresholds.minimumStudyGroups) {
    reasons.push(`insufficient study groups: ${studyCount ?? 'missing'} < ${thresholds.minimumStudyGroups}`)
  }

  const ciLower = asNumber(paired?.p2_5)
  if (ciLower === undefined || !(ciLower > thresholds.regretImprovementCiLowerBound)) {
    reasons.push(`95% CI lower bound p2_5 is not greater than ${thresholds.regretImprovementCiLowerBound}`)
  }

  if (rows) {
    const routerTop3 = meanTop3(rows, 'router')
    const baselineScores = CONTEXT_FREE_BASELINES
      .map((system) => meanTop3(rows, system))
      .filter((value): value is number => value !== undefined)
    const bestBaselineTop3 = baselineScores.length > 0 ? Math.max(...baselineScores) : undefined
    if (routerTop3 === undefined || bestBaselineTop3 === undefined) {
      reasons.push('Top-3 hit rate is non-evaluable against context-free baselines')
    }
    else if (routerTop3 < bestBaselineTop3 - thresholds.top3NonInferiorityMargin) {
      reasons.push(`Top-3 hit rate ${routerTop3} is more than ${thresholds.top3NonInferiorityMargin} below best context-free baseline ${bestBaselineTop3}`)
    }
  }
  else if (primary) {
    reasons.push('Top-3 hit rate is non-evaluable against context-free baselines')
  }

  if (!external || external.evaluable !== true) {
    reasons.push('external holdout is missing or not evaluable')
  }

  const executableFailures = asNumber(configSmoke?.executableFailures)
  if (configSmoke && executableFailures === undefined) {
    reasons.push('schema error: configSmoke.executableFailures must be a number')
  }
  if (executableFailures !== undefined && executableFailures !== 0) {
    reasons.push(`config smoke executableFailures ${executableFailures} !== 0`)
  }

  if (release?.synthetic === true || primary?.synthetic === true) {
    reasons.push('synthetic source release cannot support an algorithmic_router claim')
  }

  const unique = [...new Set(reasons)]
  const passed = unique.length === 0
  return {
    status: passed ? 'algorithmic_router' : 'software_resource',
    passed,
    reasons: unique,
    protocolVersion,
    routerVersion,
    evidenceVersion,
    evaluatedAt: new Date().toISOString(),
  }
}
