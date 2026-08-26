import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, it } from 'node:test'
import type { MetricGroup, RouterOptions, TaskProfile } from '../../app/core/router/types.ts'
import type { RouterCatalog } from '../../validation/src/load-catalog.ts'

const EXPECTED_ABLATIONS = [
  'without_context_similarity',
  'without_latent_geometry',
  'without_continuity_trajectory',
  'without_resource_constraints',
  'weak_bootstrap',
  'without_missingness_penalty',
  'without_pareto',
] as const

const EXPRESSIBLE = [
  'without_context_similarity',
  'without_latent_geometry',
  'without_continuity_trajectory',
  'without_resource_constraints',
  'weak_bootstrap',
] as const

const UNSUPPORTED = ['without_missingness_penalty', 'without_pareto'] as const
const GROUPS: readonly MetricGroup[] = [
  'latent_geometry',
  'continuity',
  'trajectory',
  'stability',
  'biology',
  'resources',
]
const defaultOptions: RouterOptions = { bootstrapReplicates: 200, outrankingDelta: 0.02 }

function observationKey(row: { datasetId: string; methodId: string; metricId: string }): string {
  return `${row.datasetId}|${row.methodId}|${row.metricId}`
}

function metricGroupOf(catalog: RouterCatalog, metricId: string): string | undefined {
  return catalog.metrics.find((metric) => metric.id === metricId)?.group
}

function contextOf(dataset: RouterCatalog['datasets'][number]) {
  return {
    modality: dataset.modality,
    scale: dataset.scale,
    topology: dataset.topology,
    priors: dataset.priors,
    perturbation: dataset.perturbation,
  }
}

async function loadContext() {
  const { loadRouterCatalog, scoringView } = await import('../../validation/src/scoring-view.ts')
  const { buildHoldoutProfile } = await import('../../validation/src/holdout.ts')
  const catalog = scoringView(await loadRouterCatalog())
  const template = catalog.profiles.find((profile) => profile.id === 'quick_trajectory')
  if (!template) throw new Error('missing quick_trajectory')
  const dataset = catalog.datasets.find((row) => row.id === 'synthetic_linear_small')
  if (!dataset) throw new Error('missing linear dataset')
  return {
    catalog,
    profile: buildHoldoutProfile(template, dataset),
    options: { ...defaultOptions },
  }
}

