import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { filterCompatibleMethods } from '../../app/core/router/constraints.ts'
import { paretoLayers } from '../../app/core/router/pareto.ts'
import type {
  BenchmarkObservation,
  DatasetContext,
  MethodCapability,
  RouterOutcome,
  TaskProfile,
} from '../../app/core/router/types.ts'
import { BASELINE_IDS, recommendBaseline } from './baselines.ts'
import {
  groupScoresFromObservations,
  methodUtilitiesFromObservations,
  normalizedRegret,
  paretoCoverageCount,
  resourceFeasibility,
  spearmanRho,
  top1Hit,
  top3Hit,
  top3Retention,
  type MetricValue,
  type MethodUtility,
} from './metrics.ts'
import { routeMethods } from './router-import.ts'
import { buildRouterInput, loadRouterCatalog, scoringView, type RouterCatalog } from './scoring-view.ts'

const registeredProfileIds = ['quick_trajectory', 'advanced_trajectory'] as const

export interface SplitFold {
  id: string
  heldOutStudyGroups: string[]
  fitStudyGroups: string[]
}

export interface FoldPartition {
  foldId: string
  heldOutStudyGroups: string[]
  fitStudyGroups: string[]
  fitView: RouterCatalog
  holdoutDatasets: DatasetContext[]
  holdoutObservations: BenchmarkObservation[]
}

export interface RecommendationView {
  status: 'OK' | 'REFUSED'
  methodId: string | null
  ranked: string[]
  topThreeRetention?: number
}

export interface ScoreContext {
  utilities: MethodUtility[]
  frontier: string[]
  maxResourceTier: number
  resourceTier?: number
}

export interface EvaluationMetrics {
  top1: MetricValue
  top3: MetricValue
  normalizedRegret: MetricValue
  spearman: MetricValue
  top3Retention: MetricValue
  paretoCoverage: MetricValue
  resourceFeasible: MetricValue
}

export interface EvaluationRow {
  foldId: string
  datasetId: string
  studyGroup: string
  profileId: string
  system: string
  status: 'OK' | 'REFUSED'
  methodId: string | null
  seed: number
  routerVersion: string
  evidenceVersion: string
  configDigest: string
  evidenceDigest: string
  metrics: EvaluationMetrics
}

function aliasIndex(datasets: readonly DatasetContext[]): Map<string, string> {
  const index = new Map<string, string>()
  for (const dataset of datasets) {
    index.set(dataset.id, dataset.id)
    for (const alias of dataset.aliases) index.set(alias, dataset.id)
  }
  return index
}

function resolveDatasetId(index: Map<string, string>, datasetId: string): string {
  return index.get(datasetId) ?? datasetId
}

async function readJson<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(resolve(import.meta.dirname, '..', name), 'utf8')) as T
}

export function partitionFold(catalog: RouterCatalog, fold: SplitFold): FoldPartition {
  const index = aliasIndex(catalog.datasets)
  const fitDatasets = catalog.datasets.filter((dataset) => fold.fitStudyGroups.includes(dataset.studyGroup))
  const holdoutDatasets = catalog.datasets.filter((dataset) => fold.heldOutStudyGroups.includes(dataset.studyGroup))
  const fitIds = new Set(fitDatasets.map((dataset) => dataset.id))
  const holdoutIds = new Set(holdoutDatasets.map((dataset) => dataset.id))
  const fitObservations = catalog.observations.filter((row) => fitIds.has(resolveDatasetId(index, row.datasetId)))
  const holdoutObservations = catalog.observations.filter((row) => holdoutIds.has(resolveDatasetId(index, row.datasetId)))
  return {
    foldId: fold.id,
    heldOutStudyGroups: fold.heldOutStudyGroups,
    fitStudyGroups: fold.fitStudyGroups,
    fitView: scoringView({ ...catalog, datasets: fitDatasets, observations: fitObservations }),
    holdoutDatasets,
    holdoutObservations,
  }
}

export function buildHoldoutProfile(registered: TaskProfile, dataset: DatasetContext): TaskProfile {
  return {
    ...registered,
    modality: dataset.modality,
    scale: dataset.scale,
    topology: dataset.topology,
    priors: { ...dataset.priors },
    perturbation: dataset.perturbation,
  }
}

export function scoreRecommendation(recommendation: RecommendationView, context: ScoreContext): EvaluationMetrics {
  const methodId = recommendation.status === 'OK' ? recommendation.methodId : null
  const predicted = context.utilities.map((row) => {
    const index = recommendation.ranked.indexOf(row.methodId)
    return index < 0 ? -recommendation.ranked.length - 1 : recommendation.ranked.length - index
  })
  return {
    top1: top1Hit(methodId, context.utilities),
    top3: top3Hit(methodId, context.utilities),
    normalizedRegret: normalizedRegret(methodId, context.utilities),
    spearman: spearmanRho(predicted, context.utilities.map((row) => row.utility)),
    top3Retention: top3Retention(recommendation.topThreeRetention),
    paretoCoverage: paretoCoverageCount(methodId ? [methodId] : null, context.frontier),
    resourceFeasible: resourceFeasibility(methodId, context.resourceTier, context.maxResourceTier),
  }
}

