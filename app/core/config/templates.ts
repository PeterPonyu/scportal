import type { MethodConfigTemplate, ParameterDefinition, ParameterValue } from './types.ts'

type RecordValue = Record<string, unknown>
const dangerousKeys = new Set(['__proto__', 'prototype', 'constructor'])

function ownRecord(value: unknown, label: string, allowedDangerous: readonly string[] = []): RecordValue {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) throw new Error(`${label} must be a plain own-data object`)
  const result = Object.create(null) as RecordValue
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || (dangerousKeys.has(key) && !allowedDangerous.includes(key))) throw new Error(`${label} contains unsafe or symbol field`)
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) throw new Error(`${label}.${key} must be an enumerable own data field`)
    result[key] = descriptor.value
  }
  return result
}

function required(record: RecordValue, key: string, label: string): unknown {
  if (!Object.hasOwn(record, key)) throw new Error(`${label} missing own field ${key}`)
  return record[key]
}

function nonblank(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a nonblank string`)
  return value
}

function cloneValue(value: unknown, label: string): ParameterValue {
  if (typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  throw new Error(`${label} must be a finite string, number, or boolean`)
}

function frozen<T>(value: T): T { return Object.freeze(value) }

function parseDefinition(value: unknown, label: string): ParameterDefinition {
  const record = ownRecord(value, label)
  const type = required(record, 'type', label)
  if (type !== 'string' && type !== 'number' && type !== 'boolean') throw new Error(`${label}.type is invalid`)
  for (const key of Object.keys(record)) if (!['type', 'minimum', 'maximum', 'integer', 'enum'].includes(key)) throw new Error(`${label}.${key} is unknown`)
  const minimum = record.minimum
  const maximum = record.maximum
  if (minimum !== undefined && (typeof minimum !== 'number' || !Number.isFinite(minimum))) throw new Error(`${label}.minimum must be finite`)
  if (maximum !== undefined && (typeof maximum !== 'number' || !Number.isFinite(maximum))) throw new Error(`${label}.maximum must be finite`)
  if (minimum !== undefined && maximum !== undefined && minimum > maximum) throw new Error(`${label} minimum exceeds maximum`)
  if (record.integer !== undefined && typeof record.integer !== 'boolean') throw new Error(`${label}.integer must be boolean`)
  if (record.enum !== undefined && !Array.isArray(record.enum)) throw new Error(`${label}.enum must be an array`)
  const enumeration = record.enum === undefined ? undefined : frozen(record.enum.map((entry, index) => cloneValue(entry, `${label}.enum[${index}]`)))
  if (enumeration?.some((entry) => typeof entry !== type)) throw new Error(`${label}.enum values must match type`)
  return frozen({ type, ...(minimum === undefined ? {} : { minimum }), ...(maximum === undefined ? {} : { maximum }), ...(record.integer === undefined ? {} : { integer: record.integer }), ...(enumeration === undefined ? {} : { enum: enumeration }) })
}

function parseOutputs(value: unknown): MethodConfigTemplate['outputKeys'] {
  const record = ownRecord(value, 'template.outputKeys')
  for (const key of Object.keys(record)) if (!['latent', 'graph', 'pseudotime', 'branch', 'metadata'].includes(key)) throw new Error(`template.outputKeys.${key} is unknown`)
  const latent = nonblank(required(record, 'latent', 'template.outputKeys'), 'template.outputKeys.latent')
  const metadata = nonblank(required(record, 'metadata', 'template.outputKeys'), 'template.outputKeys.metadata')
  const optional = (key: 'graph' | 'pseudotime' | 'branch') => record[key] === undefined ? undefined : nonblank(record[key], `template.outputKeys.${key}`)
  return frozen({ latent, metadata, ...(optional('graph') === undefined ? {} : { graph: optional('graph')! }), ...(optional('pseudotime') === undefined ? {} : { pseudotime: optional('pseudotime')! }), ...(optional('branch') === undefined ? {} : { branch: optional('branch')! }) })
}

export function validateMethodConfigTemplate(value: unknown): MethodConfigTemplate {
  const record = ownRecord(value, 'template', ['constructor'])
  const allowed = ['methodId', 'version', 'packageName', 'importName', 'constructor', 'defaultParameters', 'allowedParameters', 'outputKeys', 'downstream']
  for (const key of Object.keys(record)) if (!allowed.includes(key)) throw new Error(`template.${key} is unknown`)
  const methodId = nonblank(required(record, 'methodId', 'template'), 'template.methodId')
  const version = nonblank(required(record, 'version', 'template'), 'template.version')
  const packageName = nonblank(required(record, 'packageName', 'template'), 'template.packageName')
  const importName = nonblank(required(record, 'importName', 'template'), 'template.importName')
  const constructor = nonblank(required(record, 'constructor', 'template'), 'template.constructor')
  const defaults = ownRecord(required(record, 'defaultParameters', 'template'), 'template.defaultParameters')
  const definitions = ownRecord(required(record, 'allowedParameters', 'template'), 'template.allowedParameters')
  const defaultParameters: Record<string, ParameterValue> = Object.create(null)
  const allowedParameters: Record<string, ParameterDefinition> = Object.create(null)
  for (const key of Object.keys(definitions).sort()) allowedParameters[key] = parseDefinition(definitions[key], `template.allowedParameters.${key}`)
  for (const key of Object.keys(defaults).sort()) {
    if (!Object.hasOwn(allowedParameters, key)) throw new Error(`template.defaultParameters.${key} is not allowed`)
    defaultParameters[key] = cloneValue(defaults[key], `template.defaultParameters.${key}`)
  }
  for (const key of Object.keys(allowedParameters)) if (!Object.hasOwn(defaultParameters, key)) throw new Error(`template.allowedParameters.${key} lacks an exact default`)
  const outputKeys = parseOutputs(required(record, 'outputKeys', 'template'))
  let downstream: MethodConfigTemplate['downstream']
  if (record.downstream !== undefined) {
    const downstreamRecord = ownRecord(record.downstream, 'template.downstream')
    downstream = {}
    for (const key of Object.keys(downstreamRecord)) {
      if (key !== 'scFocus' && key !== 'scRL') throw new Error(`template.downstream.${key} is unknown`)
      const adapter = ownRecord(downstreamRecord[key], `template.downstream.${key}`)
      if (key === 'scFocus') downstream.scFocus = frozen({ contributionOutput: nonblank(required(adapter, 'contributionOutput', 'template.downstream.scFocus'), 'template.downstream.scFocus.contributionOutput'), ...(adapter.branchKey === undefined ? {} : { branchKey: nonblank(adapter.branchKey, 'template.downstream.scFocus.branchKey') }) })
      else downstream.scRL = frozen({ decisionOutput: nonblank(required(adapter, 'decisionOutput', 'template.downstream.scRL'), 'template.downstream.scRL.decisionOutput'), ...(adapter.pseudotimeKey === undefined ? {} : { pseudotimeKey: nonblank(adapter.pseudotimeKey, 'template.downstream.scRL.pseudotimeKey') }) })
    }
    downstream = frozen(downstream)
  }
  return frozen({ methodId, version, packageName, importName, constructor, defaultParameters: frozen(defaultParameters), allowedParameters: frozen(allowedParameters), outputKeys, ...(downstream === undefined ? {} : { downstream }) })
}
