import type { EvidenceLink, EvidenceStatement, MetricGroup, TaskProfile } from './types.ts'
import type { NormalizedObservation } from './normalize.ts'

export interface ExplanationInput {
  methodId: string
  profile: TaskProfile
  groupScores: Readonly<Partial<Record<MetricGroup, number>>>
  observations: readonly NormalizedObservation[]
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
      synthetic: input.synthetic,
    }))
    .sort((left, right) => (
      (left.datasetId < right.datasetId ? -1 : left.datasetId > right.datasetId ? 1 : 0)
      || (left.metricId < right.metricId ? -1 : left.metricId > right.metricId ? 1 : 0)
    ))
  return {
    positiveEvidence: details.map((detail) => detail.text),
    positiveEvidenceDetails: details,
    evidenceLinks,
    limitations: input.synthetic ? ['synthetic fixture evidence; not published biological evidence'] : [],
  }
}
