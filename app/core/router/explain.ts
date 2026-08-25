import type { BenchmarkObservation, EvidenceLink, EvidenceStatement, MetricGroup, TaskProfile } from './types.ts'

export interface ExplanationInput {
  methodId: string
  profile: TaskProfile
  groupScores: Readonly<Partial<Record<MetricGroup, number>>>
  observations: readonly BenchmarkObservation[]
  metricGroups: ReadonlyMap<string, MetricGroup>
  synthetic: boolean
}

export function explainRecommendation(input: ExplanationInput): {
  positiveEvidence: string[]
  positiveEvidenceDetails: EvidenceStatement[]
  evidenceLinks: EvidenceLink[]
  limitations: string[]
} {
  const rankedGroups = (Object.keys(input.groupScores) as MetricGroup[])
    .filter((group) => input.profile.weights[group] > 0)
    .sort((left, right) => (
      input.profile.weights[right] * input.groupScores[right]! - input.profile.weights[left] * input.groupScores[left]!
      || (left < right ? -1 : left > right ? 1 : 0)
    ))
    .slice(0, 3)
  const details = rankedGroups.map((group) => {
    const supporting = input.observations.filter((observation) => (
      observation.methodId === input.methodId && input.metricGroups.get(observation.metricId) === group
    ))
    const metricIds = [...new Set(supporting.map((observation) => observation.metricId))].sort()
    const datasetIds = [...new Set(supporting.map((observation) => observation.datasetId))].sort()
    return {
      text: `${group} evidence supports ${input.methodId}`,
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
  return {
    positiveEvidence: details.map((detail) => detail.text),
    positiveEvidenceDetails: details,
    evidenceLinks,
    limitations: input.synthetic ? ['synthetic fixture evidence; not published biological evidence'] : [],
  }
}
