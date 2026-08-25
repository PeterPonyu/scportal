import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { routeMethods } from '../../app/core/router/index.ts'
import { withSyntheticRelease } from './release.ts'

const dataDirectory = new URL('../../data/router/', import.meta.url)
const json = <T>(name: string): T => JSON.parse(readFileSync(new URL(name, dataDirectory), 'utf8')) as T

function fixture() {
  return withSyntheticRelease({
    profile: json<Record<string, unknown>[]>('task-profiles.json').find(({ id }) => id === 'quick_trajectory')!,
    datasets: json<unknown[]>('datasets.json'),
    methods: json<Array<Record<string, unknown>>>('methods.json').map((method) => ({ ...method, executable: true })),
    metrics: json<unknown[]>('metrics.json'),
    observations: json<unknown[]>('observations.synthetic.json'),
    evidenceVersion: 'router-evidence-synthetic-v1',
    routerVersion: 'router-core-v1',
  }, 'router-evidence-synthetic-v1')
}

test('keeps the fixed-seed synthetic recommendation golden at six decimal places', () => {
  const outcome = routeMethods(fixture())

  assert.equal(outcome.status, 'OK')
  if (outcome.status !== 'OK') return
  assert.deepEqual(outcome.recommendations.map((recommendation) => ({
    methodId: recommendation.methodId,
    roles: recommendation.roles,
    flow: Number(recommendation.outrankingFlow.toFixed(6)),
  })), [
    { methodId: 'geometry_vae', roles: ['robust_alternative'], flow: -1 },
    { methodId: 'graph_contrastive', roles: ['best_fit', 'resource_aware'], flow: 1 },
  ])
})

test('keeps a no-prior neural-ODE-only request as a deterministic refusal', () => {
  const input = fixture()
  const outcome = routeMethods({
    ...input,
    profile: { ...input.profile, candidateMethodIds: ['neural_ode'], maxResourceTier: 3, priors: { time: false } },
  })

  assert.equal(outcome.status, 'REFUSED')
  if (outcome.status === 'REFUSED') assert.equal(outcome.code, 'NO_COMPATIBLE_METHOD')
})

test('keeps an exact scientific tie as an explicit insufficient-evidence refusal', () => {
  const base = fixture()
  const method = base.methods.find((candidate) => candidate.id === 'geometry_vae')!
  const methods = ['alpha', 'zeta'].map((id) => ({ ...method, id, aliases: [], executable: true, resourceTier: 1 }))
  const metrics = base.metrics.filter((metric) => ['intrinsic_geometry', 'continuity_preservation', 'trajectory_directionality'].includes(metric.id))
  const observations = base.datasets.flatMap((dataset) => methods.flatMap((candidate) => metrics.map((metric) => ({
    datasetId: dataset.id,
    methodId: candidate.id,
    metricId: metric.id,
    rawValue: 1,
    provenance: { paperId: 'synthetic-contract-fixture', locator: 'table:tie', datasetVersion: '1', methodVersion: candidate.version, runConfigId: 'exact-tie', extractedAt: '2026-08-23T00:00:00Z' },
  }))))
  const input = withSyntheticRelease({
    ...base,
    profile: {
      ...base.profile,
      weights: { latent_geometry: 1, continuity: 1, trajectory: 1, stability: 0, biology: 0, resources: 0 },
      maxResourceTier: 1,
      minEffectiveDatasets: 1,
      minCriticalCoverage: 1,
    },
    methods,
    metrics,
    observations,
  }, 'exact-tie-v1')
  const outcome = routeMethods(input)

  assert.equal(outcome.status, 'REFUSED')
  if (outcome.status === 'REFUSED') {
    assert.equal(outcome.code, 'INSUFFICIENT_EVIDENCE')
    assert.deepEqual(outcome.candidates, ['alpha', 'zeta'])
    assert.match(outcome.evidenceGaps.join('\n'), /exact tie|positive practical separation/i)
  }
})
