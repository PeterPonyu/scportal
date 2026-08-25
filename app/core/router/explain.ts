import type { AlternativeDisposition, BenchmarkObservation, EvidenceLink, EvidenceStatement, MetricGroup, TaskProfile } from './types.ts'

export interface ExplanationInput {
  methodId: string
  profile: TaskProfile
  groupScores: Readonly<Partial<Record<MetricGroup, number>>>
  observations: readonly BenchmarkObservation[]
  metricGroups: ReadonlyMap<string, MetricGroup>
  synthetic: boolean
  confidenceReasons: readonly string[]
  effectiveDatasets: number
  criticalCoverage: number
  variance: number
  topThreeRetention: number
  resourceTier: 1 | 2 | 3
  paretoCandidateCount: number
  eligibleDatasetCount: number
  shrinkageAlpha: number
  alternativeDispositions: readonly AlternativeDisposition[]
}

export function explainRecommendation(input: ExplanationInput): {
  positiveEvidence: string[]
  positiveEvidenceDetails: EvidenceStatement[]
  evidenceLinks: EvidenceLink[]
  confidenceReasons: string[]
  limitations: string[]
  alternativeDispositions: AlternativeDisposition[]
} {
  const baseline = 0.5
  const rankedGroups = (Object.keys(input.groupScores) as MetricGroup[])
    .filter((group) => input.profile.weights[group] > 0 && input.groupScores[group]! > baseline)
    .sort((left, right) => (
      input.profile.weights[right] * (input.groupScores[right]! - baseline) - input.profile.weights[left] * (input.groupScores[left]! - baseline)
      || (left < right ? -1 : left > right ? 1 : 0)
    ))
    .slice(0, 3)
  const details = rankedGroups.map((group) => {
    const supporting = input.observations.filter((observation) => (
      observation.methodId === input.methodId && input.metricGroups.get(observation.metricId) === group
    ))
    const metricIds = [...new Set(supporting.map((observation) => observation.metricId))].sort()
    const datasetIds = [...new Set(supporting.map((observation) => observation.datasetId))].sort()
    const score = input.groupScores[group]!
    const contribution = input.profile.weights[group] * (score - baseline)
    return {
      text: `${group} supports ${input.methodId}: score ${score.toFixed(3)} vs baseline ${baseline.toFixed(3)}; weighted contribution ${contribution.toFixed(3)}`,
      group,
      score,
      baseline,
      contribution,
      direction: 'supports' as const,
      metricIds,
      datasetIds,
      synthetic: input.synthetic,
    }
  })
  const evidenceLinks = input.observations
    .filter((observation) => observation.methodId === input.methodId)
    .map((observation) => ({
      paperId: observation.provenance.paperId,
      locator: observation.provenance.locator,
      datasetId: observation.datasetId,
      metricId: observation.metricId,
      datasetVersion: observation.provenance.datasetVersion,
      methodVersion: observation.provenance.methodVersion,
      runConfigId: observation.provenance.runConfigId,
      extractedAt: observation.provenance.extractedAt,
      synthetic: input.synthetic,
    }))
    .sort((left, right) => (
      (left.datasetId < right.datasetId ? -1 : left.datasetId > right.datasetId ? 1 : 0)
      || (left.metricId < right.metricId ? -1 : left.metricId > right.metricId ? 1 : 0)
      || (left.paperId < right.paperId ? -1 : left.paperId > right.paperId ? 1 : 0)
      || (left.locator < right.locator ? -1 : left.locator > right.locator ? 1 : 0)
      || (left.datasetVersion < right.datasetVersion ? -1 : left.datasetVersion > right.datasetVersion ? 1 : 0)
      || (left.methodVersion < right.methodVersion ? -1 : left.methodVersion > right.methodVersion ? 1 : 0)
      || (left.runConfigId < right.runConfigId ? -1 : left.runConfigId > right.runConfigId ? 1 : 0)
      || (left.extractedAt < right.extractedAt ? -1 : left.extractedAt > right.extractedAt ? 1 : 0)
    ))
  const limitations = [
    ...(input.synthetic ? ['synthetic fixture evidence; not published biological evidence'] : []),
    `empirical-Bayes shrinkage prior applied with alpha=${input.shrinkageAlpha}`,
    ...(input.profile.scale === 'unknown' ? ['unknown scale leaves capacity feasibility unresolved'] : []),
    ...(Object.values(input.profile.priors).some((prior) => prior === 'unknown') ? ['unknown task priors widen contextual matching'] : []),
    ...(input.criticalCoverage < 1 ? [`critical evidence coverage is ${(input.criticalCoverage * 100).toFixed(1)}%`] : []),
    ...(input.effectiveDatasets < input.eligibleDatasetCount ? [`effective dataset count is ${input.effectiveDatasets.toFixed(3)} of ${input.eligibleDatasetCount}`] : []),
    ...(input.variance > 0 ? [`conditional evidence variance is ${input.variance.toFixed(6)}`] : []),
    ...(input.topThreeRetention < 1 ? [`bootstrap top-three retention is ${(input.topThreeRetention * 100).toFixed(1)}%`] : []),
    ...(input.resourceTier > 1 ? [`resource tier ${input.resourceTier} is above the minimum tier`] : []),
    ...(input.paretoCandidateCount > 1 ? [`selected from ${input.paretoCandidateCount} Pareto-front candidates`] : []),
  ]
  return {
    positiveEvidence: details.map((detail) => detail.text),
    positiveEvidenceDetails: details,
    evidenceLinks,
    confidenceReasons: [...input.confidenceReasons],
    limitations,
    alternativeDispositions: input.alternativeDispositions.map((disposition) => ({ ...disposition, reasons: [...disposition.reasons] })),
  }
}
