import assert from 'node:assert/strict'
import test from 'node:test'

import { percentileNormalize } from '../../app/core/router/normalize.ts'
import type { BenchmarkObservation, MetricDefinition } from '../../app/core/router/types.ts'

const provenance = {
  paperId: 'fixture-paper',
  locator: 'table:1',
  datasetVersion: '1',
  methodVersion: '1.0.0',
  runConfigId: 'default',
  extractedAt: '2026-08-23',
}

function observation(datasetId: string, methodId: string, metricId: string, rawValue: number): BenchmarkObservation {
  return { datasetId, methodId, metricId, rawValue, provenance }
}

const metrics = new Map<string, MetricDefinition>([
  ['higher', { id: 'higher', aliases: [], group: 'trajectory', direction: 'higher_is_better', auxiliary: false, description: 'Higher is better.' }],
  ['lower', { id: 'lower', aliases: [], group: 'resources', direction: 'lower_is_better', auxiliary: false, description: 'Lower is better.' }],
])

test('normalizes higher-is-better values to within-panel percentiles', () => {
  const normalized = percentileNormalize([
    observation('dataset', 'method_c', 'higher', 30),
    observation('dataset', 'method_a', 'higher', 10),
    observation('dataset', 'method_b', 'higher', 20),
  ], metrics)

  assert.deepEqual(
    normalized.map(({ methodId, percentile }) => ({ methodId, percentile })),
    [
      { methodId: 'method_a', percentile: 0 },
      { methodId: 'method_b', percentile: 0.5 },
      { methodId: 'method_c', percentile: 1 },
    ],
  )
})

test('inverts lower-is-better values without mixing panels', () => {
  const normalized = percentileNormalize([
    observation('dataset_b', 'method_a', 'lower', 10),
    observation('dataset_a', 'method_b', 'lower', 20),
    observation('dataset_a', 'method_a', 'lower', 10),
    observation('dataset_a', 'method_c', 'lower', 30),
  ], metrics)

  assert.deepEqual(
    normalized.map(({ datasetId, methodId, percentile }) => ({ datasetId, methodId, percentile })),
    [
      { datasetId: 'dataset_a', methodId: 'method_a', percentile: 1 },
      { datasetId: 'dataset_a', methodId: 'method_b', percentile: 0.5 },
      { datasetId: 'dataset_a', methodId: 'method_c', percentile: 0 },
      { datasetId: 'dataset_b', methodId: 'method_a', percentile: 0.5 },
    ],
  )
})

test('assigns tied values the average rank and preserves only observed methods', () => {
  const normalized = percentileNormalize([
    observation('dataset', 'method_c', 'higher', 7),
    observation('dataset', 'method_a', 'higher', 7),
  ], metrics)

  assert.deepEqual(normalized.map(({ methodId, percentile }) => ({ methodId, percentile })), [
    { methodId: 'method_a', percentile: 0.5 },
    { methodId: 'method_c', percentile: 0.5 },
  ])
  assert.equal(normalized.some((entry) => entry.methodId === 'method_missing'), false)
})
