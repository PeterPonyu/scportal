import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { requiredObservationGroups } from '../../app/autoselect/groups.ts'
import { createRouterRunSession } from '../../app/autoselect/routerRunSession.ts'
import { routeMethods } from '../../app/core/router/index.ts'
import { withSyntheticRelease } from '../router/release.ts'
import { handleRouterWorkerRequest } from '../../app/workers/router.worker.ts'
import type { RouterInput } from '../../app/core/router/types.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
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

describe('router run session', () => {
  it('cancel during catalog load marks the generation stale and skips ROUTE', async () => {
    const session = createRouterRunSession('load-1')
    const posted: string[] = []

    let finishLoad!: () => void
    const load = new Promise<void>((resolve) => {
      finishLoad = resolve
    })

    const run = (async () => {
      await load
      if (!session.shouldPostRoute()) return
      session.markPosted()
      posted.push('ROUTE')
    })()

    const cancel = session.cancel()
    assert.equal(cancel.shouldPostCancel, false)
    finishLoad()
    await run

    assert.equal(session.shouldPostRoute(), false)
    assert.deepEqual(posted, [])
  })

  it('cancel after ROUTE was posted still uses the worker CANCEL path', () => {
    const session = createRouterRunSession('posted-1')
    assert.equal(session.shouldPostRoute(), true)
    session.markPosted()
    const cancel = session.cancel()
    assert.equal(cancel.shouldPostCancel, true)
    assert.equal(session.shouldPostRoute(), false)
  })

  it('useRouterWorker mints the run session before evidence loaders', () => {
    const composable = readFileSync(resolve(root, 'app/composables/useRouterWorker.ts'), 'utf8')
    const sessionIdx = composable.indexOf('createRouterRunSession')
    const loadIdx = composable.indexOf('Promise.all')
    assert.ok(sessionIdx >= 0, 'run() must mint a session')
    assert.ok(loadIdx > sessionIdx, 'session must be minted before Promise.all')
    assert.match(composable, /shouldPostRoute/)
  })
})
