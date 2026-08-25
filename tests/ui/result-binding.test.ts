import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  bindRouterRun,
  boundRunFromWorkerState,
  currentBoundOutcome,
  currentBoundProfile,
  isBoundRunStale,
} from '../../app/autoselect/resultBinding.ts'
import {
  createInitialAutoSelectState,
  toTaskProfile,
  type AutoSelectState,
} from '../../app/autoselect/state.ts'
import type { RouterOutcome } from '../../app/core/router/types.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function withValidData(state: AutoSelectState, overrides: Partial<AutoSelectState> = {}): AutoSelectState {
  return {
    ...state,
    modality: 'scrna',
    goals: ['trajectory_reconstruction'],
    ...overrides,
  }
}

const refused: RouterOutcome = {
  status: 'REFUSED',
  code: 'NO_COMPATIBLE_METHOD',
  candidates: [],
  evidenceGaps: ['no executable method'],
  seed: 20260823,
  evidenceVersion: 'router-evidence-synthetic-v1',
  routerVersion: 'router-core-v1',
}

describe('AutoSelect result binding', () => {
  it('stops presenting a completed outcome after a weight mutation', () => {
    const wizard = withValidData(createInitialAutoSelectState('quick'))
    const profile = toTaskProfile(wizard)
    const snapshot = bindRouterRun(profile, refused)
    const workerState = boundRunFromWorkerState({
      outcome: refused,
      submittedProfile: profile,
    })

    assert.equal(currentBoundOutcome(snapshot, profile), refused)
    assert.equal(currentBoundProfile(snapshot, profile), profile)
    assert.equal(isBoundRunStale(snapshot, profile), false)
    assert.deepEqual(workerState, snapshot)

    const mutated = toTaskProfile({
      ...wizard,
      weights: { ...wizard.weights, resources: 0 },
    })
    assert.notEqual(mutated.weights.resources, profile.weights.resources)
    assert.equal(currentBoundOutcome(snapshot, mutated), null)
    assert.equal(currentBoundProfile(snapshot, mutated), null)
    assert.equal(isBoundRunStale(snapshot, mutated), true)
    assert.equal(currentBoundOutcome(workerState, mutated), null)
  })

  it('shell and downloads bind visible results to the submitted profile', () => {
    const shell = readFileSync(resolve(root, 'app/components/autoselect/AutoSelectShell.vue'), 'utf8')
    const downloads = readFileSync(resolve(root, 'app/components/autoselect/ConfigDownloads.vue'), 'utf8')
    assert.match(shell, /currentBoundOutcome/)
    assert.match(shell, /submittedProfile/)
    assert.match(shell, /visibleOutcome/)
    assert.equal(/v-if="routerState\.outcome"/.test(shell), false)
    assert.match(downloads, /currentBoundProfile/)
    assert.match(downloads, /submittedProfile/)
    assert.equal(/toTaskProfile\(wizard/.test(downloads), false)
  })
})
