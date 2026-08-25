import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { canonicalizeId } from '../../app/core/router/ids.ts'
import {
  createRouterDataValidator,
  validateRouterDataDirectory,
  validateTaskProfile,
} from '../../scripts/validate_router_data.mjs'

const validDataset = {
  id: 'pbmc_reference',
  aliases: ['GSE12345'],
  studyGroup: 'reference-study',
  modality: 'scrna',
  scale: '10k_50k',
  topology: 'mixed',
  priors: { time: true },
  perturbation: false,
}

const validMetric = {
  id: 'intrinsic_geometry',
  aliases: ['geometry'],
  group: 'latent_geometry',
  direction: 'higher_is_better',
  auxiliary: false,
  description: 'Preserves intrinsic geometry.',
}

const validObservation = {
  datasetId: 'pbmc_reference',
  methodId: 'geometry_vae',
  metricId: 'intrinsic_geometry',
  rawValue: 0.91,
  provenance: {
    paperId: 'paper-1',
    locator: 'table:1',
    datasetVersion: '1',
    methodVersion: '1.0.0',
    runConfigId: 'default',
    extractedAt: '2026-08-23',
  },
}

const validProfile = {
  id: 'quick_trajectory',
  modality: 'scrna',
  scale: '10k_50k',
  goals: ['trajectory_reconstruction'],
  topology: 'bifurcating',
  priors: { time: true },
  perturbation: false,
  weights: {
    latent_geometry: 0.2,
    continuity: 0.2,
    trajectory: 0.2,
    stability: 0.15,
    biology: 0.15,
    resources: 0.1,
  },
  maxResourceTier: 2,
  minEffectiveDatasets: 2,
  minCriticalCoverage: 0.6,
  seed: 20260823,
}

