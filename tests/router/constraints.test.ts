import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { filterCompatibleMethods } from '../../app/core/router/constraints.ts'
import type { MethodCapability, TaskProfile } from '../../app/core/router/types.ts'

const profile: TaskProfile = {
  id: 'trajectory-profile',
  modality: 'scrna',
  scale: '10k_50k',
  goals: ['latent_representation', 'trajectory_reconstruction', 'fate_decision'],
  topology: 'bifurcating',
  priors: { time: true, root_state: true },
  perturbation: false,
  weights: { latent_geometry: 1, continuity: 1, trajectory: 1, stability: 1, biology: 1, resources: 1 },
  maxResourceTier: 2,
  minEffectiveDatasets: 1,
  minCriticalCoverage: 0.5,
  seed: 1,
}

const compatibleMethod: MethodCapability = {
  id: 'compatible',
  aliases: [],
  version: '1.0.0',
  modalities: ['scrna'],
  maxScale: '50k_200k',
  outputs: ['latent', 'pseudotime', 'branch', 'metadata'],
  requiredPriors: ['time', 'root_state'],
  supportedGoals: ['latent_representation', 'trajectory_reconstruction', 'fate_decision'],
  resourceTier: 2,
  installCommand: 'run-compatible',
  license: 'MIT',
  sourceUrl: 'https://example.test/source',
  docsUrl: 'https://example.test/docs',
  paperUrl: 'https://example.test/paper',
  executable: true,
}

const registryMethods = JSON.parse(
  readFileSync(new URL('../../data/router/methods.json', import.meta.url), 'utf8'),
) as MethodCapability[]

test('keeps only a fully compatible executable method', () => {
  assert.deepEqual(filterCompatibleMethods(profile, [compatibleMethod]), {
    compatible: [compatibleMethod],
    excluded: [],
  })
})

test('accumulates deterministic unique machine-readable hard-constraint reasons', () => {
  const incompatible: MethodCapability = {
    ...compatibleMethod,
    id: 'all-failures',
    modalities: ['scatac'],
    maxScale: 'lt_10k',
    outputs: ['metadata'],
    requiredPriors: ['time', 'root_state'],
    supportedGoals: ['latent_representation'],
    resourceTier: 3,
    executable: false,
  }
  const result = filterCompatibleMethods({
    ...profile,
    priors: { time: false, root_state: 'unknown' },
    candidateMethodIds: ['compatible'],
  }, [incompatible])

  assert.deepEqual(result, {
    compatible: [],
    excluded: [{
      methodId: 'all-failures',
      reasons: [
        'UNSUPPORTED_MODALITY',
        'SCALE_LIMIT',
        'RESOURCE_LIMIT',
        'MISSING_REQUIRED_PRIOR',
        'MISSING_OUTPUT',
        'UNSUPPORTED_GOAL',
        'NOT_EXECUTABLE',
        'NOT_SELECTED_CANDIDATE',
      ],
    }],
  })
})

test('fails closed when the profile scale is unknown for a method capacity limit', () => {
  const result = filterCompatibleMethods({ ...profile, scale: 'unknown' }, [compatibleMethod])

  assert.deepEqual(result.excluded, [{ methodId: 'compatible', reasons: ['SCALE_LIMIT'] }])
})

test('requires own true values for every required prior', () => {
  const method = { ...compatibleMethod, requiredPriors: ['time'] }
  const inheritedTime = Object.create({ time: true }) as TaskProfile['priors']

  for (const priors of [{}, { time: false }, { time: 'unknown' as const }, inheritedTime]) {
    const result = filterCompatibleMethods({ ...profile, priors }, [method])
    assert.deepEqual(result.excluded, [{ methodId: 'compatible', reasons: ['MISSING_REQUIRED_PRIOR'] }])
  }
})

test('requires an acceptable output capability for every requested goal', () => {
  const metadataOnly: MethodCapability = {
    ...compatibleMethod,
    outputs: ['metadata'],
    supportedGoals: ['trajectory_reconstruction'],
  }
  const trajectoryProfile: TaskProfile = { ...profile, goals: ['trajectory_reconstruction'] }

  assert.deepEqual(filterCompatibleMethods(trajectoryProfile, [metadataOnly]).excluded, [{
    methodId: 'compatible',
    reasons: ['MISSING_OUTPUT'],
  }])
})

test('accepts registry methods through their documented any-of output capabilities', () => {
  const cases: Array<{ methodId: string; goals: TaskProfile['goals']; maxResourceTier: TaskProfile['maxResourceTier'] }> = [
    {
      methodId: 'geometry_vae',
      goals: ['latent_representation', 'trajectory_reconstruction'],
      maxResourceTier: 1,
    },
    {
      methodId: 'graph_contrastive',
      goals: ['latent_representation', 'trajectory_reconstruction', 'lineage_contribution'],
      maxResourceTier: 2,
    },
    {
      methodId: 'neural_ode',
      goals: ['trajectory_reconstruction', 'fate_decision', 'lineage_contribution'],
      maxResourceTier: 3,
    },
  ]

  for (const { methodId, goals, maxResourceTier } of cases) {
    const registryMethod = registryMethods.find((method) => method.id === methodId)
    assert.ok(registryMethod, `missing registry method: ${methodId}`)
    const executableMethod = { ...registryMethod, executable: true }
    const result = filterCompatibleMethods({ ...profile, goals, maxResourceTier }, [executableMethod])

    assert.deepEqual(result, { compatible: [executableMethod], excluded: [] })
  }
})

test('treats a canonical candidate list as membership-only even with duplicate IDs', () => {
  const result = filterCompatibleMethods({
    ...profile,
    candidateMethodIds: ['compatible', 'compatible'],
  }, [compatibleMethod])

  assert.deepEqual(result.compatible, [compatibleMethod])
})
