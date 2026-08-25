import { readdir, readFile } from 'node:fs/promises'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const currentDirectory = dirname(fileURLToPath(import.meta.url))
const routerDataDirectory = join(currentDirectory, '..', 'data', 'router')
const schemaDirectory = join(routerDataDirectory, 'schemas')
const schemaNames = {
  dataset: 'dataset-context.schema.json',
  method: 'method-capability.schema.json',
  metric: 'metric-definition.schema.json',
  observation: 'benchmark-observation.schema.json',
  taskProfile: 'task-profile.schema.json',
  executableConfig: 'executable-config.schema.json',
}

function isRecord(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function assertJsonData(value, path = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertJsonData(item, `${path}[${index}]`))
    return
  }
  if (value !== null && typeof value === 'object') {
    if (!isRecord(value)) throw new Error(`${path} must be a plain JSON object`)
    for (const [key, item] of Object.entries(value)) assertJsonData(item, `${path}.${key}`)
  }
}

function normalizeId(value) {
  return value.trim().toLowerCase()
}

function formatErrors(errors) {
  return errors?.map((error) => `${error.instancePath || '$'} ${error.message}`).join('; ') ?? 'unknown schema error'
}

async function readSchemas() {
  return Object.fromEntries(await Promise.all(
    Object.entries(schemaNames).map(async ([name, filename]) => [
      name,
      JSON.parse(await readFile(join(schemaDirectory, filename), 'utf8')),
    ]),
  ))
}

export async function createRouterDataValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: true })
  addFormats(ajv)
  const schemas = await readSchemas()
  const validators = Object.fromEntries(
    Object.entries(schemas).map(([name, schema]) => [name, ajv.compile(schema)]),
  )

  function parse(name, value) {
    assertJsonData(value)
    const validate = validators[name]
    if (!validate(value)) throw new Error(`${name} schema validation failed: ${formatErrors(validate.errors)}`)
    return value
  }

  function assertUniqueEntityIds(kind, entities) {
    const seen = new Set()
    for (const entity of entities) {
      const candidates = [entity.id, ...entity.aliases]
      for (const candidate of candidates) {
        const normalized = normalizeId(candidate)
        if (seen.has(normalized)) throw new Error(`duplicate ${kind} id or alias: ${normalized}`)
        seen.add(normalized)
      }
    }
  }

  return {
    parseDataset: (value) => parse('dataset', value),
    parseMethod: (value) => parse('method', value),
    parseMetric: (value) => parse('metric', value),
    parseObservation: (value) => parse('observation', value),
    parseTaskProfile: (value) => parse('taskProfile', value),
    parseExecutableConfig: (value) => parse('executableConfig', value),
    assertUniqueEntityIds,
  }
}

export async function validateTaskProfile(profile) {
  const validator = await createRouterDataValidator()
  const parsed = validator.parseTaskProfile(profile)
  const weights = parsed.weights
  const sum = Object.values(weights).reduce((total, weight) => {
    if (!Number.isFinite(weight) || weight < 0) throw new Error('weights must be finite and non-negative')
    return total + weight
  }, 0)
  if (!Number.isFinite(sum) || sum <= 0) throw new Error('weights must sum to a positive value')
  return parsed
}

function aliasesByCanonicalId(kind, entities) {
  const aliases = new Map()
  for (const entity of entities) {
    for (const value of [entity.id, ...entity.aliases]) aliases.set(normalizeId(value), entity.id)
  }
  return aliases
}

function resolveEntityId(kind, value, aliases) {
  const canonical = aliases.get(normalizeId(value))
  if (!canonical) throw new Error(`unknown ${kind} id or alias: ${value}`)
  return canonical
}

