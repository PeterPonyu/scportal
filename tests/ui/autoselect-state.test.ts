import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

import {
  WIZARD_STEPS,
  advance,
  createInitialAutoSelectState,
  reset,
  retreat,
  toTaskProfile,
  validateStep,
  type AutoSelectState,
} from '../../app/autoselect/state.ts'
import type { MetricGroup, TaskGoal } from '../../app/core/router/types.ts'

const WEIGHT_KEYS: MetricGroup[] = [
  'latent_geometry',
  'continuity',
  'trajectory',
  'stability',
  'biology',
  'resources',
]

const QUICK_TRAJECTORY_WEIGHTS: Record<MetricGroup, number> = {
  latent_geometry: 0.2,
  continuity: 0.25,
  trajectory: 0.3,
  stability: 0.1,
  biology: 0.1,
  resources: 0.05,
}

function withValidData(state: AutoSelectState, overrides: Partial<AutoSelectState> = {}): AutoSelectState {
  return {
    ...state,
    modality: 'scrna',
    goals: ['trajectory_reconstruction'],
    ...overrides,
  }
}

describe('AutoSelect wizard state', () => {
  it('walks data → goals → topology → priors → priorities → environment → review', () => {
    assert.deepEqual(WIZARD_STEPS, ['data', 'goals', 'topology', 'priors', 'priorities', 'environment', 'review'])

    let state = createInitialAutoSelectState('quick')
    assert.equal(state.step, 'data')
    assert.equal(state.scale, 'unknown')
    assert.deepEqual(state.goals, [])
    assert.equal(state.topology, 'unknown')
    assert.deepEqual(state.priors, {
      time: 'unknown',
      root_state: 'unknown',
      terminal_states: 'unknown',
      labels: 'unknown',
      perturbation: 'unknown',
    })
    assert.equal(state.perturbation, 'unknown')
    assert.deepEqual(state.weights, QUICK_TRAJECTORY_WEIGHTS)
    assert.equal(state.maxResourceTier, 2)
    assert.equal(state.minEffectiveDatasets, 2)
    assert.equal(state.minCriticalCoverage, 0.6)
    assert.equal(state.seed, 20260823)

    assert.equal(advance(state).step, 'data')
    state = { ...state, modality: 'scrna' }
    state = advance(state)
    assert.equal(state.step, 'goals')

    state = { ...state, goals: ['trajectory_reconstruction'] }
    state = advance(state)
    assert.equal(state.step, 'topology')
    state = advance(state)
    assert.equal(state.step, 'priors')
    state = advance(state)
    assert.equal(state.step, 'priorities')
    state = advance(state)
    assert.equal(state.step, 'environment')
    state = advance(state)
    assert.equal(state.step, 'review')
    assert.equal(advance(state).step, 'review')

    state = retreat(state)
    assert.equal(state.step, 'environment')
    state = retreat(state)
    assert.equal(state.step, 'priorities')
    state = retreat(state)
    assert.equal(state.step, 'priors')
    state = retreat(state)
    assert.equal(state.step, 'topology')
    state = retreat(state)
    assert.equal(state.step, 'goals')
    state = retreat(state)
    assert.equal(state.step, 'data')
    assert.equal(retreat(state).step, 'data')
  })

  it('accepts at most two goals', () => {
    const one: TaskGoal[] = ['trajectory_reconstruction']
    const two: TaskGoal[] = ['trajectory_reconstruction', 'fate_decision']
    const three: TaskGoal[] = ['trajectory_reconstruction', 'fate_decision', 'latent_representation']
    const base = createInitialAutoSelectState('quick')

    assert.equal(validateStep('goals', { ...base, goals: one }), null)
    assert.equal(validateStep('goals', { ...base, goals: two }), null)
    assert.notEqual(validateStep('goals', { ...base, goals: three }), null)
    assert.equal(advance({ ...base, step: 'goals', modality: 'scrna', goals: three }).step, 'goals')
    assert.equal(advance({ ...base, step: 'goals', modality: 'scrna', goals: two }).step, 'topology')
  })

  it('accepts unknown topology, prior, and scale', () => {
    const state = withValidData(createInitialAutoSelectState('quick'), {
      scale: 'unknown',
      topology: 'unknown',
      priors: {
        time: 'unknown',
        root_state: 'unknown',
        terminal_states: 'unknown',
        labels: 'unknown',
        perturbation: 'unknown',
      },
      perturbation: 'unknown',
    })

    assert.equal(validateStep('data', state), null)
    assert.equal(validateStep('topology', state), null)
    assert.equal(validateStep('priors', state), null)
    const profile = toTaskProfile(state)
    assert.equal(profile.scale, 'unknown')
    assert.equal(profile.topology, 'unknown')
    assert.equal(profile.priors.time, 'unknown')
    assert.equal(profile.perturbation, 'unknown')
  })

  it('rejects a missing modality on data', () => {
    const state = createInitialAutoSelectState('quick')
    assert.equal(state.modality, null)
    assert.notEqual(validateStep('data', state), null)
    assert.equal(advance(state).step, 'data')
    assert.equal(validateStep('data', { ...state, modality: 'scrna' }), null)
  })

  it('rejects negative weights and all-zero weights', () => {
    const state = withValidData(createInitialAutoSelectState('quick'))
    const negative = { ...state, weights: { ...state.weights, resources: -0.05 } }
    const zeros = {
      ...state,
      weights: {
        latent_geometry: 0,
        continuity: 0,
        trajectory: 0,
        stability: 0,
        biology: 0,
        resources: 0,
      },
    }

    assert.notEqual(validateStep('priorities', negative), null)
    assert.notEqual(validateStep('priorities', zeros), null)
    assert.equal(advance({ ...negative, step: 'priorities' }).step, 'priorities')
    assert.equal(advance({ ...zeros, step: 'priorities' }).step, 'priorities')
    assert.throws(() => toTaskProfile(negative))
    assert.throws(() => toTaskProfile(zeros))
  })

  it('reset preserves mode', () => {
    const started = createInitialAutoSelectState('advanced')
    const edited = withValidData(started, {
      step: 'review',
      scale: '10k_50k',
      topology: 'bifurcating',
      seed: 7,
    })
    const restored = reset(edited)
    assert.equal(restored.mode, 'advanced')
    assert.equal(restored.step, 'data')
    assert.equal(restored.modality, null)
    assert.equal(restored.scale, 'unknown')
    assert.deepEqual(restored.goals, [])
    assert.deepEqual(restored.weights, QUICK_TRAJECTORY_WEIGHTS)
    assert.equal(restored.seed, 20260823)
    assert.notEqual(reset(createInitialAutoSelectState('quick')).mode, 'advanced')
  })

  it('Quick and Advanced produce deep-equal profiles when values match', () => {
    const values: Partial<AutoSelectState> = {
      modality: 'scrna',
      scale: '10k_50k',
      goals: ['trajectory_reconstruction', 'fate_decision'],
      topology: 'bifurcating',
      priors: { time: true, root_state: 'unknown', terminal_states: 'unknown', labels: 'unknown', perturbation: false },
      perturbation: false,
      weights: { ...QUICK_TRAJECTORY_WEIGHTS },
      maxResourceTier: 2,
      minEffectiveDatasets: 2,
      minCriticalCoverage: 0.6,
      seed: 20260823,
    }
    const quick = { ...createInitialAutoSelectState('quick'), ...values }
    const advanced = { ...createInitialAutoSelectState('advanced'), ...values }
    assert.equal(quick.mode, 'quick')
    assert.equal(advanced.mode, 'advanced')
    assert.deepEqual(toTaskProfile(quick), toTaskProfile(advanced))
  })

  it('toTaskProfile keeps all six weight keys, does not invent values, and defaults seed 20260823', () => {
    const state = withValidData(createInitialAutoSelectState('quick'), {
      weights: {
        latent_geometry: 0.2,
        continuity: 0.25,
        trajectory: 0.3,
        stability: 0.1,
        biology: 0.1,
        resources: 0,
      },
    })
    const profile = toTaskProfile(state)
    assert.equal(profile.id, 'autoselect-session')
    assert.equal(profile.seed, 20260823)
    assert.deepEqual(Object.keys(profile.weights), WEIGHT_KEYS)
    assert.equal(profile.weights.resources, 0)
    assert.equal(profile.weights.latent_geometry, 0.2)
    assert.equal(Object.hasOwn(profile, 'candidateMethodIds'), false)
    assert.equal(profile.priors.time, 'unknown')
    assert.equal(profile.scale, 'unknown')
    assert.equal(profile.topology, 'unknown')
    assert.equal(profile.perturbation, 'unknown')
    assert.notEqual(profile.scale, '10k_50k')
    assert.notEqual(profile.topology, 'linear')
  })

  it('keeps unknown scale as unknown in the profile', () => {
    const profile = toTaskProfile(withValidData(createInitialAutoSelectState('quick'), { scale: 'unknown' }))
    assert.equal(profile.scale, 'unknown')
  })

  it('keeps wizard state and composable off the Router kernel', async () => {
    const stateSource = await readFile(new URL('../../app/autoselect/state.ts', import.meta.url), 'utf8')
    const composableSource = await readFile(new URL('../../app/composables/useAutoSelect.ts', import.meta.url), 'utf8')
    assert.equal(stateSource.includes('routeMethods'), false)
    assert.equal(composableSource.includes('routeMethods'), false)
    assert.match(composableSource, /useState(?:<[^>]+>)?\('autoselect-state'/)
  })
})
