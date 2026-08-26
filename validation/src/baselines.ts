import { filterCompatibleMethods } from '../../app/core/router/constraints.ts'
import { createRng, sortCodeUnits } from '../../app/core/router/random.ts'
import type {
  BenchmarkObservation,
  DatasetContext,
  MethodCapability,
  MetricDefinition,
  Modality,
  ScaleBand,
  TaskProfile,
} from '../../app/core/router/types.ts'
import { methodUtilitiesFromObservations, rankedMethods } from './metrics.ts'

export const BASELINE_IDS = [
  'global_average',
  'most_frequent_top',
  'context_free_tree',
  'weighted_sum',
  'random_compatible',
] as const

export type BaselineId = typeof BASELINE_IDS[number]

export const CONTEXT_FREE_TREE: Readonly<Record<Modality, Readonly<Record<ScaleBand, string>>>> = {
  scrna: {
    lt_10k: 'geometry_vae',
    '10k_50k': 'geometry_vae',
    '50k_200k': 'graph_contrastive',
    gt_200k: 'graph_contrastive',
    unknown: 'geometry_vae',
  },
  scatac: {
    lt_10k: 'graph_contrastive',
    '10k_50k': 'graph_contrastive',
    '50k_200k': 'graph_contrastive',
    gt_200k: 'graph_contrastive',
    unknown: 'graph_contrastive',
  },
  multiome: {
    lt_10k: 'graph_contrastive',
    '10k_50k': 'graph_contrastive',
    '50k_200k': 'graph_contrastive',
    gt_200k: 'graph_contrastive',
    unknown: 'graph_contrastive',
  },
}

export interface BaselineInput {
  profile: TaskProfile
  methods: readonly MethodCapability[]
  metrics: readonly MetricDefinition[]
  datasets: readonly DatasetContext[]
  observations: readonly BenchmarkObservation[]
  seed: number
}

export interface BaselineOutcome {
  system: BaselineId
  status: 'OK' | 'REFUSED'
  methodId: string | null
  ranked: string[]
}

function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function refuse(system: BaselineId): BaselineOutcome {
  return { system, status: 'REFUSED', methodId: null, ranked: [] }
}

function succeed(system: BaselineId, ranked: string[]): BaselineOutcome {
  if (ranked.length === 0) return refuse(system)
  return { system, status: 'OK', methodId: ranked[0], ranked }
}

function compatibleIds(input: BaselineInput): string[] {
  return filterCompatibleMethods(input.profile, input.methods).compatible.map((method) => method.id)
}

function perDatasetUtilities(input: BaselineInput, methodIds: readonly string[]): Map<string, ReturnType<typeof methodUtilitiesFromObservations>> {
  const byDataset = new Map<string, BenchmarkObservation[]>()
  for (const row of input.observations) {
    if (!methodIds.includes(row.methodId)) continue
    const rows = byDataset.get(row.datasetId) ?? []
    rows.push(row)
    byDataset.set(row.datasetId, rows)
  }
  const utilities = new Map<string, ReturnType<typeof methodUtilitiesFromObservations>>()
  for (const [datasetId, rows] of byDataset) {
    utilities.set(datasetId, methodUtilitiesFromObservations(rows, input.metrics, input.profile.weights, methodIds))
  }
  return utilities
}

function globalAverage(input: BaselineInput): BaselineOutcome {
  const ids = compatibleIds(input)
  if (ids.length === 0) return refuse('global_average')
  const totals = new Map<string, { total: number; count: number }>()
  for (const utilities of perDatasetUtilities(input, ids).values()) {
    for (const row of utilities) {
      const acc = totals.get(row.methodId) ?? { total: 0, count: 0 }
      acc.total += row.utility
      acc.count += 1
      totals.set(row.methodId, acc)
    }
  }
  const means = [...totals.entries()].map(([methodId, acc]) => ({ methodId, utility: acc.total / acc.count }))
  return succeed('global_average', rankedMethods(means).map((row) => row.methodId))
}

function mostFrequentTop(input: BaselineInput): BaselineOutcome {
  const ids = compatibleIds(input)
  if (ids.length === 0) return refuse('most_frequent_top')
  const counts = new Map<string, number>()
  for (const utilities of perDatasetUtilities(input, ids).values()) {
    const winner = rankedMethods(utilities)[0]
    if (!winner) continue
    counts.set(winner.methodId, (counts.get(winner.methodId) ?? 0) + 1)
  }
  if (counts.size === 0) return refuse('most_frequent_top')
  const ranked = [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || compare(left[0], right[0]))
    .map(([methodId]) => methodId)
  for (const methodId of sortCodeUnits(ids)) {
    if (!ranked.includes(methodId)) ranked.push(methodId)
  }
  return succeed('most_frequent_top', ranked)
}

function contextFreeTree(input: BaselineInput): BaselineOutcome {
  const ids = sortCodeUnits(compatibleIds(input))
  if (ids.length === 0) return refuse('context_free_tree')
  const preferred = CONTEXT_FREE_TREE[input.profile.modality][input.profile.scale]
  const ranked = ids.includes(preferred) ? [preferred, ...ids.filter((id) => id !== preferred)] : ids
  return succeed('context_free_tree', ranked)
}

function weightedSum(input: BaselineInput): BaselineOutcome {
  const ids = compatibleIds(input)
  if (ids.length === 0) return refuse('weighted_sum')
  const utilities = methodUtilitiesFromObservations(input.observations, input.metrics, input.profile.weights, ids)
  return succeed('weighted_sum', rankedMethods(utilities).map((row) => row.methodId))
}

function randomCompatible(input: BaselineInput): BaselineOutcome {
  const ids = sortCodeUnits(compatibleIds(input))
  if (ids.length === 0) return refuse('random_compatible')
  const pick = ids[Math.floor(createRng(input.seed)() * ids.length)]
  return succeed('random_compatible', [pick, ...ids.filter((id) => id !== pick)])
}

export function recommendBaseline(id: BaselineId, input: BaselineInput): BaselineOutcome {
  if (id === 'global_average') return globalAverage(input)
  if (id === 'most_frequent_top') return mostFrequentTop(input)
  if (id === 'context_free_tree') return contextFreeTree(input)
  if (id === 'weighted_sum') return weightedSum(input)
  return randomCompatible(input)
}