export async function validateRouterRegistry({ datasets, methods, metrics, observations, taskProfiles = [] }) {
  const validator = await createRouterDataValidator()
  const parsedDatasets = datasets.map(validator.parseDataset)
  const parsedMethods = methods.map(validator.parseMethod)
  const parsedMetrics = metrics.map(validator.parseMetric)
  const parsedObservations = observations.map(validator.parseObservation)
  const parsedTaskProfiles = await Promise.all(taskProfiles.map(validateTaskProfile))

  validator.assertUniqueEntityIds('dataset', parsedDatasets)
  validator.assertUniqueEntityIds('method', parsedMethods)
  validator.assertUniqueEntityIds('metric', parsedMetrics)

  const datasetAliases = aliasesByCanonicalId('dataset', parsedDatasets)
  const methodAliases = aliasesByCanonicalId('method', parsedMethods)
  const metricAliases = aliasesByCanonicalId('metric', parsedMetrics)
  const methodVersions = new Map(parsedMethods.map((method) => [method.id, method.version]))
  const observationKeys = new Set()

  for (const observation of parsedObservations) {
    const datasetId = resolveEntityId('dataset', observation.datasetId, datasetAliases)
    const methodId = resolveEntityId('method', observation.methodId, methodAliases)
    const metricId = resolveEntityId('metric', observation.metricId, metricAliases)
    if (!Number.isFinite(observation.rawValue)) throw new Error('observation rawValue must be finite')
    const key = [datasetId, methodId, metricId, observation.provenance.runConfigId].join('\u0000')
    if (observationKeys.has(key)) throw new Error(`duplicate observation: ${datasetId}, ${methodId}, ${metricId}, ${observation.provenance.runConfigId}`)
    observationKeys.add(key)
    if (observation.provenance.methodVersion !== methodVersions.get(methodId)) {
      throw new Error(`method version mismatch for ${methodId}: ${observation.provenance.methodVersion}`)
    }
  }

  for (const profile of parsedTaskProfiles) {
    for (const methodId of profile.candidateMethodIds ?? []) resolveEntityId('method', methodId, methodAliases)
  }

  return { datasets: parsedDatasets, methods: parsedMethods, metrics: parsedMetrics, observations: parsedObservations, taskProfiles: parsedTaskProfiles }
}

async function loadRegistryFiles() {
  const entries = await readdir(routerDataDirectory, { withFileTypes: true })
  const files = entries.filter((entry) => entry.isFile() && extname(entry.name) === '.json')
  const loaded = await Promise.all(files.map(async (entry) => [entry.name, JSON.parse(await readFile(join(routerDataDirectory, entry.name), 'utf8'))]))
  return new Map(loaded)
}

function recordsFromFile(files, name) {
  const value = files.get(name)
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new Error(`${name} must contain a JSON array`)
  return value
}

export async function validateRouterDataDirectory() {
  const files = await loadRegistryFiles()
  const datasets = recordsFromFile(files, 'datasets.json')
  const methods = recordsFromFile(files, 'methods.json')
  const metrics = recordsFromFile(files, 'metrics.json')
  const observations = [...files.entries()]
    .filter(([name]) => name.startsWith('observations.') && name.endsWith('.json'))
    .flatMap(([, value]) => {
      if (!Array.isArray(value)) throw new Error('observation files must contain JSON arrays')
      return value
    })
  const taskProfiles = recordsFromFile(files, 'task-profiles.json')

  if (files.size === 0) {
    await createRouterDataValidator()
    return { status: 'NO_REGISTRY_FILES' }
  }
  await validateRouterRegistry({ datasets, methods, metrics, observations, taskProfiles })
  return { status: 'VALID', datasets: datasets.length, methods: methods.length, metrics: metrics.length, observations: observations.length, taskProfiles: taskProfiles.length }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = await validateRouterDataDirectory()
    if (result.status === 'NO_REGISTRY_FILES') console.log('Router registry data is not present yet; schema contracts are available.')
    else console.log(`Router registry data is valid: ${result.datasets} datasets, ${result.methods} methods, ${result.metrics} metrics, ${result.observations} observations, ${result.taskProfiles} task profiles.`)
  } catch (error) {
    console.error(`Router registry validation failed: ${error.message}`)
    process.exitCode = 1
  }
}
