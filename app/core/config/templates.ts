import type { MethodConfigTemplate, ParameterDefinition, ParameterValue } from './types.ts'
import { denseOwnDataArray } from '../router/validation.ts'

type RecordValue = Record<string, unknown>
const dangerousKeys = new Set(['__proto__', 'prototype', 'constructor'])
const pythonIdentifier = /^[A-Za-z_][A-Za-z0-9_]*$/
function hasAsciiControl(value: string): boolean { return [...value].some((character) => { const code = character.charCodeAt(0); return code <= 0x1f || code === 0x7f }) }

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
  if (typeof value !== 'string' || !value.trim() || hasAsciiControl(value)) throw new Error(`${label} must be a nonblank control-free string`)
  return value
}

function cloneValue(value: unknown, label: string): ParameterValue {
  if (typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  throw new Error(`${label} must be a finite string, number, or boolean`)
}

function validateParameterValue(value: unknown, definition: ParameterDefinition, label: string): ParameterValue {
  const parsed = cloneValue(value, label)
  if (typeof parsed !== definition.type) throw new Error(`${label} must match declared ${definition.type} type`)
  if (typeof parsed === 'number') {
    if (definition.minimum !== undefined && parsed < definition.minimum) throw new Error(`${label} is below minimum`)
    if (definition.maximum !== undefined && parsed > definition.maximum) throw new Error(`${label} exceeds maximum`)
    if (definition.integer && !Number.isInteger(parsed)) throw new Error(`${label} must be an integer`)
  }
  if (definition.enum !== undefined && !definition.enum.includes(parsed)) throw new Error(`${label} is outside enum`)
  return parsed
}

function frozen<T>(value: T): T { return Object.freeze(value) }

function parseDefinition(value: unknown, label: string): ParameterDefinition {
  const record = ownRecord(value, label)
  const type = required(record, 'type', label)
  if (type !== 'string' && type !== 'number' && type !== 'boolean') throw new Error(`${label}.type is invalid`)
  for (const key of Object.keys(record)) if (!['type', 'minimum', 'maximum', 'integer', 'enum'].includes(key)) throw new Error(`${label}.${key} is unknown`)
  const minimum = record.minimum
  const maximum = record.maximum
  if (type !== 'number' && (minimum !== undefined || maximum !== undefined || record.integer !== undefined)) throw new Error(`${label} numeric constraints require type number`)
  if (minimum !== undefined && (typeof minimum !== 'number' || !Number.isFinite(minimum))) throw new Error(`${label}.minimum must be finite`)
  if (maximum !== undefined && (typeof maximum !== 'number' || !Number.isFinite(maximum))) throw new Error(`${label}.maximum must be finite`)
  if (minimum !== undefined && maximum !== undefined && minimum > maximum) throw new Error(`${label} minimum exceeds maximum`)
  if (record.integer !== undefined && typeof record.integer !== 'boolean') throw new Error(`${label}.integer must be boolean`)
  if (record.enum !== undefined) denseOwnDataArray(record.enum, `${label}.enum`)
  if (record.enum !== undefined && (record.enum as unknown[]).length === 0) throw new Error(`${label}.enum must be a non-empty array`)
  const enumeration = record.enum === undefined ? undefined : frozen((record.enum as unknown[]).map((entry, index) => cloneValue(entry, `${label}.enum[${index}]`)))
  if (enumeration?.some((entry) => typeof entry !== type)) throw new Error(`${label}.enum values must match type`)
  if (enumeration && new Set(enumeration.map((entry) => `${typeof entry}:${String(entry)}`)).size !== enumeration.length) throw new Error(`${label}.enum must not contain duplicates`)
  return frozen({ type, ...(minimum === undefined ? {} : { minimum }), ...(maximum === undefined ? {} : { maximum }), ...(record.integer === undefined ? {} : { integer: record.integer }), ...(enumeration === undefined ? {} : { enum: enumeration }) })
}

function parseOutputs(value: unknown): MethodConfigTemplate['outputKeys'] {
  const record = ownRecord(value, 'template.outputKeys')
  const fields = ['latent', 'graph', 'pseudotime', 'branch', 'metadata'] as const
  if (Object.keys(record).some((key) => !fields.includes(key as typeof fields[number]))) throw new Error('template.outputKeys contains unknown fields')
  const expected = fields.filter((key) => Object.hasOwn(record, key))
  if (Object.keys(record).length !== expected.length || Object.keys(record).some((key, index) => key !== expected[index])) throw new Error('template.outputKeys must use canonical output order')
  const latent = nonblank(required(record, 'latent', 'template.outputKeys'), 'template.outputKeys.latent')
  const metadata = nonblank(required(record, 'metadata', 'template.outputKeys'), 'template.outputKeys.metadata')
  const optional = (key: 'graph' | 'pseudotime' | 'branch') => !Object.hasOwn(record, key) ? undefined : record[key] === undefined ? (() => { throw new Error(`template.outputKeys.${key} must not be undefined`) })() : nonblank(record[key], `template.outputKeys.${key}`)
  const graph = optional('graph'); const pseudotime = optional('pseudotime'); const branch = optional('branch')
  return frozen({ latent, ...(graph === undefined ? {} : { graph }), ...(pseudotime === undefined ? {} : { pseudotime }), ...(branch === undefined ? {} : { branch }), metadata })
}

function distinct(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) throw new Error(`${label} must not contain duplicates`)
}

