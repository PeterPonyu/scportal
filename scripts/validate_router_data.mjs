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

function sanitizeJsonData(value, path = '$', ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${path} must be a finite JSON number`)
    return value
  }
  if (typeof value !== 'object') throw new Error(`${path} must contain only JSON values`)
  if (ancestors.has(value)) throw new Error(`${path} must not contain circular references`)

  ancestors.add(value)
  try {
    const ownKeys = Reflect.ownKeys(value)
    if (ownKeys.some((key) => typeof key === 'symbol')) throw new Error(`${path} must not contain symbol properties`)
    if (Array.isArray(value)) {
      const prototype = Object.getPrototypeOf(value)
      if (prototype !== Array.prototype && prototype !== null) throw new Error(`${path} must be a plain JSON array`)
      const stringKeys = ownKeys
      const lengthDescriptor = ownDataDescriptor(value, 'length')
      if (!lengthDescriptor || lengthDescriptor.enumerable || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0) {
        throw new Error(`${path} array length must be a non-enumerable own data property`)
      }
      const length = lengthDescriptor.value
      const extraKey = stringKeys.find((key) => key !== 'length' && !isCanonicalArrayIndex(key, length))
      if (extraKey !== undefined) throw new Error(`${path} array must not contain extra properties`)
      if (stringKeys.length !== length + 1) throw new Error(`${path} must be a dense JSON array without holes`)

      const sanitized = new Array(length)
      for (let index = 0; index < length; index += 1) {
        const key = String(index)
        const descriptor = ownDataDescriptor(value, key)
        if (!descriptor?.enumerable) throw new Error(`${path}[${key}] array indices must be enumerable own data properties`)
        sanitized[index] = sanitizeJsonData(descriptor.value, `${path}[${key}]`, ancestors)
      }
      return sanitized
    }

    if (!isRecord(value)) throw new Error(`${path} must be a plain JSON object`)
    const sanitized = Object.create(null)
    for (const key of ownKeys) {
      const descriptor = ownDataDescriptor(value, key)
      if (!descriptor?.enumerable) throw new Error(`${path} own string properties must be enumerable data properties`)
      Object.defineProperty(sanitized, key, {
        configurable: true,
        enumerable: true,
        value: sanitizeJsonData(descriptor.value, `${path}.${key}`, ancestors),
        writable: true,
      })
    }
    return sanitized
  } finally {
    ancestors.delete(value)
  }
}

function ownDataDescriptor(source, key) {
  const descriptor = Object.getOwnPropertyDescriptor(source, key)
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) return undefined
  return descriptor
}

function isCanonicalArrayIndex(key, length) {
  const index = Number(key)
  return Number.isInteger(index) && index >= 0 && index < length && String(index) === key
}

function normalizeId(value) {
  const normalized = value.trim().toLowerCase()
  if (!normalized) throw new Error('blank id or alias')
  return normalized
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
    const sanitized = sanitizeJsonData(value)
    const validate = validators[name]
    if (!validate(sanitized)) throw new Error(`${name} schema validation failed: ${formatErrors(validate.errors)}`)
    return sanitized
  }

  function assertUniqueEntityIds(kind, entities) {
    const seen = new Set()
    for (const entity of entities) {
      const candidates = [entity.id, ...entity.aliases]
      for (const candidate of candidates) {
        let normalized
        try {
          normalized = normalizeId(candidate)
        } catch {
          throw new Error(`blank ${kind} id or alias`)
        }
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
    parseTaskProfile: (value) => {
      const parsed = parse('taskProfile', value)
      assertValidWeights(parsed.weights)
      return parsed
    },
    parseExecutableConfig: (value) => parse('executableConfig', value),
    assertUniqueEntityIds,
  }
}

let defaultValidatorPromise

function getDefaultRouterDataValidator() {
  defaultValidatorPromise ??= createRouterDataValidator()
  return defaultValidatorPromise
}

function assertValidWeights(weights) {
  const sum = Object.values(weights).reduce((total, weight) => {
    if (!Number.isFinite(weight) || weight < 0) throw new Error('weights must be finite and non-negative')
    return total + weight
  }, 0)
  if (!Number.isFinite(sum) || sum <= 0) throw new Error('weights must sum to a positive value')
}

export async function validateTaskProfile(profile) {
  const validator = await getDefaultRouterDataValidator()
  return validator.parseTaskProfile(profile)
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
  const parsedTaskProfiles = taskProfiles.map(validator.parseTaskProfile)

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

async function loadRegistryFiles(dataDirectory) {
  const entries = await readdir(dataDirectory, { withFileTypes: true })
  const files = entries.filter((entry) => entry.isFile() && extname(entry.name) === '.json')
  const loaded = await Promise.all(files.map(async (entry) => {
    const value = JSON.parse(await readFile(join(dataDirectory, entry.name), 'utf8'))
    return [entry.name, sanitizeJsonData(value, entry.name)]
  }))
  return new Map(loaded)
}

function recordsFromFile(files, name) {
  const value = files.get(name)
  if (!Array.isArray(value)) throw new Error(`${name} must contain a JSON array`)
  return value
}

function configTemplatesFromFile(files) {
  const templates = recordsFromFile(files, 'config-templates.json')
  templates.forEach((template, index) => {
    if (!isRecord(template)) throw new Error(`config-templates.json[${index}] must be a JSON object`)
  })
  return templates
}

function releaseFromFile(files) {
  const release = files.get('release.json')
  if (!isRecord(release)) throw new Error('release.json must contain a JSON object')
  if (typeof release.id !== 'string' || !release.id.trim()) throw new Error('release.json must contain a nonblank id')
  return release
}

const requiredRegistryFiles = [
  'datasets.json',
  'methods.json',
  'metrics.json',
  'task-profiles.json',
  'config-templates.json',
  'release.json',
]

function assertCompleteRegistryFiles(files) {
  const observationNames = [...files.keys()].filter((name) => /^observations\..+\.json$/.test(name))
  const recognizedNames = new Set([...requiredRegistryFiles, ...observationNames])
  const unexpectedNames = [...files.keys()].filter((name) => !recognizedNames.has(name)).sort()
  if (unexpectedNames.length > 0) throw new Error(`unexpected router data file: ${unexpectedNames.join(', ')}`)

  const missingNames = requiredRegistryFiles.filter((name) => !files.has(name))
  if (observationNames.length === 0) missingNames.push('observations.*.json')
  if (missingNames.length > 0) throw new Error(`missing required router data files: ${missingNames.join(', ')}`)
  return observationNames.sort()
}

export async function validateRouterDataDirectory(dataDirectory = routerDataDirectory) {
  const files = await loadRegistryFiles(dataDirectory)
  if (files.size === 0) {
    await getDefaultRouterDataValidator()
    return { status: 'NO_REGISTRY_FILES' }
  }

  const observationNames = assertCompleteRegistryFiles(files)
  const datasets = recordsFromFile(files, 'datasets.json')
  const methods = recordsFromFile(files, 'methods.json')
  const metrics = recordsFromFile(files, 'metrics.json')
  const observations = observationNames
    .flatMap((name) => {
      const value = files.get(name)
      if (!Array.isArray(value)) throw new Error('observation files must contain JSON arrays')
      return value
    })
  const taskProfiles = recordsFromFile(files, 'task-profiles.json')
  configTemplatesFromFile(files)
  releaseFromFile(files)
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
