import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { requiredObservationGroups } from '../../app/autoselect/groups.ts'
import { routeMethods } from '../../app/core/router/index.ts'
import { withSyntheticRelease } from '../router/release.ts'
import { handleRouterWorkerRequest } from '../../app/workers/router.worker.ts'
import type { RouterInput } from '../../app/core/router/types.ts'

const dataDirectory = new URL('../../data/router/', import.meta.url)
const json = <T>(name: string): T => JSON.parse(readFileSync(new URL(name, dataDirectory), 'utf8')) as T

function fixture(): RouterInput {
  return withSyntheticRelease({
    profile: json<Record<string, unknown>[]>('task-profiles.json').find(({ id }) => id === 'quick_trajectory')!,
    datasets: json<unknown[]>('datasets.json'),
    methods: json<Array<Record<string, unknown>>>('methods.json').map((method) => ({ ...method })),
    metrics: json<unknown[]>('metrics.json'),
    observations: json<unknown[]>('observations.synthetic.json'),
    evidenceVersion: 'router-evidence-synthetic-v1',
    routerVersion: 'router-core-v1',
  }, 'router-evidence-synthetic-v1') as RouterInput
}

describe('router worker handler', () => {
  it('ROUTE returns a real routeMethods RESULT', () => {
    const input = fixture()
    const expected = routeMethods(input)
    const response = handleRouterWorkerRequest({ type: 'ROUTE', requestId: 'route-1', input }, [])

    assert.equal(response.type, 'RESULT')
    if (response.type !== 'RESULT') return
    assert.deepEqual(response.outcome, expected)
    assert.equal(response.requestId, 'route-1')
  })

  it('cancelled request IDs return CANCELLED and never a late RESULT', () => {
    const input = fixture()
    const cancelled = handleRouterWorkerRequest(
      { type: 'ROUTE', requestId: 'stale-1', input },
      ['stale-1'],
    )
    assert.equal(cancelled.type, 'CANCELLED')
    if (cancelled.type === 'CANCELLED') assert.equal(cancelled.requestId, 'stale-1')

    const explicit = handleRouterWorkerRequest({ type: 'CANCEL', requestId: 'stale-1' }, [])
    assert.equal(explicit.type, 'CANCELLED')
    assert.notEqual(explicit.type, 'RESULT')
  })

  it('synthetic:false with the same digests never becomes an OK real-evidence claim', () => {
    const input = fixture()
    const flipped: RouterInput = {
      ...input,
      release: { ...input.release, synthetic: false },
    }
    assert.equal(flipped.release.configDigest, input.release.configDigest)
    assert.equal(flipped.release.evidenceDigest, input.release.evidenceDigest)
    const response = handleRouterWorkerRequest({ type: 'ROUTE', requestId: 'flip-1', input: flipped }, [])

    assert.ok(response.type === 'RESULT' || response.type === 'ERROR')
    if (response.type === 'RESULT') {
      assert.notEqual(response.outcome.status, 'OK')
      if (response.outcome.status === 'REFUSED') {
        assert.match(response.outcome.evidenceGaps.join('\n'), /digest|invalid Router input/i)
      }
    }
  })

  it('trajectory_reconstruction loads latent_geometry, continuity, and trajectory at zero weight', () => {
    const groups = requiredObservationGroups(
      ['trajectory_reconstruction'],
      {
        latent_geometry: 0,
        continuity: 0,
        trajectory: 0,
        stability: 1,
        biology: 0,
        resources: 0,
      },
    )
    assert.ok(groups.includes('latent_geometry'))
    assert.ok(groups.includes('continuity'))
    assert.ok(groups.includes('trajectory'))
    assert.ok(groups.includes('stability'))
  })
})
