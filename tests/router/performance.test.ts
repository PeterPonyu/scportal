import assert from 'node:assert/strict'
import test from 'node:test'

import { routeMethods } from '../../app/core/router/index.ts'
import type { DatasetContext, MethodCapability, MetricDefinition, RouterInput, TaskProfile } from '../../app/core/router/types.ts'

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
  return { profile, datasets, methods, metrics, observations, evidenceVersion: 'performance-fixture-v1', routerVersion: 'router-core-v1', releaseSynthetic: true }
}

test('routes an exact production-size fixture deterministically within the Router budget', { timeout: 4000 }, () => {
  const input = fixture()
  assert.equal(input.datasets.length, 50)
  assert.equal(input.methods.length, 25)
  assert.equal(input.metrics.length, 24)
  assert.deepEqual(new Set(input.metrics.map(({ group }) => group)), new Set(groups))

  const firstStarted = performance.now()
  const first = routeMethods(input, { bootstrapReplicates: 500 })
  const firstMs = performance.now() - firstStarted
  const secondStarted = performance.now()
  const second = routeMethods(input, { bootstrapReplicates: 500 })
  const secondMs = performance.now() - secondStarted

  assert.deepEqual(first, second)
  assert.equal(first.status, 'OK')
  assert.ok(firstMs < 2000, `first run took ${firstMs.toFixed(1)}ms`)
  assert.ok(secondMs < 2000, `second run took ${secondMs.toFixed(1)}ms`)
  console.log(`500-replicate routeMethods timings: first=${firstMs.toFixed(1)}ms, second=${secondMs.toFixed(1)}ms`)
})
