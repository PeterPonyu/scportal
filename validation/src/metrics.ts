import { percentileNormalize } from '../../app/core/router/normalize.ts'
import type { BenchmarkObservation, MetricDefinition, MetricGroup } from '../../app/core/router/types.ts'

export const NON_EVALUABLE = 'non_evaluable' as const
export type MetricValue = number | typeof NON_EVALUABLE

export interface MethodUtility {
  methodId: string
  utility: number
}

const metricGroups: readonly MetricGroup[] = [
  'latent_geometry',
  'continuity',
  'trajectory',
  'stability',
  'biology',
  'resources',
]

function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function rankedMethods(ranking: readonly MethodUtility[]): MethodUtility[] {
  return [...ranking].sort((left, right) => right.utility - left.utility || compare(left.methodId, right.methodId))
}

export function top1Hit(recommendedId: string | null | undefined, ranking: readonly MethodUtility[]): MetricValue {
  if (!recommendedId || ranking.length === 0) return NON_EVALUABLE
  const found = ranking.find((row) => row.methodId === recommendedId)
  if (!found) return NON_EVALUABLE
  return found.utility === Math.max(...ranking.map((row) => row.utility)) ? 1 : 0
}

export function top3Hit(recommendedId: string | null | undefined, ranking: readonly MethodUtility[]): MetricValue {
  if (!recommendedId || ranking.length === 0) return NON_EVALUABLE
  const index = rankedMethods(ranking).findIndex((row) => row.methodId === recommendedId)
  if (index < 0) return NON_EVALUABLE
  return index < 3 ? 1 : 0
}

export function normalizedRegret(recommendedId: string | null | undefined, ranking: readonly MethodUtility[]): MetricValue {
  if (!recommendedId || ranking.length === 0) return NON_EVALUABLE
  const found = ranking.find((row) => row.methodId === recommendedId)
  if (!found) return NON_EVALUABLE
  const oracle = Math.max(...ranking.map((row) => row.utility))
  const worst = Math.min(...ranking.map((row) => row.utility))
  const regret = (oracle - found.utility) / Math.max(oracle - worst, 1e-9)
  return Math.min(1, Math.max(0, regret))
}

export function midranksDescending(values: readonly number[]): number[] {
  const indexed = values.map((value, index) => ({ value, index }))
  indexed.sort((left, right) => right.value - left.value || left.index - right.index)
  const ranks = Array.from({ length: values.length }, () => 0)
  for (let start = 0; start < indexed.length;) {
    let end = start + 1
    while (end < indexed.length && indexed[end].value === indexed[start].value) end += 1
    const averageRank = (start + 1 + end) / 2
    for (let index = start; index < end; index += 1) ranks[indexed[index].index] = averageRank
    start = end
  }
  return ranks
}

function pearson(left: readonly number[], right: readonly number[]): MetricValue {
  const centerLeft = mean(left)
  const centerRight = mean(right)
  let numerator = 0
  let leftSquares = 0
  let rightSquares = 0
  for (let index = 0; index < left.length; index += 1) {
    const deltaLeft = left[index] - centerLeft
    const deltaRight = right[index] - centerRight
    numerator += deltaLeft * deltaRight
    leftSquares += deltaLeft * deltaLeft
    rightSquares += deltaRight * deltaRight
  }
  if (leftSquares === 0 || rightSquares === 0) return NON_EVALUABLE
  return numerator / Math.sqrt(leftSquares * rightSquares)
}

export function spearmanRho(predicted: readonly number[], actual: readonly number[]): MetricValue {
  if (predicted.length !== actual.length || predicted.length < 2) return NON_EVALUABLE
  return pearson(midranksDescending(predicted), midranksDescending(actual))
}

export function top3Retention(value: number | null | undefined): MetricValue {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) return NON_EVALUABLE
  return value
}

