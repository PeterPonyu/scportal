import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import test from 'node:test'

import { validateRouterDataDirectory } from '../../scripts/validate_router_data.mjs'

const executeFile = promisify(execFile)
const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const routerDataDirectory = join(repositoryRoot, 'data', 'router')
const primaryGroups = new Set([
  'latent_geometry',
  'continuity',
  'trajectory',
  'stability',
  'biology',
  'resources',
])

async function loadJson<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(join(routerDataDirectory, name), 'utf8')) as T
}

async function withRegistryCopy(assertion: (directory: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'scportal-router-registry-'))
  try {
    await cp(routerDataDirectory, directory, { recursive: true })
    await assertion(directory)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

test('uses exact canonical IDs, complete primary metric groups, and auxiliary ARI', async () => {
  const [datasets, methods, metrics] = await Promise.all([
    loadJson<Array<{ id: string }>>('datasets.json'),
    loadJson<Array<{ id: string, executable: boolean, sourceUrl: string, docsUrl: string, paperUrl: string }>>('methods.json'),
    loadJson<Array<{ id: string, group: string, auxiliary: boolean }>>('metrics.json'),
  ])

  assert.deepEqual(datasets.map((dataset) => dataset.id), ['synthetic_linear_small', 'synthetic_branch_time', 'synthetic_large_sparse'])
  assert.deepEqual(methods.map((method) => method.id), ['geometry_vae', 'graph_contrastive', 'neural_ode'])
  assert.equal(methods.every((method) => !method.executable), true)
  assert.equal(methods.every((method) => [method.sourceUrl, method.docsUrl, method.paperUrl].every((url) => url.startsWith('https://'))), true)
  assert.deepEqual(
    new Set(metrics.filter((metric) => !metric.auxiliary).map((metric) => metric.group)),
    primaryGroups,
  )
  assert.equal(metrics.find((metric) => metric.id === 'ari')?.auxiliary, true)
})

test('contains complete, synthetic-only evidence records with registered versions', async () => {
  const [datasets, methods, observations] = await Promise.all([
    loadJson<Array<{ id: string, studyGroup: string }>>('datasets.json'),
    loadJson<Array<{ id: string, version: string }>>('methods.json'),
    loadJson<Array<{
      datasetId: string
      methodId: string
      metricId: string
      provenance: Record<string, string>
    }>>('observations.synthetic.json'),
  ])
  const methodVersions = new Map(methods.map((method) => [method.id, method.version]))
  const requiredProvenance = ['paperId', 'locator', 'datasetVersion', 'methodVersion', 'runConfigId', 'extractedAt']

  assert.equal(datasets.length, 3)
  assert.equal(methods.length, 3)
  assert.equal(datasets.every((dataset) => dataset.studyGroup.length > 0), true)
  assert.equal(methods.every((method) => method.version.length > 0), true)
  assert.equal(observations.length > 21, true)
  for (const observation of observations) {
    assert.equal(observation.provenance.paperId, 'synthetic-contract-fixture')
    assert.equal(observation.provenance.locator, 'table:S1')
    assert.equal(observation.provenance.datasetVersion, '1')
    assert.equal(observation.provenance.runConfigId, 'fixture-default')
    assert.equal(observation.provenance.extractedAt, '2026-08-23')
    assert.equal(observation.provenance.methodVersion, methodVersions.get(observation.methodId))
    assert.equal(requiredProvenance.every((key) => Boolean(observation.provenance[key])), true)
  }
})

test('provides nondegenerate method evidence for every metric across synthetic datasets', async () => {
  const observations = await loadJson<Array<{ datasetId: string, methodId: string, metricId: string, rawValue: number }>>('observations.synthetic.json')
  const valuesByDatasetAndMetric = new Map<string, number[]>()

  for (const observation of observations) {
    const key = `${observation.datasetId}\u0000${observation.metricId}`
    valuesByDatasetAndMetric.set(key, [...(valuesByDatasetAndMetric.get(key) ?? []), observation.rawValue])
  }

  assert.equal([...valuesByDatasetAndMetric.values()].every((values) => new Set(values).size > 1), true)
})

test('defines complete Quick and Advanced profiles with the required trajectory defaults', async () => {
  const profiles = await loadJson<Array<Record<string, unknown>>>('task-profiles.json')
  const quick = profiles.find((profile) => profile.id === 'quick_trajectory')
  const advanced = profiles.find((profile) => profile.id === 'advanced_trajectory')
  const requiredFields = ['id', 'modality', 'scale', 'goals', 'topology', 'priors', 'perturbation', 'weights', 'maxResourceTier', 'minEffectiveDatasets', 'minCriticalCoverage', 'seed']

  assert.ok(quick)
  assert.ok(advanced)
  assert.equal([quick, advanced].every((profile) => requiredFields.every((field) => field in profile)), true)
  assert.deepEqual(quick.weights, {
    latent_geometry: 0.2,
    continuity: 0.25,
    trajectory: 0.3,
    stability: 0.1,
    biology: 0.1,
    resources: 0.05,
  })
  assert.equal(Object.values(quick.weights as Record<string, number>).reduce((sum, weight) => sum + weight, 0), 1)
  assert.equal(quick.minEffectiveDatasets, 2)
  assert.equal(quick.minCriticalCoverage, 0.6)
  assert.equal(quick.seed, 20260823)
})

test('validates the release through the CLI and its complete cross-file registry', async () => {
  const result = await validateRouterDataDirectory()
  await executeFile('npm', ['run', 'validate:router-data'], { cwd: repositoryRoot })

  assert.deepEqual(result, { status: 'VALID', datasets: 3, methods: 3, metrics: 7, observations: 63, taskProfiles: 2 })
})

test('rejects duplicate observations and broken registry foreign keys through the validator', async () => {
  await withRegistryCopy(async (directory) => {
    const observationsPath = join(directory, 'observations.synthetic.json')
    const observations = JSON.parse(await readFile(observationsPath, 'utf8')) as Array<Record<string, unknown>>
    await writeFile(observationsPath, JSON.stringify([...observations, observations[0]]), 'utf8')
    await assert.rejects(() => validateRouterDataDirectory(directory), /duplicate observation/i)

    observations[0] = { ...observations[0], methodId: 'unregistered_method' }
    await writeFile(observationsPath, JSON.stringify(observations), 'utf8')
    await assert.rejects(() => validateRouterDataDirectory(directory), /unknown method id or alias/i)
  })
})