export function validateMethodConfigTemplate(value: unknown): MethodConfigTemplate {
  const record = ownRecord(value, 'template', ['constructor'])
  const allowed = ['methodId', 'version', 'packageName', 'importName', 'constructor', 'outputs', 'defaultParameters', 'allowedParameters', 'outputKeys', 'downstream']
  for (const key of Object.keys(record)) if (!allowed.includes(key)) throw new Error(`template.${key} is unknown`)
  const methodId = nonblank(required(record, 'methodId', 'template'), 'template.methodId')
  const version = nonblank(required(record, 'version', 'template'), 'template.version')
  const packageName = nonblank(required(record, 'packageName', 'template'), 'template.packageName')
  const importName = nonblank(required(record, 'importName', 'template'), 'template.importName')
  const constructor = nonblank(required(record, 'constructor', 'template'), 'template.constructor')
  const outputs = denseOwnDataArray(required(record, 'outputs', 'template'), 'template.outputs')
  if (!outputs.length || outputs.some((output) => typeof output !== 'string' || !['latent', 'graph', 'pseudotime', 'branch', 'metadata'].includes(output))) throw new Error('template.outputs must be non-empty known output names')
  distinct(outputs as string[], 'template.outputs')
  const expectedOutputs = ['latent', 'graph', 'pseudotime', 'branch', 'metadata'].filter((output) => (outputs as string[]).includes(output))
  if (outputs.length !== expectedOutputs.length || outputs.some((output, index) => output !== expectedOutputs[index])) throw new Error('template.outputs must use canonical output order')
  if (!pythonIdentifier.test(importName) || !pythonIdentifier.test(constructor)) throw new Error('template importName and constructor must be Python identifiers')
  const defaults = ownRecord(required(record, 'defaultParameters', 'template'), 'template.defaultParameters')
  const definitions = ownRecord(required(record, 'allowedParameters', 'template'), 'template.allowedParameters')
  const defaultParameters: Record<string, ParameterValue> = Object.create(null)
  const allowedParameters: Record<string, ParameterDefinition> = Object.create(null)
  for (const key of Object.keys(definitions).sort()) {
    if (!pythonIdentifier.test(key)) throw new Error(`template.allowedParameters.${key} must be a Python identifier`)
    allowedParameters[key] = parseDefinition(definitions[key], `template.allowedParameters.${key}`)
  }
  for (const key of Object.keys(defaults).sort()) {
    if (!Object.hasOwn(allowedParameters, key)) throw new Error(`template.defaultParameters.${key} is not allowed`)
    if (!pythonIdentifier.test(key)) throw new Error(`template.defaultParameters.${key} must be a Python identifier`)
    defaultParameters[key] = validateParameterValue(defaults[key], allowedParameters[key], `template.defaultParameters.${key}`)
  }
  for (const key of Object.keys(allowedParameters)) if (!Object.hasOwn(defaultParameters, key)) throw new Error(`template.allowedParameters.${key} lacks an exact default`)
  const outputKeys = parseOutputs(required(record, 'outputKeys', 'template'))
  if (outputs.length !== Object.keys(outputKeys).length || outputs.some((output, index) => output !== Object.keys(outputKeys)[index])) throw new Error('template.outputs must exactly match template.outputKeys in canonical order')
  distinct(Object.values(outputKeys), 'template.outputKeys values')
  let downstream: MethodConfigTemplate['downstream']
  if (Object.hasOwn(record, 'downstream') && record.downstream === undefined) throw new Error('template.downstream must not be undefined')
  if (record.downstream !== undefined) {
    const downstreamRecord = ownRecord(record.downstream, 'template.downstream')
    downstream = {}
    for (const key of Object.keys(downstreamRecord)) {
      if (key !== 'scFocus' && key !== 'scRL') throw new Error(`template.downstream.${key} is unknown`)
      if (downstreamRecord[key] === undefined) throw new Error(`template.downstream.${key} must not be undefined`)
      const adapter = ownRecord(downstreamRecord[key], `template.downstream.${key}`)
      if (key === 'scFocus') {
        for (const field of Object.keys(adapter)) if (!['contributionOutput', 'branchKey'].includes(field)) throw new Error(`template.downstream.scFocus.${field} is unknown`)
        if (Object.hasOwn(adapter, 'branchKey') && adapter.branchKey === undefined) throw new Error('template.downstream.scFocus.branchKey must not be undefined')
        downstream.scFocus = frozen({ contributionOutput: nonblank(required(adapter, 'contributionOutput', 'template.downstream.scFocus'), 'template.downstream.scFocus.contributionOutput'), ...(adapter.branchKey === undefined ? {} : { branchKey: nonblank(adapter.branchKey, 'template.downstream.scFocus.branchKey') }) })
      } else {
        for (const field of Object.keys(adapter)) if (!['decisionOutput', 'pseudotimeKey'].includes(field)) throw new Error(`template.downstream.scRL.${field} is unknown`)
        if (Object.hasOwn(adapter, 'pseudotimeKey') && adapter.pseudotimeKey === undefined) throw new Error('template.downstream.scRL.pseudotimeKey must not be undefined')
        downstream.scRL = frozen({ decisionOutput: nonblank(required(adapter, 'decisionOutput', 'template.downstream.scRL'), 'template.downstream.scRL.decisionOutput'), ...(adapter.pseudotimeKey === undefined ? {} : { pseudotimeKey: nonblank(adapter.pseudotimeKey, 'template.downstream.scRL.pseudotimeKey') }) })
      }
    }
    downstream = frozen(downstream)
  }
  if (downstream?.scFocus?.branchKey !== undefined && outputKeys.branch !== downstream.scFocus.branchKey) throw new Error('template scFocus branchKey must match outputKeys.branch')
  if (downstream?.scRL?.pseudotimeKey !== undefined && outputKeys.pseudotime !== downstream.scRL.pseudotimeKey) throw new Error('template scRL pseudotimeKey must match outputKeys.pseudotime')
  return frozen({ methodId, version, packageName, importName, constructor, outputs: frozen([...outputs] as MethodConfigTemplate['outputs']), defaultParameters: frozen(defaultParameters), allowedParameters: frozen(allowedParameters), outputKeys, ...(downstream === undefined ? {} : { downstream }) })
}

export function validateConfigTemplateRegistryEntry(value: unknown): MethodConfigTemplate {
  const record = ownRecord(value, 'template registry entry')
  for (const key of Object.keys(record)) if (!['methodId', 'version', 'synthetic', 'template'].includes(key)) throw new Error(`template registry entry.${key} is unknown`)
  const methodId = nonblank(required(record, 'methodId', 'template registry entry'), 'template registry entry.methodId')
  const version = nonblank(required(record, 'version', 'template registry entry'), 'template registry entry.version')
  if (typeof required(record, 'synthetic', 'template registry entry') !== 'boolean') throw new Error('template registry entry.synthetic must be boolean')
  const nested = ownRecord(required(record, 'template', 'template registry entry'), 'template registry entry.template', ['constructor'])
  return validateMethodConfigTemplate({ ...nested, methodId, version })
}