export function expectedCalibrationError(
  items: readonly { confidence: number; correct: boolean }[],
  binCount = 5,
): MetricValue {
  if (items.length === 0 || !Number.isInteger(binCount) || binCount < 1) return NON_EVALUABLE
  const bins = Array.from({ length: binCount }, () => ({ count: 0, confidence: 0, correct: 0 }))
  for (const item of items) {
    const clipped = Math.min(1, Math.max(0, item.confidence))
    const index = clipped === 1 ? binCount - 1 : Math.floor(clipped * binCount)
    bins[index].count += 1
    bins[index].confidence += item.confidence
    bins[index].correct += item.correct ? 1 : 0
  }
  let error = 0
  for (const bin of bins) {
    if (bin.count === 0) continue
    error += (bin.count / items.length) * Math.abs(bin.correct / bin.count - bin.confidence / bin.count)
  }
  return error
}

export function paretoCoverageCount(
  recommendedIds: readonly string[] | null | undefined,
  frontierIds: readonly string[],
): MetricValue {
  if (!recommendedIds || recommendedIds.length === 0) return NON_EVALUABLE
  const frontier = new Set(frontierIds)
  return recommendedIds.filter((id) => frontier.has(id)).length
}

export function resourceFeasibility(
  recommendedId: string | null | undefined,
  resourceTier: number | null | undefined,
  maxResourceTier: number,
): MetricValue {
  if (!recommendedId || resourceTier == null || !Number.isFinite(resourceTier)) return NON_EVALUABLE
  return resourceTier <= maxResourceTier ? 1 : 0
}

function selectedMetricIds(metrics: readonly MetricDefinition[]): Set<string> {
  return new Set(metrics.filter((metric) => !metric.auxiliary).map((metric) => metric.id))
}

function normalizePanel(
  observations: readonly BenchmarkObservation[],
  metrics: readonly MetricDefinition[],
  methodIds: readonly string[],
) {
  const allowed = new Set(methodIds)
  const metricIds = selectedMetricIds(metrics)
  const selected = observations.filter((row) => allowed.has(row.methodId) && metricIds.has(row.metricId))
  return percentileNormalize(selected, new Map(metrics.map((metric) => [metric.id, metric])))
}

export function groupScoresFromObservations(
  observations: readonly BenchmarkObservation[],
  metrics: readonly MetricDefinition[],
  weights: Readonly<Record<MetricGroup, number>>,
  methodIds: readonly string[],
): Map<string, Record<string, number>> {
  const metricById = new Map(metrics.map((metric) => [metric.id, metric]))
  const groups = metricGroups.filter((group) => (weights[group] ?? 0) > 0)
  const normalized = normalizePanel(observations, metrics, methodIds)
  const scores = new Map<string, Record<string, number>>()
  for (const methodId of methodIds) {
    const rows = normalized.filter((row) => row.methodId === methodId)
    const groupScores: Record<string, number> = {}
    for (const group of groups) {
      const values = rows.filter((row) => metricById.get(row.metricId)?.group === group).map((row) => row.percentile)
      groupScores[group] = values.length === 0 ? 0.5 : mean(values)
    }
    scores.set(methodId, groupScores)
  }
  return scores
}

export function methodUtilitiesFromObservations(
  observations: readonly BenchmarkObservation[],
  metrics: readonly MetricDefinition[],
  weights: Readonly<Record<MetricGroup, number>>,
  methodIds: readonly string[],
): MethodUtility[] {
  const scores = groupScoresFromObservations(observations, metrics, weights, methodIds)
  const utilities: MethodUtility[] = []
  for (const methodId of methodIds) {
    const groupScores = scores.get(methodId)
    if (!groupScores || normalizePanel(observations, metrics, [methodId]).length === 0) continue
    let utility = 0
    for (const group of metricGroups) {
      const weight = weights[group] ?? 0
      if (weight <= 0 || !Object.hasOwn(groupScores, group)) continue
      utility += weight * groupScores[group]
    }
    utilities.push({ methodId, utility })
  }
  return utilities
}
