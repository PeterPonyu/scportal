import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { routeMethods } from '../../app/core/router/index.ts'

const dataDirectory = new URL('../../data/router/', import.meta.url)

function json<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(name, dataDirectory), 'utf8')) as T
}

function executableRegistryInput() {
  return {
    profile: json<Record<string, unknown>[]>('task-profiles.json').find(({ id }) => id === 'quick_trajectory')!,
    datasets: json<unknown[]>('datasets.json'),
    methods: json<Array<Record<string, unknown>>>('methods.json').map((method) => ({ ...method, executable: true })),
    metrics: json<unknown[]>('metrics.json'),
    observations: json<unknown[]>('observations.synthetic.json'),
    evidenceVersion: 'router-evidence-synthetic-v1',
    routerVersion: 'router-core-v1',
  }
}

function unstableFourMethodInput() {
  const base = executableRegistryInput()
  const methodIds = ['alpha', 'beta', 'gamma', 'delta']
  const metricIds = base.metrics.filter((metric) => !metric.auxiliary).map((metric) => metric.id)
  const datasets = [...base.datasets, { ...base.datasets[0], id: 'synthetic_fourth', aliases: [] }]
  const rows = [
    [4, 3, 2, 1],
    [1, 4, 3, 2],
    [2, 1, 4, 3],
    [3, 2, 1, 4],
  ]
  return {
    ...base,
    profile: { ...base.profile, maxResourceTier: 1 },
    datasets: datasets.map((dataset) => ({
      ...dataset,
      studyGroup: 'one-stratum',
      scale: '10k_50k',
      topology: 'bifurcating',
      priors: { time: true },
      perturbation: false,
    })),
    methods: methodIds.map((id) => ({ ...base.methods[0], id, aliases: [], resourceTier: 1 })),
    observations: datasets.flatMap((dataset, datasetIndex) => methodIds.flatMap((methodId, methodIndex) => metricIds.map((metricId) => ({
      datasetId: dataset.id,
      methodId,
      metricId,
      rawValue: rows[datasetIndex][methodIndex],
      provenance: { paperId: 'synthetic-contract-fixture', locator: 'table:S1', datasetVersion: '1', methodVersion: '1.0.0', runConfigId: 'unstable-fixture', extractedAt: '2026-08-23' },
    })))),
  }
}

test('routes canonical multi-method evidence into deterministic Pareto-qualified traceable roles', () => {
  const input = executableRegistryInput()
  const first = routeMethods(input)
  const second = routeMethods(input)

  assert.deepEqual(first, second)
  assert.equal(first.status, 'OK')
  if (first.status !== 'OK') return
  assert.ok(first.recommendations.length >= 1)
  assert.ok(first.recommendations.every((recommendation) => recommendation.paretoLayer === 0))
  assert.deepEqual(
    new Set(first.recommendations.flatMap((recommendation) => recommendation.roles)),
    new Set(['best_fit', 'robust_alternative', 'resource_aware']),
  )
  for (const recommendation of first.recommendations) {
    assert.ok(Number.isFinite(recommendation.outrankingFlow))
    assert.ok(Number.isFinite(recommendation.conservativeUtility))
    assert.ok(recommendation.positiveEvidence.length > 0)
    assert.ok(recommendation.positiveEvidenceDetails.every((detail) => detail.metricIds.length > 0 && detail.datasetIds.length > 0))
    assert.ok(recommendation.positiveEvidenceDetails.every((detail) => detail.synthetic === true))
    assert.ok(recommendation.evidenceLinks.every((link) => link.paperId === 'synthetic-contract-fixture'))
  }
})

test('refuses every public failure state without manufacturing rankings', () => {
  const input = executableRegistryInput()
  const cases = [
    ['no compatible', { ...input, methods: [], observations: [] }, 'NO_COMPATIBLE_METHOD'],
    ['insufficient effective datasets', { ...input, profile: { ...input.profile, minEffectiveDatasets: 99 } }, 'INSUFFICIENT_EVIDENCE'],
    ['critical coverage', { ...input, observations: input.observations.filter((observation) => !(observation.methodId === 'geometry_vae' && observation.metricId === 'trajectory_directionality')) }, 'CRITICAL_COVERAGE_GAP'],
    ['unstable top three', { ...unstableFourMethodInput(), options: { minimumTopThreeRetention: 0.9 } }, 'UNSTABLE_TOP_THREE'],
    ['conflicting requirements', { ...input, profile: { ...input.profile, goals: ['fate_decision'], maxResourceTier: 1, priors: { time: false } } }, 'CONFLICTING_REQUIREMENTS'],
  ] as const

  for (const [name, candidate, code] of cases) {
    const { options, ...routerInput } = candidate
    const outcome = routeMethods(routerInput, options)
    assert.equal(outcome.status, 'REFUSED', name)
    if (outcome.status !== 'REFUSED') continue
    assert.equal(outcome.code, code)
    assert.deepEqual(Object.keys(outcome).filter((key) => /rank|flow|utility/i.test(key)), [])
    assert.ok(outcome.evidenceGaps.length > 0)
  }
})

test('fails closed when an input identity is not canonical registry data', () => {
  const input = executableRegistryInput()
  const outcome = routeMethods({
    ...input,
    observations: input.observations.map((observation) => (
      observation.datasetId === 'synthetic_branch_time'
        ? { ...observation, datasetId: 'synthetic-branch-time' }
        : observation
    )),
  })

  assert.equal(outcome.status, 'REFUSED')
  if (outcome.status === 'REFUSED') {
    assert.equal(outcome.code, 'INSUFFICIENT_EVIDENCE')
    assert.match(outcome.evidenceGaps.join('\n'), /canonical|invalid/i)
  }
})
