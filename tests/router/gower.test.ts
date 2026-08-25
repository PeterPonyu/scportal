import assert from 'node:assert/strict'
import test from 'node:test'

import { gowerSimilarity } from '../../app/core/router/gower.ts'
import type { DatasetContext, TaskProfile } from '../../app/core/router/types.ts'

const weights = { modality: 1, scale: 1, topology: 1, priors: 1, perturbation: 1 }

const profile: TaskProfile = {
  id: 'profile',
  modality: 'scrna',
  scale: '10k_50k',
  goals: ['trajectory_reconstruction'],
  topology: 'bifurcating',
  priors: { time: true, root_state: false, terminal_states: 'unknown' },
  perturbation: false,
  weights: { latent_geometry: 1, continuity: 1, trajectory: 1, stability: 1, biology: 1, resources: 1 },
  maxResourceTier: 2,
  minEffectiveDatasets: 1,
  minCriticalCoverage: 0.5,
  seed: 1,
}

const dataset: DatasetContext = {
  id: 'dataset',
  aliases: [],
  studyGroup: 'study',
  modality: 'scrna',
  scale: '10k_50k',
  topology: 'bifurcating',
  priors: { time: true, root_state: false },
  perturbation: false,
}

test('returns one for an exact known context match', () => {
  assert.equal(gowerSimilarity(profile, dataset, weights), 1)
})

test('returns zero for wholly incompatible known categorical context', () => {
  const incompatible: DatasetContext = {
    ...dataset,
    modality: 'scatac',
    topology: 'cyclic',
    priors: { time: false, root_state: true },
    perturbation: true,
  }

  assert.equal(gowerSimilarity(profile, incompatible, { ...weights, scale: 0 }), 0)
})

test('excludes unknown fields and unknown priors rather than imputing them', () => {
  const unknownProfile: TaskProfile = {
    ...profile,
    scale: 'unknown',
    topology: 'unknown',
    priors: { time: 'unknown', root_state: 'unknown' },
    perturbation: 'unknown',
  }
  assert.equal(gowerSimilarity(unknownProfile, dataset, weights), 1)
})

test('bounds ordered scale-band similarity and rejects zero usable weight', () => {
  const distantScale = { ...dataset, scale: 'gt_200k' as const }

  assert.ok(Math.abs(gowerSimilarity(profile, distantScale, { modality: 0, scale: 1, topology: 0, priors: 0, perturbation: 0 }) - (1 / 3)) < 1e-15)
  assert.throws(
    () => gowerSimilarity({ ...profile, modality: 'scrna', scale: 'unknown', topology: 'unknown', priors: {}, perturbation: 'unknown' }, dataset, { modality: 0, scale: 1, topology: 1, priors: 1, perturbation: 1 }),
    /zero usable context weight/i,
  )
})

test('rejects negative, non-finite, and inherited feature weights', () => {
  for (const invalidWeights of [
    { ...weights, modality: -1 },
    { ...weights, modality: Number.NaN },
    Object.create(weights) as typeof weights,
  ]) {
    assert.throws(() => gowerSimilarity(profile, dataset, invalidWeights), /weights/i)
  }
})
