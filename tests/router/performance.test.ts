import assert from 'node:assert/strict'
import test from 'node:test'

import { routeMethods } from '../../app/core/router/index.ts'
import type { DatasetContext, MethodCapability, MetricDefinition, RouterInput, TaskProfile } from '../../app/core/router/types.ts'
import { withSyntheticRelease } from './release.ts'

const groups = ['latent_geometry', 'continuity', 'trajectory', 'stability', 'biology', 'resources'] as const

function fixture(): RouterInput {
  const profile: TaskProfile = {
    id: 'performance_profile', modality: 'scrna', scale: '10k_50k', goals: ['trajectory_reconstruction'], topology: 'bifurcating',
    priors: { time: true }, perturbation: false,
    weights: Object.fromEntries(groups.map((group) => [group, 1 / groups.length])) as TaskProfile['weights'],
    maxResourceTier: 3, minEffectiveDatasets: 10, minCriticalCoverage: 0.8, seed: 20260823,
  }
  const datasets: DatasetContext[] = Array.from({ length: 50 }, (_, index) => ({
    id: `dataset_${index}`, aliases: [], studyGroup: `study_${index % 10}`, modality: 'scrna', scale: '10k_50k',
    topology: 'bifurcating', priors: { time: true }, perturbation: false,
  }))
  const methods: MethodCapability[] = Array.from({ length: 25 }, (_, index) => ({
    id: `method_${index}`, aliases: [], version: '1.0.0', modalities: ['scrna'], maxScale: 'gt_200k',
    outputs: ['latent', 'pseudotime', 'branch'], requiredPriors: [], supportedGoals: ['trajectory_reconstruction'], resourceTier: (index % 3 + 1) as 1 | 2 | 3,
    installCommand: `python -m pip install method-${index}==1.0.0`, license: 'MIT', sourceUrl: `https://example.test/source/${index}`,
    docsUrl: `https://example.test/docs/${index}`, paperUrl: `https://example.test/paper/${index}`, executable: true,
  }))
  const metrics: MetricDefinition[] = Array.from({ length: 24 }, (_, index) => ({
    id: `metric_${index}`, aliases: [], group: groups[index % groups.length], direction: index % 2 === 0 ? 'higher_is_better' : 'lower_is_better',
    auxiliary: false, description: `Metric ${index}`,
  }))
  const observations = datasets.flatMap((dataset, datasetIndex) => methods.flatMap((method, methodIndex) => metrics.map((metric, metricIndex) => ({
    datasetId: dataset.id, methodId: method.id, metricId: metric.id,
    rawValue: metric.direction === 'higher_is_better' ? (methodIndex * 101 + datasetIndex * 13 + metricIndex * 7) % 997 : (methodIndex * 89 + datasetIndex * 17 + metricIndex * 11) % 991,
    provenance: { paperId: `paper_${datasetIndex % 10}`, locator: `table:${metricIndex}`, datasetVersion: '1', methodVersion: '1.0.0', runConfigId: 'performance', extractedAt: '2026-08-23T00:00:00Z' },
  }))))
  return withSyntheticRelease({ profile, datasets, methods, metrics, observations, routerVersion: 'router-core-v1' }, 'performance-fixture-v1')
}

test('routes an exact production-size fixture deterministically within the Router budget', { timeout: 4000 }, () => {
  const input = fixture()
  assert.equal(input.datasets.length, 50)
  assert.equal(input.methods.length, 25)
  assert.equal(input.metrics.length, 24)
  assert.equal(input.observations.length, 50 * 25 * 24)
  assert.deepEqual(new Set(input.metrics.map(({ group }) => group)), new Set(groups))
  const triples = input.observations.map(({ datasetId, methodId, metricId }) => `${datasetId}\u0000${methodId}\u0000${metricId}`)
  assert.equal(new Set(triples).size, 50 * 25 * 24)
  assert.deepEqual(
    new Set(triples),
    new Set(input.datasets.flatMap(({ id: datasetId }) => input.methods.flatMap(({ id: methodId }) => input.metrics.map(({ id: metricId }) => `${datasetId}\u0000${methodId}\u0000${metricId}`)))),
  )
  for (const observation of input.observations) {
    assert.deepEqual(Object.keys(observation.provenance).sort(), ['datasetVersion', 'extractedAt', 'locator', 'methodVersion', 'paperId', 'runConfigId'])
    assert.ok(Object.values(observation.provenance).every((value) => typeof value === 'string' && value.length > 0))
    assert.equal(Number.isNaN(Date.parse(observation.provenance.extractedAt)), false)
    assert.equal(observation.provenance.methodVersion, '1.0.0')
  }
  for (const group of groups) {
    const metricIds = new Set(input.metrics.filter((metric) => metric.group === group).map((metric) => metric.id))
    assert.ok(new Set(input.observations.filter((observation) => metricIds.has(observation.metricId)).map((observation) => observation.rawValue)).size > 1, group)
  }

  const options = { bootstrapReplicates: 500 } as const
  assert.equal(options.bootstrapReplicates, 500)

  const firstStarted = performance.now()
  const first = routeMethods(input, options)
  const firstMs = performance.now() - firstStarted
  const secondStarted = performance.now()
  const second = routeMethods(input, options)
  const secondMs = performance.now() - secondStarted

  assert.deepEqual(first, second)
  assert.equal(first.status, 'OK')
  assert.equal(first.seed, 20260823)
  assert.ok(firstMs < 2000, `first run took ${firstMs.toFixed(1)}ms`)
  assert.ok(secondMs < 2000, `second run took ${secondMs.toFixed(1)}ms`)
  console.log(`500-replicate routeMethods timings: first=${firstMs.toFixed(1)}ms, second=${secondMs.toFixed(1)}ms`)
})
