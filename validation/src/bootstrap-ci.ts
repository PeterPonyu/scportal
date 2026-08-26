import { createRng, sortCodeUnits } from '../../app/core/router/random.ts'
import { NON_EVALUABLE, type MetricValue } from './metrics.ts'

export interface BootstrapRow {
  studyGroup: string
  value: MetricValue
}

export interface BootstrapSummary {
  median: MetricValue
  mean: MetricValue
  p2_5: MetricValue
  p97_5: MetricValue
  evaluableTaskCount: number
  studyCount: number
  replicates: number
  seed: number
}

function quantile(sorted: readonly number[], probability: number): number {
  const index = (sorted.length - 1) * probability
  const low = Math.floor(index)
  const high = Math.ceil(index)
  if (low === high) return sorted[low]
  return sorted[low] * (high - index) + sorted[high] * (index - low)
}

export function bootstrapStudyGroups(
  rows: readonly BootstrapRow[],
  options: { replicates?: number; seed?: number } = {},
): BootstrapSummary {
  const replicates = options.replicates ?? 5000
  const seed = options.seed ?? 20260823
  const groups = sortCodeUnits([...new Set(rows.map((row) => row.studyGroup))])
  const evaluableTaskCount = rows.filter((row) => typeof row.value === 'number').length
  const base = { evaluableTaskCount, studyCount: groups.length, replicates, seed }
  if (groups.length === 0 || evaluableTaskCount === 0) {
    return { ...base, median: NON_EVALUABLE, mean: NON_EVALUABLE, p2_5: NON_EVALUABLE, p97_5: NON_EVALUABLE }
  }

  const byGroup = new Map<string, BootstrapRow[]>()
  for (const row of rows) {
    const list = byGroup.get(row.studyGroup) ?? []
    list.push(row)
    byGroup.set(row.studyGroup, list)
  }

  const rng = createRng(seed)
  const means: number[] = []
  for (let replicate = 0; replicate < replicates; replicate += 1) {
    const sampled: number[] = []
    for (let index = 0; index < groups.length; index += 1) {
      const group = groups[Math.floor(rng() * groups.length)]
      for (const row of byGroup.get(group) ?? []) {
        if (typeof row.value === 'number') sampled.push(row.value)
      }
    }
    if (sampled.length === 0) continue
    means.push(sampled.reduce((sum, value) => sum + value, 0) / sampled.length)
  }
  if (means.length === 0) {
    return { ...base, median: NON_EVALUABLE, mean: NON_EVALUABLE, p2_5: NON_EVALUABLE, p97_5: NON_EVALUABLE }
  }
  means.sort((left, right) => left - right)
  return {
    ...base,
    median: quantile(means, 0.5),
    mean: means.reduce((sum, value) => sum + value, 0) / means.length,
    p2_5: quantile(means, 0.025),
    p97_5: quantile(means, 0.975),
  }
}