describe('expressible ablations', () => {
  it('encodes the seven fixed ablation ids', async () => {
    const { ABLATIONS } = await import('../../validation/src/ablations.ts')
    assert.deepEqual(ABLATIONS, EXPECTED_ABLATIONS)
  })

  it('without_context_similarity copies only fit dataset context fields and rebinds the digest', async () => {
    const { applyAblation } = await import('../../validation/src/ablations.ts')
    const { gowerSimilarity } = await import('../../app/core/router/gower.ts')
    const context = await loadContext()
    const beforeObs = context.catalog.observations.map(observationKey)
    const beforeDigest = context.catalog.release.evidenceDigest
    const applied = applyAblation('without_context_similarity', context)
    assert.equal(applied.status, 'expressible')
    if (applied.status !== 'expressible') return
    assert.notEqual(applied.catalog.release.evidenceDigest, beforeDigest)
    assert.equal(applied.catalog.release.configDigest, context.catalog.release.configDigest)
    assert.deepEqual(applied.catalog.observations.map(observationKey), beforeObs)
    assert.deepEqual(applied.profile, context.profile)
    assert.deepEqual(applied.options, context.options)
    const expected = contextOf({
      ...context.catalog.datasets[0],
      modality: context.profile.modality,
      scale: context.profile.scale,
      topology: context.profile.topology,
      priors: Object.fromEntries(
        Object.entries(context.profile.priors).filter(([, value]) => value === true || value === false),
      ),
      perturbation: context.profile.perturbation,
    })
    for (const dataset of applied.catalog.datasets) {
      assert.deepEqual(contextOf(dataset), expected)
    }
    const similarities = applied.catalog.datasets.map((dataset) => (
      gowerSimilarity(applied.profile, dataset, {
        modality: 1,
        scale: 1,
        topology: 1,
        priors: 1,
        perturbation: 1,
      })
    ))
    assert.equal(new Set(similarities).size, 1)
    assert.equal(context.catalog.datasets.some((dataset) => (
      dataset.scale !== context.profile.scale || dataset.topology !== context.profile.topology
    )), true)
  })

  it('without_latent_geometry drops only latent-geometry observations and rebinds the digest', async () => {
    const { applyAblation } = await import('../../validation/src/ablations.ts')
    const context = await loadContext()
    const dropped = context.catalog.observations.filter((row) => metricGroupOf(context.catalog, row.metricId) === 'latent_geometry')
    const kept = context.catalog.observations.filter((row) => metricGroupOf(context.catalog, row.metricId) !== 'latent_geometry')
    assert.equal(dropped.length > 0, true)
    const applied = applyAblation('without_latent_geometry', context)
    assert.equal(applied.status, 'expressible')
    if (applied.status !== 'expressible') return
    assert.notEqual(applied.catalog.release.evidenceDigest, context.catalog.release.evidenceDigest)
    assert.equal(applied.catalog.release.configDigest, context.catalog.release.configDigest)
    assert.deepEqual(applied.catalog.observations.map(observationKey).sort(), kept.map(observationKey).sort())
    assert.equal(applied.catalog.observations.some((row) => metricGroupOf(context.catalog, row.metricId) === 'latent_geometry'), false)
    assert.deepEqual(applied.catalog.datasets.map((dataset) => dataset.id), context.catalog.datasets.map((dataset) => dataset.id))
    assert.deepEqual(applied.profile, context.profile)
    assert.deepEqual(applied.options, context.options)
  })

  it('without_continuity_trajectory drops only those groups and rebinds the digest', async () => {
    const { applyAblation } = await import('../../validation/src/ablations.ts')
    const context = await loadContext()
    const kept = context.catalog.observations.filter((row) => {
      const group = metricGroupOf(context.catalog, row.metricId)
      return group !== 'continuity' && group !== 'trajectory'
    })
    const applied = applyAblation('without_continuity_trajectory', context)
    assert.equal(applied.status, 'expressible')
    if (applied.status !== 'expressible') return
    assert.notEqual(applied.catalog.release.evidenceDigest, context.catalog.release.evidenceDigest)
    assert.deepEqual(applied.catalog.observations.map(observationKey).sort(), kept.map(observationKey).sort())
    assert.equal(applied.catalog.observations.some((row) => {
      const group = metricGroupOf(context.catalog, row.metricId)
      return group === 'continuity' || group === 'trajectory'
    }), false)
    assert.deepEqual(applied.profile, context.profile)
    assert.deepEqual(applied.options, context.options)
  })

  it('without_resource_constraints only raises maxResourceTier to 3', async () => {
    const { applyAblation } = await import('../../validation/src/ablations.ts')
    const context = await loadContext()
    assert.equal(context.profile.maxResourceTier, 2)
    const applied = applyAblation('without_resource_constraints', context)
    assert.equal(applied.status, 'expressible')
    if (applied.status !== 'expressible') return
    assert.equal(applied.profile.maxResourceTier, 3)
    assert.deepEqual({ ...applied.profile, maxResourceTier: 2 }, context.profile)
    assert.equal(applied.catalog.release.evidenceDigest, context.catalog.release.evidenceDigest)
    assert.deepEqual(applied.catalog.observations, context.catalog.observations)
    assert.deepEqual(applied.options, context.options)
  })

  it('weak_bootstrap only sets bootstrapReplicates to 1', async () => {
    const { applyAblation } = await import('../../validation/src/ablations.ts')
    const context = await loadContext()
    const applied = applyAblation('weak_bootstrap', context)
    assert.equal(applied.status, 'expressible')
    if (applied.status !== 'expressible') return
    assert.equal(applied.options.bootstrapReplicates, 1)
    assert.deepEqual({ ...applied.options, bootstrapReplicates: 200 }, context.options)
    assert.deepEqual(applied.profile, context.profile)
    assert.equal(applied.catalog.release.evidenceDigest, context.catalog.release.evidenceDigest)
  })

  it('does not mutate the input catalog or profile', async () => {
    const { applyAblation } = await import('../../validation/src/ablations.ts')
    const context = await loadContext()
    const observationCount = context.catalog.observations.length
    const digest = context.catalog.release.evidenceDigest
    const tier = context.profile.maxResourceTier
    applyAblation('without_latent_geometry', context)
    applyAblation('without_context_similarity', context)
    applyAblation('without_resource_constraints', context)
    assert.equal(context.catalog.observations.length, observationCount)
    assert.equal(context.catalog.release.evidenceDigest, digest)
    assert.equal(context.profile.maxResourceTier, tier)
  })

  it('preserves split versions for every expressible ablation', async () => {
    const { applyAblation, ablationReportSkeleton } = await import('../../validation/src/ablations.ts')
    const splits = JSON.parse(await readFile(resolve(import.meta.dirname, '../../validation/splits.json'), 'utf8'))
    const context = await loadContext()
    for (const id of EXPRESSIBLE) {
      const applied = applyAblation(id, context)
      assert.equal(applied.status, 'expressible')
    }
    const splitsAfter = JSON.parse(await readFile(resolve(import.meta.dirname, '../../validation/splits.json'), 'utf8'))
    assert.deepEqual(splitsAfter, splits)
    const skeleton = await ablationReportSkeleton()
    assert.equal(skeleton.splitVersion, splits.version)
    assert.deepEqual(skeleton.foldIds, splits.folds.map((fold: { id: string }) => fold.id))
    assert.equal(skeleton.seed, 20260823)
  })
})