function holdoutFrontier(
  observations: readonly BenchmarkObservation[],
  catalog: RouterCatalog,
  profile: TaskProfile,
  methodIds: readonly string[],
): string[] {
  const scores = groupScoresFromObservations(observations, catalog.metrics, profile.weights, methodIds)
  const vectors = [...scores.entries()]
    .filter(([, groupScores]) => Object.keys(groupScores).length > 0)
    .map(([methodId, groupScores]) => ({ methodId, scores: groupScores, criticalGroups: Object.keys(groupScores) }))
  if (vectors.length === 0) return []
  const layers = paretoLayers(vectors)
  return [...layers.entries()].filter(([, layer]) => layer === 0).map(([methodId]) => methodId)
}

function routerRecommendation(outcome: RouterOutcome): RecommendationView {
  if (outcome.status !== 'OK') return { status: 'REFUSED', methodId: null, ranked: [] }
  const ordered = [...outcome.recommendations].sort((left, right) => {
    const leftBest = left.roles.includes('best_fit') ? 1 : 0
    const rightBest = right.roles.includes('best_fit') ? 1 : 0
    return rightBest - leftBest || right.outrankingFlow - left.outrankingFlow || (left.methodId < right.methodId ? -1 : 1)
  })
  const best = ordered[0]
  return {
    status: 'OK',
    methodId: best?.methodId ?? null,
    ranked: ordered.map((row) => row.methodId),
    topThreeRetention: best?.topThreeRetention,
  }
}

function resourceTierOf(methods: readonly MethodCapability[], methodId: string | null): number | undefined {
  if (!methodId) return undefined
  return methods.find((method) => method.id === methodId)?.resourceTier
}

function observationsForDataset(
  observations: readonly BenchmarkObservation[],
  datasets: readonly DatasetContext[],
  datasetId: string,
): BenchmarkObservation[] {
  const index = aliasIndex(datasets)
  const canonical = resolveDatasetId(index, datasetId)
  return observations.filter((row) => resolveDatasetId(index, row.datasetId) === canonical)
}

export async function evaluateGroupedHoldout(catalog?: RouterCatalog): Promise<EvaluationRow[]> {
  const loaded = catalog ?? await loadRouterCatalog()
  const protocol = await readJson<{
    seed: number
    routerReplicates: number
    outrankingDelta: number
    routerVersion: string
  }>('protocol.json')
  const splits = await readJson<{ folds: SplitFold[] }>('splits.json')
  const rows: EvaluationRow[] = []

  for (const fold of splits.folds) {
    const partition = partitionFold(loaded, fold)
    const templates = registeredProfileIds
      .map((id) => loaded.profiles.find((profile) => profile.id === id))
      .filter((profile): profile is TaskProfile => profile !== undefined)

    for (const dataset of partition.holdoutDatasets) {
      const holdoutObs = observationsForDataset(partition.holdoutObservations, loaded.datasets, dataset.id)
      for (const template of templates) {
        const profile = buildHoldoutProfile(template, dataset)
        const compatible = filterCompatibleMethods(profile, partition.fitView.methods).compatible.map((method) => method.id)
        const utilities = methodUtilitiesFromObservations(holdoutObs, partition.fitView.metrics, profile.weights, compatible)
        const frontier = holdoutFrontier(holdoutObs, partition.fitView, profile, compatible)
        const outcome = routeMethods(buildRouterInput(profile, partition.fitView), {
          bootstrapReplicates: protocol.routerReplicates,
          outrankingDelta: protocol.outrankingDelta,
        })
        const recommendations: Array<{ system: string; view: RecommendationView }> = [
          { system: 'router', view: routerRecommendation(outcome) },
        ]
        const baselineInput = {
          profile,
          methods: partition.fitView.methods,
          metrics: partition.fitView.metrics,
          datasets: partition.fitView.datasets,
          observations: partition.fitView.observations,
          seed: protocol.seed,
        }
        for (const system of BASELINE_IDS) {
          const baseline = recommendBaseline(system, baselineInput)
          recommendations.push({
            system,
            view: {
              status: baseline.status,
              methodId: baseline.methodId,
              ranked: baseline.ranked,
            },
          })
        }

        for (const { system, view } of recommendations) {
          rows.push({
            foldId: partition.foldId,
            datasetId: dataset.id,
            studyGroup: dataset.studyGroup,
            profileId: template.id,
            system,
            status: view.status,
            methodId: view.methodId,
            seed: protocol.seed,
            routerVersion: protocol.routerVersion,
            evidenceVersion: partition.fitView.release.id,
            configDigest: partition.fitView.release.configDigest,
            evidenceDigest: partition.fitView.release.evidenceDigest,
            metrics: scoreRecommendation(view, {
              utilities,
              frontier,
              maxResourceTier: profile.maxResourceTier,
              resourceTier: resourceTierOf(partition.fitView.methods, view.methodId),
            }),
          })
        }
      }
    }
  }

  return rows
}
