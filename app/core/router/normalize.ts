import type { BenchmarkObservation, MetricDefinition } from './types.ts'

export interface NormalizedObservation extends BenchmarkObservation {
  percentile: number
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

export function percentileNormalize(
  observations: readonly BenchmarkObservation[],
  metrics: ReadonlyMap<string, MetricDefinition>,
): NormalizedObservation[] {
  const panels = new Map<string, Map<string, BenchmarkObservation[]>>()

  for (const observation of observations) {
    if (!Number.isFinite(observation.rawValue)) {
      throw new Error(`observation rawValue must be finite: ${observation.methodId}`)
    }
    if (!metrics.has(observation.metricId)) {
      throw new Error(`unknown metric id: ${observation.metricId}`)
    }
    let datasetPanels = panels.get(observation.datasetId)
    if (!datasetPanels) {
      datasetPanels = new Map()
      panels.set(observation.datasetId, datasetPanels)
    }
    const panel = datasetPanels.get(observation.metricId)
    if (panel) panel.push(observation)
    else datasetPanels.set(observation.metricId, [observation])
  }

  const normalized: NormalizedObservation[] = []
  for (const datasetPanels of panels.values()) {
    for (const panel of datasetPanels.values()) {
      const metric = metrics.get(panel[0].metricId)
      if (!metric) throw new Error(`unknown metric id: ${panel[0].metricId}`)
      const ordered = [...panel].sort((left, right) => (
        left.rawValue - right.rawValue || compareCodeUnits(left.methodId, right.methodId)
      ))
      const denominator = ordered.length - 1

      for (let start = 0; start < ordered.length;) {
        let end = start + 1
        while (end < ordered.length && ordered[end].rawValue === ordered[start].rawValue) end += 1
        const averageRank = (start + end - 1) / 2
        const percentile = denominator === 0
          ? 0.5
          : metric.direction === 'higher_is_better'
            ? averageRank / denominator
            : 1 - (averageRank / denominator)
        for (let index = start; index < end; index += 1) {
          normalized.push({ ...ordered[index], percentile })
        }
        start = end
      }
    }
  }

  return normalized.sort((left, right) => (
    compareCodeUnits(left.datasetId, right.datasetId)
    || compareCodeUnits(left.metricId, right.metricId)
    || compareCodeUnits(left.methodId, right.methodId)
  ))
}