async function withTemporaryRegistry(
  files: Record<string, unknown>,
  assertion: (directory: string) => Promise<void>,
) {
  const directory = await mkdtemp(join(tmpdir(), 'scportal-router-contracts-'))
  try {
    await Promise.all(Object.entries(files).map(([name, value]) => (
      writeFile(join(directory, name), JSON.stringify(value), 'utf8')
    )))
    await assertion(directory)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

const emptyCompleteRegistry = {
  'datasets.json': [],
  'methods.json': [],
  'metrics.json': [],
  'task-profiles.json': [],
  'config-templates.json': [],
  'release.json': { id: 'router-evidence-synthetic-v1' },
  'observations.synthetic.json': [],
}

test('rejects duplicate canonical IDs and aliases in the same entity kind', async () => {
  const validator = await createRouterDataValidator()

  assert.throws(
    () => validator.assertUniqueEntityIds('dataset', [validDataset, { ...validDataset, aliases: ['other-alias'] }]),
    /duplicate dataset id or alias: pbmc_reference/i,
  )
  assert.throws(
    () => validator.assertUniqueEntityIds('dataset', [validDataset, { ...validDataset, id: 'other_dataset', aliases: ['gse12345'] }]),
    /duplicate dataset id or alias: gse12345/i,
  )
})

test('resolves one GEO alias to its scoped canonical dataset ID', () => {
  const aliases = new Map([['dataset:gse12345', 'pbmc_reference']])

  assert.equal(canonicalizeId('dataset', '  GSE12345 ', aliases), 'pbmc_reference')
})

test('rejects trimmed-empty canonical lookups', () => {
  const aliases = new Map([['dataset:', 'must-not-resolve']])

  assert.throws(
    () => canonicalizeId('dataset', '   ', aliases),
    new Error('unknown dataset id or alias:    '),
  )
})

test('preserves auxiliary metric semantics and rejects schema extras', async () => {
  const validator = await createRouterDataValidator()
  const auxiliaryMetric = { ...validMetric, id: 'ari', aliases: ['adjusted_rand_index'], auxiliary: true }

  assert.equal(validator.parseMetric(auxiliaryMetric).auxiliary, true)
  assert.throws(
    () => validator.parseMetric({ ...auxiliaryMetric, unsupported: true }),
    /must NOT have additional properties/i,
  )
})

test('rejects observations without complete provenance', async () => {
  const validator = await createRouterDataValidator()
  const { locator: _locator, ...incompleteProvenance } = validObservation.provenance

  assert.throws(
    () => validator.parseObservation({ ...validObservation, provenance: incompleteProvenance }),
    /locator/i,
  )
})

test('rejects invalid TaskProfile weight profiles without inherited-property trust', async () => {
  const inheritedWeights = Object.create(validProfile.weights) as Record<string, number>
  const profiles = [
    { ...validProfile, weights: { ...validProfile.weights, continuity: Number.NaN } },
    { ...validProfile, weights: { ...validProfile.weights, continuity: Number.POSITIVE_INFINITY } },
    { ...validProfile, weights: { ...validProfile.weights, continuity: -0.1 } },
    { ...validProfile, weights: Object.fromEntries(Object.keys(validProfile.weights).map((key) => [key, 0])) },
    { ...validProfile, weights: inheritedWeights },
  ]

  for (const profile of profiles) {
    await assert.rejects(() => validateTaskProfile(profile), /weights/i)
  }
})

test('requires a nonblank TaskProfile id', async () => {
  const validator = await createRouterDataValidator()

  assert.equal(validator.parseTaskProfile(validProfile).id, 'quick_trajectory')
  assert.throws(() => validator.parseTaskProfile({ ...validProfile, id: '   ' }), /id/i)
  const { id: _id, ...profileWithoutId } = validProfile
  assert.throws(() => validator.parseTaskProfile(profileWithoutId), /id/i)
})

test('direct TaskProfile parsing rejects an all-zero weight profile', async () => {
  const validator = await createRouterDataValidator()
  const zeroWeights = Object.fromEntries(Object.keys(validProfile.weights).map((key) => [key, 0]))

  assert.throws(
    () => validator.parseTaskProfile({ ...validProfile, weights: zeroWeights }),
    /weights must sum to a positive value/i,
  )
})

test('rejects whitespace-only entity IDs and aliases at schema and registry boundaries', async () => {
  const validator = await createRouterDataValidator()

  assert.throws(() => validator.parseDataset({ ...validDataset, id: '  ' }), /id/i)
  assert.throws(() => validator.parseDataset({ ...validDataset, aliases: ['\t'] }), /aliases/i)
  assert.throws(
    () => validator.assertUniqueEntityIds('dataset', [{ ...validDataset, aliases: ['  '] }]),
    /blank dataset id or alias/i,
  )
})

test('rejects a partial root registry once any registry JSON exists', async () => {
  await withTemporaryRegistry({ 'datasets.json': [] }, async (directory) => {
    await assert.rejects(
      () => validateRouterDataDirectory(directory),
      /missing required router data files:.*methods\.json.*observations\.\*\.json/i,
    )
  })
})

test('rejects unexpected root JSON files', async () => {
  await withTemporaryRegistry({ ...emptyCompleteRegistry, 'ignored.json': {} }, async (directory) => {
    await assert.rejects(
      () => validateRouterDataDirectory(directory),
      /unexpected router data file: ignored\.json/i,
    )
  })
})

test('shape-checks config templates and release identity without assigning Task 7 semantics', async () => {
  await withTemporaryRegistry({ ...emptyCompleteRegistry, 'config-templates.json': {} }, async (directory) => {
    await assert.rejects(() => validateRouterDataDirectory(directory), /config-templates\.json must contain a JSON array/i)
  })
  await withTemporaryRegistry({ ...emptyCompleteRegistry, 'release.json': {} }, async (directory) => {
    await assert.rejects(() => validateRouterDataDirectory(directory), /release\.json.*id/i)
  })
})

test('reports unknown IDs deterministically without inherited aliases', () => {
  const aliases = new Map<string, string>()

  assert.throws(
    () => canonicalizeId('method', 'Missing Method', aliases),
    new Error('unknown method id or alias: Missing Method'),
  )
})