describe('unsupported ablations', () => {
  it('records unsupported status and never emits a numeric regret delta', async () => {
    const { applyAblation, buildAblationRecords } = await import('../../validation/src/ablations.ts')
    const context = await loadContext()
    for (const id of UNSUPPORTED) {
      const applied = applyAblation(id, context)
      assert.equal(applied.status, 'unsupported')
      if (applied.status !== 'unsupported') continue
      assert.equal(typeof applied.reason, 'string')
      assert.equal(applied.reason.length > 0, true)
      assert.equal(Object.hasOwn(applied, 'catalog'), false)
      assert.equal(Object.hasOwn(applied, 'regretDelta'), false)
      assert.equal(Object.hasOwn(applied, 'options'), false)
    }
    const records = buildAblationRecords(new Map([
      ['without_context_similarity', { regretDelta: 0.12, rows: [] }],
    ]))
    assert.equal(records.length, 7)
    for (const record of records) {
      if (record.status === 'unsupported') {
        assert.ok(UNSUPPORTED.includes(record.id as typeof UNSUPPORTED[number]))
        assert.equal(Object.hasOwn(record, 'regretDelta'), false)
        assert.equal(Object.hasOwn(record, 'rows'), false)
        assert.equal(Object.hasOwn(record, 'delta'), false)
        assert.equal(Object.hasOwn(record, 'effect'), false)
        assert.equal(typeof record.reason, 'string')
        assert.equal(typeof (record as { regretDelta?: unknown }).regretDelta, 'undefined')
      } else {
        assert.ok(EXPRESSIBLE.includes(record.id as typeof EXPRESSIBLE[number]))
      }
    }
  })

  it('does not fork recommend.ts or invent a Pareto-off option', async () => {
    const source = await readFile(resolve(import.meta.dirname, '../../validation/src/ablations.ts'), 'utf8')
    assert.equal(source.includes('recommend.ts'), false)
    assert.equal(source.includes('function routeMethods'), false)
    assert.equal(/paretoOff|disablePareto|skipPareto|withoutPareto\s*:/.test(source), false)
    assert.equal(/missingnessPenalty\s*:/.test(source), false)
  })
})

describe('stability', () => {
  it('uses seeds 20260823-20260827 and does not cherry-pick the best seed', async () => {
    const { STABILITY_SEEDS, buildStabilityReport } = await import('../../validation/src/ablations.ts')
    assert.deepEqual([...STABILITY_SEEDS], [20260823, 20260824, 20260825, 20260826, 20260827])
    const report = buildStabilityReport({
      seedOutcomes: STABILITY_SEEDS.map((seed) => ({
        seed,
        status: 'REFUSED' as const,
        top3: [],
        roles: [],
      })),
      weightOutcomes: [],
    })
    assert.deepEqual(report.seeds, [20260823, 20260824, 20260825, 20260826, 20260827])
    assert.equal(report.seedOutcomes.length, 5)
    assert.deepEqual(report.seedOutcomes.map((row) => row.seed), [...STABILITY_SEEDS])
    assert.equal(Object.hasOwn(report, 'bestSeed'), false)
    assert.equal(Object.hasOwn(report, 'selectedSeed'), false)
    assert.equal(report.top3Jaccard.pairwise.length, 10)
  })

  it('renormalizes ±10% weight perturbations to the same positive sum', async () => {
    const { perturbGroupWeights, WEIGHT_PERTURBATION_FRACTION } = await import('../../validation/src/ablations.ts')
    const weights: Record<MetricGroup, number> = {
      latent_geometry: 0.2,
      continuity: 0.25,
      trajectory: 0.3,
      stability: 0.1,
      biology: 0.1,
      resources: 0.05,
    }
    const sum = GROUPS.reduce((total, group) => total + weights[group], 0)
    assert.equal(WEIGHT_PERTURBATION_FRACTION, 0.1)
    for (const group of GROUPS) {
      for (const fraction of [0.1, -0.1]) {
        const perturbed = perturbGroupWeights(weights, group, fraction)
        const nextSum = GROUPS.reduce((total, key) => total + perturbed[key], 0)
        assert.ok(Math.abs(nextSum - sum) < 1e-12)
        assert.equal(nextSum > 0, true)
        if (fraction > 0) assert.ok(perturbed[group] / nextSum > weights[group] / sum)
        if (fraction < 0) assert.ok(perturbed[group] / nextSum < weights[group] / sum)
      }
    }
  })

  it('reports Top-3 Jaccard and role retention without treating empty rankings as zero', async () => {
    const { top3Jaccard, roleRetentionRate } = await import('../../validation/src/ablations.ts')
    const { NON_EVALUABLE } = await import('../../validation/src/metrics.ts')
    assert.equal(top3Jaccard(['a', 'b', 'c'], ['a', 'b', 'd']), 0.5)
    assert.equal(top3Jaccard([], []), NON_EVALUABLE)
    assert.notEqual(top3Jaccard([], []), 0)
    assert.equal(roleRetentionRate(
      [{ methodId: 'a', roles: ['best_fit'] }],
      [{ methodId: 'a', roles: ['best_fit'] }],
    ), 1)
    assert.equal(roleRetentionRate([], []), NON_EVALUABLE)
    assert.notEqual(roleRetentionRate([], []), 0)
  })
})
