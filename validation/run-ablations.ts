import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { filterCompatibleMethods } from '../app/core/router/constraints.ts'
import type { RouterOutcome, TaskProfile } from '../app/core/router/types.ts'
import {
  ABLATIONS,
  METRIC_GROUPS,
  STABILITY_SEEDS,
  WEIGHT_PERTURBATION_FRACTION,
  ablationReportSkeleton,
  applyAblation,
  buildAblationRecords,
  buildStabilityReport,
  perturbGroupWeights,
  roleRetentionRate,
  top3Jaccard,
  type AblationContext,
  type RoleAssignment,
  type SeedOutcome,
} from './src/ablations.ts'
import {
  buildHoldoutProfile,
  partitionFold,
  scoreRecommendation,
  type EvaluationRow,
  type RecommendationView,
  type SplitFold,
} from './src/holdout.ts'
import { NON_EVALUABLE, methodUtilitiesFromObservations, type MetricValue } from './src/metrics.ts'
import { routeMethods } from './src/router-import.ts'
import { buildRouterInput, loadRouterCatalog, scoringView, type RouterCatalog } from './src/scoring-view.ts'

const registeredProfileIds = ['quick_trajectory', 'advanced_trajectory'] as const

interface ProtocolConfig {
  seed: number
  routerReplicates: number
  outrankingDelta: number
  routerVersion: string
  weightPerturbationFraction: number
}

interface CellOutcome {
  foldId: string
  datasetId: string
  studyGroup: string
  profileId: string
  status: 'OK' | 'REFUSED'
  methodId: string | null
  top3: string[]
  roles: RoleAssignment[]
  seed: number
  evidenceDigest: string
  normalizedRegret: MetricValue
}

function routerView(outcome: RouterOutcome): { view: RecommendationView; roles: RoleAssignment[] } {
  if (outcome.status !== 'OK') return { view: { status: 'REFUSED', methodId: null, ranked: [] }, roles: [] }
  const ordered = [...outcome.recommendations].sort((left, right) => {
    const leftBest = left.roles.includes('best_fit') ? 1 : 0
    const rightBest = right.roles.includes('best_fit') ? 1 : 0
    return rightBest - leftBest || right.outrankingFlow - left.outrankingFlow || (left.methodId < right.methodId ? -1 : 1)
  })
  return {
    view: {
      status: 'OK',
      methodId: ordered[0]?.methodId ?? null,
      ranked: ordered.map((row) => row.methodId),
      topThreeRetention: ordered[0]?.topThreeRetention,
    },
    roles: ordered.map((row) => ({ methodId: row.methodId, roles: row.roles })),
  }
}

function resourceTierOf(catalog: RouterCatalog, methodId: string | null): number | undefined {
  if (!methodId) return undefined
  return catalog.methods.find((method) => method.id === methodId)?.resourceTier
}

async function readJson<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(resolve(import.meta.dirname, name), 'utf8')) as T
}

function applyIdentity(context: AblationContext): AblationContext {
  return {
    catalog: context.catalog,
    profile: context.profile,
    options: { ...context.options },
  }
}

function evaluateCells(
  catalog: RouterCatalog,
  folds: readonly SplitFold[],
  protocol: ProtocolConfig,
  bind: (context: AblationContext) => AblationContext,
): CellOutcome[] {
  const templates = registeredProfileIds
    .map((id) => catalog.profiles.find((profile) => profile.id === id))
    .filter((profile): profile is TaskProfile => profile !== undefined)
  const rows: CellOutcome[] = []
  for (const fold of folds) {
    const partition = partitionFold(catalog, fold)
    for (const dataset of partition.holdoutDatasets) {
      const holdoutObs = partition.holdoutObservations.filter((row) => row.datasetId === dataset.id || dataset.aliases.includes(row.datasetId))
      for (const template of templates) {
        const profile = buildHoldoutProfile(template, dataset)
        const bound = bind({
          catalog: partition.fitView,
          profile,
          options: {
            bootstrapReplicates: protocol.routerReplicates,
            outrankingDelta: protocol.outrankingDelta,
          },
        })
        const compatible = filterCompatibleMethods(bound.profile, bound.catalog.methods).compatible.map((method) => method.id)
        const utilities = methodUtilitiesFromObservations(holdoutObs, bound.catalog.metrics, bound.profile.weights, compatible)
        const outcome = routeMethods(buildRouterInput(bound.profile, bound.catalog), bound.options)
        const { view, roles } = routerView(outcome)
        const metrics = scoreRecommendation(view, {
          utilities,
          frontier: [],
          maxResourceTier: bound.profile.maxResourceTier,
          resourceTier: resourceTierOf(bound.catalog, view.methodId),
        })
        rows.push({
          foldId: partition.foldId,
          datasetId: dataset.id,
          studyGroup: dataset.studyGroup,
          profileId: template.id,
          status: view.status,
          methodId: view.methodId,
          top3: view.ranked.slice(0, 3),
          roles,
          seed: bound.profile.seed,
          evidenceDigest: bound.catalog.release.evidenceDigest,
          normalizedRegret: metrics.normalizedRegret,
        })
      }
    }
  }
  return rows
}

