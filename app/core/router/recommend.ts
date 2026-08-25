import { robustOutranking, type ConditionalMethodEvidence } from './outranking.ts'
import { filterCompatibleMethods } from './constraints.ts'
import { gowerSimilarity, type ContextFeatureWeights } from './gower.ts'
import { percentileNormalize, type NormalizedObservation } from './normalize.ts'
import { paretoLayers } from './pareto.ts'
import { shrunkenEstimate } from './shrinkage.ts'
import { gradeConfidence } from './confidence.ts'
import { explainRecommendation } from './explain.ts'
import type {
  MetricGroup,
  Recommendation,
  RouterInput,
  RouterOptions,
  RouterOutcome,
} from './types.ts'

const groups: readonly MetricGroup[] = ['latent_geometry', 'continuity', 'trajectory', 'stability', 'biology', 'resources']
const defaultWeights: ContextFeatureWeights = { modality: 1, scale: 1, topology: 1, priors: 1, perturbation: 1 }
const defaultOptions = { shrinkageAlpha: 1, bootstrapReplicates: 200, outrankingDelta: 0.02, minimumTopThreeRetention: 0.5 }

interface CandidateEvidence {
  scores: Record<MetricGroup, number>
  variance: number
  effectiveDatasets: number
  criticalCoverage: number
}

function compare(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0 }

function refused(input: Partial<RouterInput>, code: Extract<RouterOutcome, { status: 'REFUSED' }>['code'], evidenceGaps: string[], candidates: string[] = []): RouterOutcome {
  return {
    status: 'REFUSED', code, candidates: [...candidates].sort(compare), evidenceGaps,
    seed: Number.isInteger(input.profile?.seed) && input.profile!.seed >= 0 && input.profile!.seed <= 0xffffffff ? input.profile!.seed : 0,
    evidenceVersion: typeof input.evidenceVersion === 'string' ? input.evidenceVersion : 'invalid',
    routerVersion: typeof input.routerVersion === 'string' ? input.routerVersion : 'invalid',
  }
}

function validId(value: unknown): value is string { return typeof value === 'string' && value.trim() === value && value.length > 0 }
function plainArray(value: unknown): value is unknown[] { return Array.isArray(value) }

function validateInput(input: RouterInput, options: RouterOptions): string | undefined {
  if (!input || typeof input !== 'object') return 'invalid Router input'
  if (!validId(input.evidenceVersion) || !validId(input.routerVersion)) return 'invalid version identity'
  if (!input.profile || typeof input.profile !== 'object' || !input.profile.weights || typeof input.profile.weights !== 'object' || !plainArray(input.profile.goals) || !plainArray(input.datasets) || !plainArray(input.methods) || !plainArray(input.metrics) || !plainArray(input.observations)) return 'invalid public collection'
  if (!Number.isInteger(input.profile.seed) || input.profile.seed < 0 || input.profile.seed > 0xffffffff) return 'invalid seed'
  if (!Number.isFinite(input.profile.minEffectiveDatasets) || input.profile.minEffectiveDatasets < 0 || !Number.isFinite(input.profile.minCriticalCoverage) || input.profile.minCriticalCoverage < 0 || input.profile.minCriticalCoverage > 1) return 'invalid evidence threshold'
  const collections: Array<[string, Array<{ id: unknown, aliases: unknown }>]> = [['dataset', input.datasets], ['method', input.methods], ['metric', input.metrics]]
  for (const [kind, records] of collections) {
    const known = new Set<string>()
    for (const record of records) {
      if (!record || !validId(record.id) || !plainArray(record.aliases)) return `invalid ${kind} registry record`
      for (const identity of [record.id, ...record.aliases]) {
        if (!validId(identity) || known.has(identity.toLowerCase())) return `noncanonical ${kind} registry identity`
        known.add(identity.toLowerCase())
      }
    }
  }
  const datasetIds = new Set(input.datasets.map((dataset) => dataset.id))
  const methodIds = new Set(input.methods.map((method) => method.id))
  const metricIds = new Set(input.metrics.map((metric) => metric.id))
  const observationKeys = new Set<string>()
  for (const observation of input.observations) {
    if (!datasetIds.has(observation.datasetId) || !methodIds.has(observation.methodId) || !metricIds.has(observation.metricId)) return 'observations must use canonical registry IDs'
    if (!Number.isFinite(observation.rawValue) || !observation.provenance || !validId(observation.provenance.paperId) || !validId(observation.provenance.locator)) return 'invalid observation provenance'
    const key = [observation.datasetId, observation.methodId, observation.metricId, observation.provenance.runConfigId].join('\u0000')
    if (observationKeys.has(key)) return 'duplicate canonical observation'
    observationKeys.add(key)
  }
  for (const weight of Object.values(input.profile.weights)) if (!Number.isFinite(weight) || weight < 0) return 'invalid metric weight'
  if (Object.values(input.profile.weights).every((weight) => weight === 0)) return 'metric weights must sum to a positive value'
  if (!options || typeof options !== 'object') return 'invalid Router options'
  for (const value of Object.values(options)) if (value !== undefined && (!Number.isFinite(value) || value < 0)) return 'invalid Router option'
  if (options.bootstrapReplicates !== undefined && (!Number.isInteger(options.bootstrapReplicates) || options.bootstrapReplicates === 0)) return 'invalid bootstrap replicates'
  if (options.minimumTopThreeRetention !== undefined && options.minimumTopThreeRetention > 1) return 'invalid top-three retention threshold'
  return undefined
}

