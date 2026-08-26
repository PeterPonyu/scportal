import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type {
  DatasetContext,
  MetricGroup,
  PriorKey,
  RecommendationRole,
  RouterOptions,
  TaskProfile,
} from '../../app/core/router/types.ts'
import { NON_EVALUABLE, type MetricValue } from './metrics.ts'
import { scoringView, type RouterCatalog } from './scoring-view.ts'

export const ABLATIONS = [
  'without_context_similarity',
  'without_latent_geometry',
  'without_continuity_trajectory',
  'without_resource_constraints',
  'weak_bootstrap',
  'without_missingness_penalty',
  'without_pareto',
] as const

export type AblationId = typeof ABLATIONS[number]
export const STABILITY_SEEDS = [20260823, 20260824, 20260825, 20260826, 20260827] as const
export const WEIGHT_PERTURBATION_FRACTION = 0.1
export const METRIC_GROUPS: readonly MetricGroup[] = [
  'latent_geometry',
  'continuity',
  'trajectory',
  'stability',
  'biology',
  'resources',
]

const unsupportedReasons = {
  without_missingness_penalty: 'Landed RouterOptions cannot disable the missingness penalty; do not invent a ranker fork',
  without_pareto: 'Landed RouterOptions cannot disable Pareto; do not invent a Pareto-off fork',
} as const

export interface AblationContext {
  catalog: RouterCatalog
  profile: TaskProfile
  options: RouterOptions
}

export interface ExpressibleAblation {
  status: 'expressible'
  id: Exclude<AblationId, keyof typeof unsupportedReasons>
  catalog: RouterCatalog
  profile: TaskProfile
  options: RouterOptions
}

export interface UnsupportedAblation {
  status: 'unsupported'
  id: keyof typeof unsupportedReasons
  reason: string
}

export type AblationApplication = ExpressibleAblation | UnsupportedAblation

export interface AblationRecordExpressible {
  id: ExpressibleAblation['id']
  status: 'expressible'
  rows: unknown[]
  regretDelta: MetricValue
}

export interface AblationRecordUnsupported {
  id: UnsupportedAblation['id']
  status: 'unsupported'
  reason: string
}

export type AblationRecord = AblationRecordExpressible | AblationRecordUnsupported

export interface RoleAssignment {
  methodId: string
  roles: RecommendationRole[]
}

export interface SeedOutcome {
  seed: number
  status: 'OK' | 'REFUSED'
  top3: string[]
  roles: RoleAssignment[]
}

async function readJson<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(resolve(import.meta.dirname, '..', name), 'utf8')) as T
}

function booleanPriors(priors: TaskProfile['priors']): DatasetContext['priors'] {
  const copied: DatasetContext['priors'] = {}
  for (const key of Object.keys(priors) as PriorKey[]) {
    const value = priors[key]
    if (value === true || value === false) copied[key] = value
  }
  return copied
}

function rebind(catalog: RouterCatalog): RouterCatalog {
  return scoringView(catalog)
}

function dropGroups(catalog: RouterCatalog, groups: readonly MetricGroup[]): RouterCatalog {
  const drop = new Set(catalog.metrics.filter((metric) => groups.includes(metric.group)).map((metric) => metric.id))
  return rebind({
    ...catalog,
    observations: catalog.observations.filter((row) => !drop.has(row.metricId)),
  })
}

export function applyAblation(id: AblationId, context: AblationContext): AblationApplication {
  if (id === 'without_missingness_penalty' || id === 'without_pareto') {
    return { status: 'unsupported', id, reason: unsupportedReasons[id] }
  }
  const catalog = structuredClone(context.catalog)
  const profile = structuredClone(context.profile)
  const options = structuredClone(context.options)
  if (id === 'without_context_similarity') {
    const priors = booleanPriors(profile.priors)
    catalog.datasets = catalog.datasets.map((dataset) => ({
      ...dataset,
      modality: profile.modality,
      scale: profile.scale,
      topology: profile.topology,
      priors: { ...priors },
      perturbation: profile.perturbation,
    }))
    return { status: 'expressible', id, catalog: rebind(catalog), profile, options }
  }
  if (id === 'without_latent_geometry') {
    return { status: 'expressible', id, catalog: dropGroups(catalog, ['latent_geometry']), profile, options }
  }
  if (id === 'without_continuity_trajectory') {
    return { status: 'expressible', id, catalog: dropGroups(catalog, ['continuity', 'trajectory']), profile, options }
  }
  if (id === 'without_resource_constraints') {
    profile.maxResourceTier = 3
    return { status: 'expressible', id, catalog, profile, options }
  }
  options.bootstrapReplicates = 1
  return { status: 'expressible', id, catalog, profile, options }
}

