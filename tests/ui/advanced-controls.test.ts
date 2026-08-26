import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  createInitialAutoSelectState,
  reset,
  setMode,
  toTaskProfile,
  validateStep,
  type AutoSelectState,
} from '../../app/autoselect/state.ts'
import type { MetricGroup } from '../../app/core/router/types.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

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

function readSource(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

function withValidData(state: AutoSelectState, overrides: Partial<AutoSelectState> = {}): AutoSelectState {
  return {
    ...state,
    modality: 'scrna',
    goals: ['trajectory_reconstruction'],
    ...overrides,
  }
}

function catalogMethodIds(): string[] {
  const methods = JSON.parse(readFileSync(resolve(root, 'data/router/methods.json'), 'utf8')) as Array<{ id: string }>
  return methods.map((method) => method.id)
}

describe('AutoSelect Advanced controls', () => {
  it('Quick and Advanced toTaskProfile are deep-equal when fields match', () => {
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

  it('seed must be an integer in 0..0xffffffff', () => {
    const base = withValidData(createInitialAutoSelectState('advanced'))
    assert.equal(validateStep('environment', { ...base, seed: 0 }), null)
    assert.equal(validateStep('environment', { ...base, seed: 0xffffffff }), null)
    assert.equal(validateStep('environment', { ...base, seed: 20260823 }), null)
    assert.notEqual(validateStep('environment', { ...base, seed: -1 }), null)
    assert.notEqual(validateStep('environment', { ...base, seed: 0x1_0000_0000 }), null)
    assert.notEqual(validateStep('environment', { ...base, seed: 1.5 }), null)
    assert.throws(() => toTaskProfile({ ...base, seed: -1 }))
    assert.throws(() => toTaskProfile({ ...base, seed: 1.5 }))
  })

  it('minCriticalCoverage must be in 0..1', () => {
    const base = withValidData(createInitialAutoSelectState('advanced'))
    assert.equal(validateStep('environment', { ...base, minCriticalCoverage: 0 }), null)
    assert.equal(validateStep('environment', { ...base, minCriticalCoverage: 1 }), null)
    assert.equal(validateStep('environment', { ...base, minCriticalCoverage: 0.6 }), null)
    assert.notEqual(validateStep('environment', { ...base, minCriticalCoverage: -0.01 }), null)
    assert.notEqual(validateStep('environment', { ...base, minCriticalCoverage: 1.01 }), null)
    assert.throws(() => toTaskProfile({ ...base, minCriticalCoverage: 1.5 }))
  })

  it('minEffectiveDatasets must be an integer >= 1', () => {
    const base = withValidData(createInitialAutoSelectState('advanced'))
    assert.equal(validateStep('environment', { ...base, minEffectiveDatasets: 1 }), null)
    assert.equal(validateStep('environment', { ...base, minEffectiveDatasets: 2 }), null)
    assert.notEqual(validateStep('environment', { ...base, minEffectiveDatasets: 0 }), null)
    assert.notEqual(validateStep('environment', { ...base, minEffectiveDatasets: 1.5 }), null)
    assert.throws(() => toTaskProfile({ ...base, minEffectiveDatasets: 0 }))
  })

  it('candidate allowlist cannot include an unknown method id', () => {
    const knownIds = catalogMethodIds()
    assert.ok(knownIds.length > 0)
    const knownId = knownIds[0]!
    const base = withValidData(createInitialAutoSelectState('advanced'))

    const allowed = withValidData(createInitialAutoSelectState('advanced'), {
      candidateMethodIds: [knownId],
    })
    assert.deepEqual(toTaskProfile(allowed).candidateMethodIds, [knownId])
    assert.ok((toTaskProfile(allowed).candidateMethodIds ?? []).every((id) => knownIds.includes(id)))

    const unknown = { ...base, candidateMethodIds: ['unknown_method'] }
    assert.match(validateStep('environment', unknown) ?? '', /unknown method id/)
    assert.throws(() => toTaskProfile(unknown), /unknown method id/)

    const proto = { ...base, candidateMethodIds: ['__proto__'] }
    assert.match(validateStep('environment', proto) ?? '', /unknown method id|unsafe method id/)
    assert.throws(() => toTaskProfile(proto), /unknown method id|unsafe method id/)

    assert.equal(Object.hasOwn(toTaskProfile(base), 'candidateMethodIds'), false)
    assert.equal(Object.hasOwn(toTaskProfile({ ...base, candidateMethodIds: [] }), 'candidateMethodIds'), false)

    const picker = readSource('app/components/autoselect/MethodCandidatePicker.vue')
    assert.match(picker, /data\/router\/methods\.json/)
    assert.match(picker, /not executable/)
    assert.match(picker, /modalit/)
    assert.match(picker, /supportedGoals|goals/)
    assert.match(picker, /resourceTier/)
    assert.match(picker, /executable/)
    assert.match(picker, /knownIds\.has|known\.has|catalogIds|methods\.some/)
    assert.equal(picker.includes('routeMethods'), false)
    for (const unknownId of ['unknown_method', 'Geometry VAE', '__proto__']) {
      assert.equal(knownIds.includes(unknownId), false)
      assert.equal(picker.includes(unknownId), false)
    }
  })

  it('reset restores Quick defaults and keeps the selected mode', () => {
    const edited = withValidData(createInitialAutoSelectState('advanced'), {
      step: 'review',
      scale: '10k_50k',
      topology: 'bifurcating',
      seed: 7,
      minEffectiveDatasets: 4,
      minCriticalCoverage: 0.9,
      candidateMethodIds: catalogMethodIds(),
    })
    const restored = reset(edited)
    assert.equal(restored.mode, 'advanced')
    assert.equal(restored.step, 'data')
    assert.equal(restored.modality, null)
    assert.deepEqual(restored.weights, QUICK_TRAJECTORY_WEIGHTS)
    assert.equal(restored.seed, 20260823)
    assert.equal(restored.minEffectiveDatasets, 2)
    assert.equal(restored.minCriticalCoverage, 0.6)
    assert.equal(Object.hasOwn(restored, 'candidateMethodIds'), false)
    assert.equal(reset(createInitialAutoSelectState('quick')).mode, 'quick')
  })

  it('ModeToggle uses two aria-pressed buttons and is not a new route', () => {
    const source = readSource('app/components/autoselect/ModeToggle.vue')
    assert.match(source, /aria-pressed/)
    assert.match(source, /Quick/)
    assert.match(source, /Advanced/)
    assert.equal((source.match(/<button/g) ?? []).length, 2)
    assert.equal(source.includes('NuxtLink'), false)
    assert.equal(source.includes('router-link'), false)
    assert.equal(source.includes('navigateTo'), false)
    assert.equal(source.includes('routeMethods'), false)
  })

  it('WeightEditor has six labeled range inputs and mentions ARI/NMI as auxiliary text', () => {
    const source = readSource('app/components/autoselect/WeightEditor.vue')
    assert.equal((source.match(/type="range"/g) ?? []).length, 6)
    for (const key of WEIGHT_KEYS) {
      assert.match(source, new RegExp(key))
    }
    assert.match(source, /<label/)
    assert.match(source, /ARI/)
    assert.match(source, /NMI/)
    assert.match(source, /auxiliar/i)
    assert.equal(/id="ari"|name="ari"|id="nmi"|name="nmi"/i.test(source), false)
    assert.equal(source.includes('routeMethods'), false)
  })

  it('does not duplicate weight sliders on PrioritiesStep in Advanced', () => {
    const priorities = readSource('app/components/autoselect/steps/PrioritiesStep.vue')
    const advanced = readSource('app/components/autoselect/AdvancedControls.vue')
    assert.equal(priorities.includes('type="range"'), false, 'Advanced weight editing stays in WeightEditor')
    assert.match(priorities, /edit weights in Advanced controls above/i)
    assert.match(advanced, /WeightEditor/)
  })

  it('ReviewStep always surfaces candidateMethodIds and locks Quick evidence defaults', () => {
    const review = readSource('app/components/autoselect/steps/ReviewStep.vue')
    assert.match(review, /candidateMethodIds/)
    assert.match(review, /all catalog methods/)
    assert.match(review, /mode === 'advanced'|mode === "advanced"/)
    assert.match(review, /locked/i)
  })

  it('switching back to Quick restores default weights and thresholds', () => {
    const edited = withValidData(createInitialAutoSelectState('advanced'), {
      weights: { ...QUICK_TRAJECTORY_WEIGHTS, biology: 0.5 },
      minEffectiveDatasets: 5,
      minCriticalCoverage: 0.8,
      seed: 99,
      maxResourceTier: 1,
      candidateMethodIds: catalogMethodIds().slice(0, 1),
    })
    const restored = setMode(edited, 'quick')
    assert.equal(restored.mode, 'quick')
    assert.deepEqual(restored.weights, QUICK_TRAJECTORY_WEIGHTS)
    assert.equal(restored.minEffectiveDatasets, 2)
    assert.equal(restored.minCriticalCoverage, 0.6)
    assert.equal(restored.seed, 20260823)
    assert.equal(restored.maxResourceTier, 1)
    assert.equal(Object.hasOwn(restored, 'candidateMethodIds'), false)
  })

  it('AutoSelectShell wires ModeToggle without erasing selections or ranking', () => {
    const shell = readSource('app/components/autoselect/AutoSelectShell.vue')
    const advanced = readSource('app/components/autoselect/AdvancedControls.vue')
    assert.match(shell, /ModeToggle/)
    assert.match(shell, /AdvancedControls/)
    assert.match(shell, /setMode/)
    assert.equal(shell.includes('routeMethods'), false)
    assert.equal(advanced.includes('routeMethods'), false)
    assert.match(advanced, /WeightEditor/)
    assert.match(advanced, /MethodCandidatePicker/)
  })
})