function allRequiredEvidenceExists(methodIds: readonly string[], datasetIds: readonly string[], metricIds: readonly string[], observations: readonly NormalizedObservation[]): boolean {
  const keys = new Set(observations.map((observation) => [observation.datasetId, observation.methodId, observation.metricId].join('\u0000')))
  return methodIds.every((methodId) => datasetIds.every((datasetId) => metricIds.every((metricId) => keys.has([datasetId, methodId, metricId].join('\u0000')))))
}

function routeMethodsUnchecked(input: RouterInput, options: RouterOptions): RouterOutcome {
  const invalid = validateInput(input, options)
  if (invalid) return refused(input, 'INSUFFICIENT_EVIDENCE', [invalid])
  const { compatible, excluded } = filterCompatibleMethods(input.profile, input.methods)
  if (compatible.length === 0) {
    const conflict = excluded.length > 0 && excluded.every((item) => item.reasons.some((reason) => reason === 'RESOURCE_LIMIT' || reason === 'MISSING_OUTPUT' || reason === 'MISSING_REQUIRED_PRIOR'))
    return refused(input, conflict ? 'CONFLICTING_REQUIREMENTS' : 'NO_COMPATIBLE_METHOD', ['no compatible method after hard constraints'])
  }
  const primaryMetrics = input.metrics.filter((metric) => !metric.auxiliary)
  const compatibleIds = new Set(compatible.map((method) => method.id))
  const observations = input.observations.filter((observation) => compatibleIds.has(observation.methodId) && !input.metrics.find((metric) => metric.id === observation.metricId)!.auxiliary)
  let normalized: NormalizedObservation[]
  try { normalized = percentileNormalize(observations, new Map(input.metrics.map((metric) => [metric.id, metric]))) } catch (error) { return refused(input, 'INSUFFICIENT_EVIDENCE', [(error as Error).message]) }
  const metricGroups = new Map(input.metrics.map((metric) => [metric.id, metric.group]))
  const similarities = new Map<string, number>()
  try { for (const dataset of input.datasets) similarities.set(dataset.id, gowerSimilarity(input.profile, dataset, options.contextFeatureWeights ?? defaultWeights)) } catch (error) { return refused(input, 'INSUFFICIENT_EVIDENCE', [(error as Error).message]) }
  const selectedGroups = groups.filter((group) => input.profile.weights[group] > 0)
  const candidateIds = compatible.map((method) => method.id)
  const requiredMetricIds = primaryMetrics.map((metric) => metric.id)
  if (!allRequiredEvidenceExists(candidateIds, input.datasets.map((dataset) => dataset.id), requiredMetricIds, normalized)) return refused(input, 'CRITICAL_COVERAGE_GAP', ['missing method/metric evidence; no values were imputed'], candidateIds)

  const candidates = new Map<string, CandidateEvidence>()
  for (const method of compatible) {
    const scores = {} as Record<MetricGroup, number>
    const estimates = []
    for (const group of groups) {
      const groupMetrics = primaryMetrics.filter((metric) => metric.group === group)
      if (groupMetrics.length === 0) return refused(input, 'CRITICAL_COVERAGE_GAP', [`missing registered metric group: ${group}`], candidateIds)
      const metricEstimates = groupMetrics.map((metric) => {
        const samples = normalized.filter((observation) => observation.methodId === method.id && observation.metricId === metric.id)
          .map((observation) => ({ similarity: similarities.get(observation.datasetId)!, value: observation.percentile }))
        const priorSamples = normalized.filter((observation) => observation.methodId === method.id && observation.metricId === metric.id)
        const prior = priorSamples.reduce((sum, observation) => sum + observation.percentile, 0) / priorSamples.length
        return shrunkenEstimate(samples, prior, options.shrinkageAlpha ?? defaultOptions.shrinkageAlpha, input.datasets.length)
      })
      scores[group] = metricEstimates.reduce((sum, estimate) => sum + estimate.mean, 0) / metricEstimates.length
      if (input.profile.weights[group] > 0) estimates.push(...metricEstimates)
    }
    const criticalCoverage = estimates.reduce((sum, estimate) => sum + estimate.coverage, 0) / estimates.length
    if (criticalCoverage < input.profile.minCriticalCoverage) return refused(input, 'CRITICAL_COVERAGE_GAP', [`critical coverage below threshold for ${method.id}`], candidateIds)
    candidates.set(method.id, {
      scores,
      effectiveDatasets: Math.min(...estimates.map((estimate) => estimate.effectiveDatasets)),
      criticalCoverage,
      variance: estimates.reduce((sum, estimate) => sum + estimate.variance, 0) / estimates.length,
    })
  }
  const layers = paretoLayers(candidateIds.map((methodId) => ({ methodId, scores: candidates.get(methodId)!.scores, criticalGroups: selectedGroups })))
  const contexts = input.datasets.map((dataset) => ({
    datasetId: dataset.id,
    studyGroup: dataset.studyGroup,
    evidence: { methods: Object.fromEntries(candidateIds.map((methodId) => [methodId, Object.fromEntries(selectedGroups.map((group) => {
      const groupObservations = normalized.filter((value) => value.datasetId === dataset.id && value.methodId === methodId && metricGroups.get(value.metricId) === group)
      return [group, groupObservations.reduce((sum, observation) => sum + observation.percentile, 0) / groupObservations.length]
    }))])) } satisfies ConditionalMethodEvidence,
  }))
  const outranking = robustOutranking({ contexts, weights: input.profile.weights, delta: options.outrankingDelta ?? defaultOptions.outrankingDelta, replicates: options.bootstrapReplicates ?? defaultOptions.bootstrapReplicates, seed: input.profile.seed })
  const qualified = candidateIds.filter((methodId) => layers.get(methodId) === 0)
  const ranked = [...qualified].sort((left, right) => (
    outranking.phi[right] - outranking.phi[left]
    || outranking.utilityLowerBound[right] - outranking.utilityLowerBound[left]
    || compare(left, right)
  ))
  const topTwoMargin = ranked.length < 2 ? 1 : Math.max(0, outranking.phi[ranked[0]] - outranking.phi[ranked[1]])
  if (ranked.some((methodId) => candidates.get(methodId)!.effectiveDatasets < input.profile.minEffectiveDatasets)) return refused(input, 'INSUFFICIENT_EVIDENCE', ['effective datasets below threshold'], qualified)
  if (ranked.every((methodId) => outranking.topThreeRetention[methodId] < (options.minimumTopThreeRetention ?? defaultOptions.minimumTopThreeRetention))) return refused(input, 'UNSTABLE_TOP_THREE', ['top-three retention below threshold'], qualified)
  const bestFit = ranked[0]
  const robust = [...ranked].sort((left, right) => outranking.topThreeRetention[right] - outranking.topThreeRetention[left] || candidates.get(left)!.variance - candidates.get(right)!.variance || compare(left, right))[0]
  const scientificFloor = outranking.utilityLowerBound[bestFit] - 0.02
  const resource = [...ranked].filter((methodId) => outranking.utilityLowerBound[methodId] >= scientificFloor).sort((left, right) => input.methods.find((method) => method.id === left)!.resourceTier - input.methods.find((method) => method.id === right)!.resourceTier || compare(left, right))[0]
  const roles = new Map<string, Recommendation['roles']>()
  for (const [methodId, role] of [[bestFit, 'best_fit'], [robust, 'robust_alternative'], [resource, 'resource_aware']] as const) roles.set(methodId, [...(roles.get(methodId) ?? []), role])
  const synthetic = input.evidenceVersion.includes('synthetic')
  const recommendations = [...roles.keys()].sort(compare).map((methodId) => {
    const candidate = candidates.get(methodId)!
    const confidence = gradeConfidence({ effectiveDatasets: candidate.effectiveDatasets, criticalCoverage: candidate.criticalCoverage, weightedVariance: candidate.variance, topThreeRetention: outranking.topThreeRetention[methodId], topTwoMargin }, { minEffectiveDatasets: input.profile.minEffectiveDatasets, minCriticalCoverage: input.profile.minCriticalCoverage, maxWeightedVariance: 0.1, minTopThreeRetention: options.minimumTopThreeRetention ?? defaultOptions.minimumTopThreeRetention, minTopTwoMargin: 0 }).grade
    return { methodId, roles: roles.get(methodId)!, paretoLayer: 0, outrankingFlow: outranking.phi[methodId], conservativeUtility: outranking.utilityLowerBound[methodId], confidence, topThreeRetention: outranking.topThreeRetention[methodId], effectiveDatasets: candidate.effectiveDatasets, criticalCoverage: candidate.criticalCoverage, ...explainRecommendation({ methodId, profile: input.profile, groupScores: candidate.scores, observations: normalized, metricGroups, synthetic }), excludedAlternatives: excluded }
  })
  return { status: 'OK', recommendations, seed: input.profile.seed, evidenceVersion: input.evidenceVersion, routerVersion: input.routerVersion }
}

export function routeMethods(input: RouterInput, options: RouterOptions = {}): RouterOutcome {
  try {
    return routeMethodsUnchecked(input, options)
  } catch (error) {
    return refused(input, 'INSUFFICIENT_EVIDENCE', [`invalid Router input: ${(error as Error).message}`])
  }
}