export async function ablationReportSkeleton() {
  const splits = await readJson<{ version: string; folds: Array<{ id: string }> }>('splits.json')
  const protocol = await readJson<{ seed: number }>('protocol.json')
  return {
    splitVersion: splits.version,
    foldIds: splits.folds.map((fold) => fold.id),
    seed: protocol.seed,
  }
}

export function buildAblationRecords(
  expressible: Map<string, { rows: unknown[]; regretDelta: MetricValue }>,
): AblationRecord[] {
  return ABLATIONS.map((id) => {
    if (id === 'without_missingness_penalty' || id === 'without_pareto') {
      return { id, status: 'unsupported', reason: unsupportedReasons[id] }
    }
    const payload = expressible.get(id)
    return {
      id,
      status: 'expressible',
      rows: payload?.rows ?? [],
      regretDelta: payload?.regretDelta ?? NON_EVALUABLE,
    }
  })
}

export function perturbGroupWeights(
  weights: Readonly<Record<MetricGroup, number>>,
  group: MetricGroup,
  fraction: number,
): Record<MetricGroup, number> {
  const next = { ...weights, [group]: weights[group] * (1 + fraction) }
  const previousSum = METRIC_GROUPS.reduce((sum, key) => sum + weights[key], 0)
  const nextSum = METRIC_GROUPS.reduce((sum, key) => sum + next[key], 0)
  if (!(previousSum > 0) || !(nextSum > 0)) throw new Error('weight perturbation requires a positive sum')
  const scale = previousSum / nextSum
  const renormalized = { ...next }
  for (const key of METRIC_GROUPS) renormalized[key] = next[key] * scale
  return renormalized
}

export function top3Jaccard(left: readonly string[], right: readonly string[]): MetricValue {
  const first = new Set(left.slice(0, 3))
  const second = new Set(right.slice(0, 3))
  if (first.size === 0 && second.size === 0) return NON_EVALUABLE
  let intersection = 0
  for (const id of first) if (second.has(id)) intersection += 1
  return intersection / new Set([...first, ...second]).size
}

export function roleRetentionRate(
  reference: readonly RoleAssignment[],
  other: readonly RoleAssignment[],
): MetricValue {
  if (reference.length === 0 && other.length === 0) return NON_EVALUABLE
  const otherRoles = new Map(other.map((row) => [row.methodId, new Set(row.roles)]))
  let retained = 0
  let total = 0
  for (const row of reference) {
    for (const role of row.roles) {
      total += 1
      if (otherRoles.get(row.methodId)?.has(role)) retained += 1
    }
  }
  return total === 0 ? NON_EVALUABLE : retained / total
}

function meanMetric(values: readonly MetricValue[]): MetricValue {
  const numeric = values.filter((value): value is number => typeof value === 'number')
  if (numeric.length === 0) return NON_EVALUABLE
  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length
}

export function buildStabilityReport(input: {
  seedOutcomes: readonly SeedOutcome[]
  weightOutcomes: readonly unknown[]
}) {
  const pairwise: Array<{
    leftSeed: number
    rightSeed: number
    top3Jaccard: MetricValue
    roleRetention: MetricValue
  }> = []
  for (let left = 0; left < input.seedOutcomes.length; left += 1) {
    for (let right = left + 1; right < input.seedOutcomes.length; right += 1) {
      pairwise.push({
        leftSeed: input.seedOutcomes[left].seed,
        rightSeed: input.seedOutcomes[right].seed,
        top3Jaccard: top3Jaccard(input.seedOutcomes[left].top3, input.seedOutcomes[right].top3),
        roleRetention: roleRetentionRate(input.seedOutcomes[left].roles, input.seedOutcomes[right].roles),
      })
    }
  }
  return {
    seeds: [...STABILITY_SEEDS],
    weightPerturbationFraction: WEIGHT_PERTURBATION_FRACTION,
    seedOutcomes: [...input.seedOutcomes],
    top3Jaccard: {
      pairwise,
      mean: meanMetric(pairwise.map((row) => row.top3Jaccard)),
    },
    roleRetention: {
      pairwise: pairwise.map((row) => ({
        leftSeed: row.leftSeed,
        rightSeed: row.rightSeed,
        value: row.roleRetention,
      })),
      mean: meanMetric(pairwise.map((row) => row.roleRetention)),
    },
    weightPerturbations: [...input.weightOutcomes],
  }
}
