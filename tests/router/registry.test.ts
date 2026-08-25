import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import test from 'node:test'

import {
  validateRouterDataDirectory,
  validateRouterRegistry,
} from '../../scripts/validate_router_data.mjs'

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

async function mutateJsonFile<T>(directory: string, name: string, mutate: (value: T) => T) {
  const path = join(directory, name)
  const value = JSON.parse(await readFile(path, 'utf8')) as T
  await writeFile(path, JSON.stringify(mutate(value)), 'utf8')
}

async function loadRegistryInput() {
  const [datasets, methods, metrics, observations, taskProfiles, configTemplates, release] = await Promise.all([
    loadJson<Array<Record<string, unknown>>>('datasets.json'),
    loadJson<Array<Record<string, unknown>>>('methods.json'),
    loadJson<Array<Record<string, unknown>>>('metrics.json'),
    loadJson<Array<Record<string, unknown>>>('observations.synthetic.json'),
    loadJson<Array<Record<string, unknown>>>('task-profiles.json'),
    loadJson<Array<Record<string, unknown>>>('config-templates.json'),
    loadJson<Record<string, unknown>>('release.json'),
  ])
  return { datasets, methods, metrics, observations, taskProfiles, configTemplates, release }
}

test('uses exact canonical IDs, complete primary metric groups, and auxiliary ARI', async () => {
  const [datasets, methods, metrics] = await Promise.all([
    loadJson<Array<{ id: string }>>('datasets.json'),
    loadJson<Array<{ id: string, executable: boolean, sourceUrl: string, docsUrl: string, paperUrl: string }>>('methods.json'),
    loadJson<Array<{ id: string, group: string, auxiliary: boolean }>>('metrics.json'),
  ])

  assert.deepEqual(datasets.map((dataset) => dataset.id), ['synthetic_branch_time', 'synthetic_large_sparse', 'synthetic_linear_small'])
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
    assert.equal(observation.provenance.extractedAt, '2026-08-23T00:00:00Z')
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

test('rejects a missing synthetic Cartesian cell even when an extra run variant preserves 63 rows', async () => {
  await withRegistryCopy(async (directory) => {
    await mutateJsonFile<Array<Record<string, unknown>>>(directory, 'observations.synthetic.json', (observations) => {
      const duplicate = structuredClone(observations[1]) as Record<string, unknown>
      const provenance = duplicate.provenance as Record<string, unknown>
      duplicate.provenance = { ...provenance, runConfigId: 'fixture-alternate' }
      return [duplicate, ...observations.slice(1)]
    })

    await assert.rejects(
      () => validateRouterDataDirectory(directory),
      /synthetic observations must contain exactly one canonical observation.*synthetic_branch_time.*geometry_vae.*ari/i,
    )
  })
})

test('rejects an extra synthetic run variant for an otherwise complete triple', async () => {
  await withRegistryCopy(async (directory) => {
    await mutateJsonFile<Array<Record<string, unknown>>>(directory, 'observations.synthetic.json', (observations) => {
      const extra = structuredClone(observations[0]) as Record<string, unknown>
      const provenance = extra.provenance as Record<string, unknown>
      extra.provenance = { ...provenance, runConfigId: 'fixture-alternate' }
      return [...observations, extra]
    })

    await assert.rejects(
      () => validateRouterDataDirectory(directory),
      /synthetic observations must contain exactly one canonical observation/i,
    )
  })
})

test('allows missing observations for a release explicitly marked non-synthetic', async () => {
  await withRegistryCopy(async (directory) => {
    await mutateJsonFile<Record<string, unknown>>(directory, 'release.json', (release) => ({
      ...release,
      id: 'router-evidence-real-v1',
      synthetic: false,
      description: 'Non-synthetic release used to verify sparse evidence semantics.',
    }))
    await mutateJsonFile<Array<Record<string, unknown>>>(directory, 'config-templates.json', (templates) => templates.map((template) => ({ ...template, synthetic: false })))
    await mutateJsonFile<Array<Record<string, unknown>>>(directory, 'observations.synthetic.json', (observations) => observations.slice(1))
    await mutateJsonFile<unknown[]>(directory, 'datasets.json', (datasets) => [datasets[1], datasets[0], ...datasets.slice(2)])

    const result = await validateRouterDataDirectory(directory)
    assert.equal(result.observations, 62)
  })
})

test('rejects unknown release and config-template fields through strict schemas', async () => {
  await withRegistryCopy(async (directory) => {
    await mutateJsonFile<Record<string, unknown>>(directory, 'release.json', (release) => ({ ...release, unknown: true }))
    await assert.rejects(() => validateRouterDataDirectory(directory), /release schema validation failed:.*additional properties/i)
  })

  await withRegistryCopy(async (directory) => {
    await mutateJsonFile<Array<Record<string, unknown>>>(directory, 'config-templates.json', (templates) => [
      { ...templates[0], unknown: true },
      ...templates.slice(1),
    ])
    await assert.rejects(() => validateRouterDataDirectory(directory), /configTemplate schema validation failed:.*additional properties/i)
  })
})

test('rejects template method foreign keys, versions, and outputs inconsistent with the method registry', async () => {
  const mutations: Array<{
    mutate: (template: Record<string, unknown>) => Record<string, unknown>
    expected: RegExp
  }> = [
    { mutate: (template) => ({ ...template, methodId: 'unknown_method' }), expected: /unknown template method id/i },
    { mutate: (template) => ({ ...template, version: '9.9.9' }), expected: /template version mismatch/i },
    {
      mutate: (template) => ({ ...template, template: { outputs: ['latent', 'graph', 'metadata'] } }),
      expected: /template outputs mismatch/i,
    },
  ]

  for (const mutation of mutations) {
    await withRegistryCopy(async (directory) => {
      await mutateJsonFile<Array<Record<string, unknown>>>(directory, 'config-templates.json', (templates) => [
        mutation.mutate(templates[0]),
        ...templates.slice(1),
      ])
      await assert.rejects(() => validateRouterDataDirectory(directory), mutation.expected)
    })
  }
})

test('rejects invalid pip runner forms that the executable grammar must never generate', async () => {
  for (const installCommand of [
    'python install geometry-vae==1.0.0',
    'pip -m pip install geometry-vae==1.0.0',
  ]) {
    const registry = await loadRegistryInput()
    registry.methods[0] = { ...registry.methods[0], installCommand }

    await assert.rejects(
      () => validateRouterRegistry(registry),
      /install|runner|grammar/i,
      installCommand,
    )
  }
})

test('rejects a config template whose synthetic provenance disagrees with its release', async () => {
  const registry = await loadRegistryInput()
  registry.configTemplates[0] = { ...registry.configTemplates[0], synthetic: false }

  await assert.rejects(
    () => validateRouterRegistry(registry),
    /synthetic|release|provenance/i,
  )
})

test('enforces auxiliary metrics as biology-only context and keeps primary evidence in every scientific group', async () => {
  const movedAuxiliary = await loadRegistryInput()
  movedAuxiliary.metrics[0] = { ...movedAuxiliary.metrics[0], group: 'trajectory' }
  await assert.rejects(() => validateRouterRegistry(movedAuxiliary), /auxiliary.*biology|ontology/i)

  const missingPrimary = await loadRegistryInput()
  missingPrimary.metrics = missingPrimary.metrics.map((metric) => metric.group === 'trajectory' ? { ...metric, auxiliary: true } : metric)
  await assert.rejects(() => validateRouterRegistry(missingPrimary), /primary.*trajectory|ontology/i)
})

test('binds each method install pin to the template package provenance', async () => {
  const registry = await loadRegistryInput()
  registry.configTemplates[0] = {
    ...registry.configTemplates[0],
    template: { ...registry.configTemplates[0].template, packageVersion: '2.0.0' },
  }

  await assert.rejects(() => validateRouterRegistry(registry), /package|install|version/i)
})

test('rejects duplicate and noncanonical config-template outputs', async () => {
  for (const outputs of [['latent', 'latent'], ['latent', 'unknown_output']]) {
    await withRegistryCopy(async (directory) => {
      await mutateJsonFile<Array<Record<string, unknown>>>(directory, 'config-templates.json', (templates) => [
        { ...templates[0], template: { outputs } },
        ...templates.slice(1),
      ])
      await assert.rejects(() => validateRouterDataDirectory(directory), /configTemplate schema validation failed/i)
    })
  }
})

test('rejects Python-injectable parameter names and constraint metadata that cannot describe their defaults', async () => {
  const cases: Array<{ mutate: (template: Record<string, unknown>) => Record<string, unknown>, expected: RegExp }> = [
    {
      mutate: (template) => ({ ...template, template: { ...template.template as Record<string, unknown>, allowedParameters: { 'epochs;exec()': { type: 'number' } }, defaultParameters: { 'epochs;exec()': 1 } } }),
      expected: /property name|pattern|identifier/i,
    },
    {
      mutate: (template) => ({ ...template, template: { ...template.template as Record<string, unknown>, allowedParameters: { epochs: { type: 'string', minimum: 1 } }, defaultParameters: { epochs: 'one' } } }),
      expected: /minimum|numeric|number/i,
    },
    {
      mutate: (template) => ({ ...template, template: { ...template.template as Record<string, unknown>, allowedParameters: { epochs: { type: 'number', minimum: 2, integer: true, enum: [2] } }, defaultParameters: { epochs: 1 } } }),
      expected: /default below minimum|outside enum/i,
    },
  ]
  for (const { mutate, expected } of cases) {
    await withRegistryCopy(async (directory) => {
      await mutateJsonFile<Array<Record<string, unknown>>>(directory, 'config-templates.json', (templates) => [mutate(templates[0]), ...templates.slice(1)])
      await assert.rejects(() => validateRouterDataDirectory(directory), expected)
    })
  }
})

test('requires exactly one config template for every synthetic fixture method', async () => {
  for (const { mutate, expected } of [
    {
      mutate: (templates: unknown[]) => templates.slice(1),
      expected: /synthetic release requires exactly one template for method/i,
    },
    {
      mutate: (templates: unknown[]) => [...templates, structuredClone(templates[0])],
      expected: /duplicate config template for method/i,
    },
  ]) {
    await withRegistryCopy(async (directory) => {
      await mutateJsonFile<unknown[]>(directory, 'config-templates.json', mutate)
      await assert.rejects(() => validateRouterDataDirectory(directory), expected)
    })
  }
})

test('rejects nondeterministic code-unit ordering in every synthetic registry array', async () => {
  for (const name of ['datasets.json', 'methods.json', 'metrics.json', 'config-templates.json', 'task-profiles.json', 'observations.synthetic.json']) {
    await withRegistryCopy(async (directory) => {
      await mutateJsonFile<unknown[]>(directory, name, (records) => [records[1], records[0], ...records.slice(2)])
      await assert.rejects(() => validateRouterDataDirectory(directory), /synthetic .* must use ascending code-unit order/i)
    })
  }
})

test('requires explicit schema-valid release and config-template inputs for direct validation', async () => {
  const registry = await loadRegistryInput()
  const { release: _release, ...withoutRelease } = registry
  const { configTemplates: _configTemplates, ...withoutConfigTemplates } = registry

  await assert.rejects(() => validateRouterRegistry(withoutRelease), /release is required/i)
  await assert.rejects(() => validateRouterRegistry({ ...registry, release: undefined }), /release is required/i)
  await assert.rejects(() => validateRouterRegistry({ ...registry, release: null }), /release schema validation failed/i)
  await assert.rejects(() => validateRouterRegistry(withoutConfigTemplates), /configTemplates must be an explicit array/i)
  await assert.rejects(() => validateRouterRegistry({ ...registry, configTemplates: null }), /configTemplates must be an explicit array/i)
})

test('canonicalizes alias-form observations before synthetic coverage and ordering checks', async () => {
  const registry = await loadRegistryInput()
  registry.observations[0] = {
    ...registry.observations[0],
    datasetId: 'synthetic-branch-time-v1',
    methodId: 'geometry-vae',
    metricId: 'adjusted-rand-index',
  }

  const result = await validateRouterRegistry(registry)
  assert.equal(result.observations.length, 63)
  assert.deepEqual(
    {
      datasetId: result.observations[0].datasetId,
      methodId: result.observations[0].methodId,
      metricId: result.observations[0].metricId,
    },
    { datasetId: 'synthetic_branch_time', methodId: 'geometry_vae', metricId: 'ari' },
  )
})

test('rejects alias and canonical observation forms as one duplicate key', async () => {
  const registry = await loadRegistryInput()
  registry.observations.push({
    ...structuredClone(registry.observations[0]),
    datasetId: 'synthetic-branch-time-v1',
    methodId: 'geometry-vae',
    metricId: 'adjusted-rand-index',
  })

  await assert.rejects(() => validateRouterRegistry(registry), /duplicate observation: synthetic_branch_time, geometry_vae, ari/i)
})

test('canonicalizes template method aliases for foreign keys and synthetic ordering', async () => {
  const registry = await loadRegistryInput()
  registry.configTemplates[0] = { ...registry.configTemplates[0], methodId: 'geometry-vae' }

  const result = await validateRouterRegistry(registry)
  assert.equal(result.configTemplates[0].methodId, 'geometry_vae')
})

test('rejects duplicate canonical template methods for a non-synthetic release', async () => {
  const registry = await loadRegistryInput()
  registry.release = {
    id: 'router-evidence-real-v1',
    synthetic: false,
    description: 'Sparse non-synthetic evidence fixture.',
  }
  registry.configTemplates = registry.configTemplates.map((template) => ({ ...template, synthetic: false }))
  registry.configTemplates.push({
    ...structuredClone(registry.configTemplates[0]),
    methodId: 'geometry-vae',
  })
  registry.observations = registry.observations.slice(1)

  await assert.rejects(() => validateRouterRegistry(registry), /duplicate config template for method: geometry_vae/i)
})