function pairedRegretDelta(full: readonly CellOutcome[], ablated: readonly CellOutcome[]): MetricValue {
  const deltas: number[] = []
  for (const row of ablated) {
    const match = full.find((candidate) => (
      candidate.foldId === row.foldId
      && candidate.datasetId === row.datasetId
      && candidate.profileId === row.profileId
    ))
    if (typeof row.normalizedRegret === 'number' && typeof match?.normalizedRegret === 'number') {
      deltas.push(row.normalizedRegret - match.normalizedRegret)
    }
  }
  if (deltas.length === 0) return NON_EVALUABLE
  return deltas.reduce((sum, value) => sum + value, 0) / deltas.length
}

function toEvaluationRows(cells: readonly CellOutcome[], system: string, protocol: ProtocolConfig, catalog: RouterCatalog): EvaluationRow[] {
  return cells.map((cell) => ({
    foldId: cell.foldId,
    datasetId: cell.datasetId,
    studyGroup: cell.studyGroup,
    profileId: cell.profileId,
    system,
    status: cell.status,
    methodId: cell.methodId,
    seed: protocol.seed,
    routerVersion: protocol.routerVersion,
    evidenceVersion: catalog.release.id,
    configDigest: catalog.release.configDigest,
    evidenceDigest: cell.evidenceDigest,
    metrics: {
      top1: NON_EVALUABLE,
      top3: NON_EVALUABLE,
      normalizedRegret: cell.normalizedRegret,
      spearman: NON_EVALUABLE,
      top3Retention: NON_EVALUABLE,
      paretoCoverage: NON_EVALUABLE,
      resourceFeasible: NON_EVALUABLE,
    },
  }))
}

function summarizeSeed(cells: readonly CellOutcome[], seed: number): SeedOutcome {
  const accepted = cells.filter((cell) => cell.status === 'OK')
  if (accepted.length === 0) return { seed, status: 'REFUSED', top3: [], roles: [] }
  const top3 = [...new Set(accepted.flatMap((cell) => cell.top3))]
  const roles = accepted.flatMap((cell) => cell.roles)
  return { seed, status: 'OK', top3, roles }
}

function meanPairwise(
  leftCells: readonly CellOutcome[],
  rightCells: readonly CellOutcome[],
  score: (left: CellOutcome, right: CellOutcome) => MetricValue,
): MetricValue {
  const values: number[] = []
  for (const left of leftCells) {
    const right = rightCells.find((cell) => (
      cell.foldId === left.foldId && cell.datasetId === left.datasetId && cell.profileId === left.profileId
    ))
    if (!right) continue
    const value = score(left, right)
    if (typeof value === 'number') values.push(value)
  }
  if (values.length === 0) return NON_EVALUABLE
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export async function runAblations() {
  const loaded = scoringView(await loadRouterCatalog())
  const protocol = await readJson<ProtocolConfig>('protocol.json')
  const splits = await readJson<{ version: string; folds: SplitFold[] }>('splits.json')
  const skeleton = await ablationReportSkeleton()
  const full = evaluateCells(loaded, splits.folds, protocol, applyIdentity)
  const expressible = new Map<string, { rows: unknown[]; regretDelta: MetricValue }>()
  for (const id of ABLATIONS) {
    if (id === 'without_missingness_penalty' || id === 'without_pareto') continue
    const cells = evaluateCells(loaded, splits.folds, protocol, (context) => {
      const applied = applyAblation(id, context)
      if (applied.status !== 'expressible') return context
      return { catalog: applied.catalog, profile: applied.profile, options: applied.options }
    })
    expressible.set(id, {
      rows: toEvaluationRows(cells, id, protocol, loaded),
      regretDelta: pairedRegretDelta(full, cells),
    })
  }
  const seedCells = new Map<number, CellOutcome[]>()
  for (const seed of STABILITY_SEEDS) {
    seedCells.set(seed, evaluateCells(loaded, splits.folds, protocol, (context) => ({
      catalog: context.catalog,
      profile: { ...context.profile, seed },
      options: context.options,
    })))
  }
  const reference = seedCells.get(STABILITY_SEEDS[0]) ?? []
  const weightOutcomes = METRIC_GROUPS.flatMap((group) => (
    [WEIGHT_PERTURBATION_FRACTION, -WEIGHT_PERTURBATION_FRACTION].map((fraction) => {
      const cells = evaluateCells(loaded, splits.folds, protocol, (context) => ({
        catalog: context.catalog,
        profile: { ...context.profile, weights: perturbGroupWeights(context.profile.weights, group, fraction) },
        options: context.options,
      }))
      return {
        group,
        fraction,
        top3Jaccard: meanPairwise(reference, cells, (left, right) => top3Jaccard(left.top3, right.top3)),
        roleRetention: meanPairwise(reference, cells, (left, right) => roleRetentionRate(left.roles, right.roles)),
      }
    })
  ))
  const result = {
    synthetic: true,
    protocolVersion: 'router-validation-v1',
    routerVersion: protocol.routerVersion,
    seed: protocol.seed,
    generatedAt: new Date().toISOString(),
    splitVersion: skeleton.splitVersion,
    foldIds: skeleton.foldIds,
    ablations: buildAblationRecords(expressible),
    stability: buildStabilityReport({
      seedOutcomes: STABILITY_SEEDS.map((seed) => summarizeSeed(seedCells.get(seed) ?? [], seed)),
      weightOutcomes,
    }),
  }
  const directory = resolve(import.meta.dirname, 'results')
  await mkdir(directory, { recursive: true })
  await writeFile(resolve(directory, 'ablations.json'), `${JSON.stringify(result, null, 2)}\n`)
  return result
}

const entry = process.argv[1]
if (entry && fileURLToPath(import.meta.url) === resolve(entry)) {
  await runAblations()
}
