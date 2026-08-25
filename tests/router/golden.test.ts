import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { routeMethods } from '../../app/core/router/index.ts'

const dataDirectory = new URL('../../data/router/', import.meta.url)
const json = <T>(name: string): T => JSON.parse(readFileSync(new URL(name, dataDirectory), 'utf8')) as T

function fixture() {
  return {
    profile: json<Record<string, unknown>[]>('task-profiles.json').find(({ id }) => id === 'quick_trajectory')!,
    datasets: json<unknown[]>('datasets.json'),
    methods: json<Array<Record<string, unknown>>>('methods.json').map((method) => ({ ...method, executable: true })),
    metrics: json<unknown[]>('metrics.json'),
    observations: json<unknown[]>('observations.synthetic.json'),
    evidenceVersion: 'router-evidence-synthetic-v1',
    routerVersion: 'router-core-v1',
    releaseSynthetic: true,
  }
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
