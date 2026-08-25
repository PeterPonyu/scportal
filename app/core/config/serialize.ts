import { stringify as stringifyYaml } from 'yaml'
import type { ExecutableConfig, ParameterValue } from './types.ts'

const dangerousKeys = new Set(['__proto__', 'prototype', 'constructor'])
const pythonIdentifier = /^[A-Za-z_][A-Za-z0-9_]*$/
const installGrammar = /^(?:python|python3|pip|pip3)(?: -m pip)? install [A-Za-z0-9][A-Za-z0-9._-]*==[A-Za-z0-9][A-Za-z0-9._+!-]*$/
const absoluteHttpUrl = /^https?:\/\/[^\s/$.?#][^\s]*$/i
const rfc3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/

function ownRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) throw new Error(`${label} must be a plain own-data object`)
  const result = Object.create(null) as Record<string, unknown>
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || dangerousKeys.has(key)) throw new Error(`${label} contains unsafe or symbol fields`)
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) throw new Error(`${label}.${key} must be an enumerable own data field`)
    result[key] = descriptor.value
  }
  return result
}

function exact(value: unknown, label: string, fields: readonly string[]): Record<string, unknown> {
  const record = ownRecord(value, label)
  if (Object.keys(record).length !== fields.length || fields.some((field) => !Object.hasOwn(record, field))) throw new Error(`${label} has unknown or missing schema fields`)
  return record
}

function nonblank(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim() || hasAsciiControl(value)) throw new Error(`${label} must be a nonblank control-free string`)
  return value
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { for (const key of Reflect.ownKeys(value)) deepFreeze((value as Record<PropertyKey, unknown>)[key]); Object.freeze(value) }
  return value
}

function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map((key) => [key, sorted((value as Record<string, unknown>)[key])]))
  return value
}

export function validateExecutableConfig(value: unknown): ExecutableConfig {
  const config = exact(value, 'executable config', ['schemaVersion', 'routerVersion', 'evidenceVersion', 'method', 'preprocessing', 'parameters', 'outputs', 'downstream', 'provenance'])
  if (config.schemaVersion !== '1.0') throw new Error('executable config.schemaVersion must be 1.0')
  const method = exact(config.method, 'executable config.method', ['id', 'version', 'install'])
  const install = nonblank(method.install, 'executable config.method.install')
  if (/[\n\r`]|\$\(|[;&|<>]/.test(install) || !installGrammar.test(install)) throw new Error('executable config.method.install must use pinned safe install grammar')
  const preprocessing = exact(config.preprocessing, 'executable config.preprocessing', ['modality', 'normalization', 'featureSelection'])
  if (!['scrna', 'scatac', 'multiome'].includes(preprocessing.modality as string)) throw new Error('executable config.preprocessing.modality is invalid')
  const parameters = ownRecord(config.parameters, 'executable config.parameters')
  const parsedParameters = Object.create(null) as Record<string, ParameterValue>
  for (const [key, parameter] of Object.entries(parameters)) {
    if (!pythonIdentifier.test(key)) throw new Error(`executable config.parameters.${key} must be a Python identifier`)
    if ((typeof parameter === 'string' && hasAsciiControl(parameter)) || (typeof parameter !== 'string' && typeof parameter !== 'boolean' && (typeof parameter !== 'number' || !Number.isFinite(parameter)))) throw new Error(`executable config.parameters.${key} must be finite control-free JSON data`)
    parsedParameters[key] = parameter
  }
  const output = ownRecord(config.outputs, 'executable config.outputs')
  const outputFields = ['latent', 'graph', 'pseudotime', 'branch', 'metadata']
  if (Object.keys(output).some((key) => !outputFields.includes(key)) || !Object.hasOwn(output, 'latent') || !Object.hasOwn(output, 'metadata')) throw new Error('executable config.outputs has unknown or missing schema fields')
  const outputs = { latent: nonblank(output.latent, 'executable config.outputs.latent'), metadata: nonblank(output.metadata, 'executable config.outputs.metadata') } as ExecutableConfig['outputs']
  for (const key of ['graph', 'pseudotime', 'branch'] as const) if (Object.hasOwn(output, key)) { if (output[key] === undefined) throw new Error(`executable config.outputs.${key} must not be undefined`); outputs[key] = nonblank(output[key], `executable config.outputs.${key}`) }
  const handoffs = ownRecord(config.downstream, 'executable config.downstream')
  if (Object.keys(handoffs).some((key) => key !== 'scFocus' && key !== 'scRL')) throw new Error('executable config.downstream has unknown schema fields')
  const downstream: ExecutableConfig['downstream'] = Object.create(null)
  if ((Object.hasOwn(handoffs, 'scFocus') && handoffs.scFocus === undefined) || (Object.hasOwn(handoffs, 'scRL') && handoffs.scRL === undefined)) throw new Error('executable config.downstream optional handoffs must not be undefined')
  if (handoffs.scFocus !== undefined) {
    const raw = ownRecord(handoffs.scFocus, 'executable config.downstream.scFocus')
    if (Object.hasOwn(raw, 'branchKey') && raw.branchKey === undefined) throw new Error('executable config.downstream.scFocus.branchKey must not be undefined')
    const fields = Object.hasOwn(raw, 'branchKey') ? ['latentKey', 'branchKey', 'contributionOutput'] : ['latentKey', 'contributionOutput']
    const scFocus = exact(raw, 'executable config.downstream.scFocus', fields)
    if (nonblank(scFocus.latentKey, 'executable config.downstream.scFocus.latentKey') !== outputs.latent || (scFocus.branchKey !== undefined && nonblank(scFocus.branchKey, 'executable config.downstream.scFocus.branchKey') !== outputs.branch)) throw new Error('scFocus handoff requires declared latent and branch outputs')
    downstream.scFocus = { latentKey: outputs.latent, ...(scFocus.branchKey === undefined ? {} : { branchKey: outputs.branch! }), contributionOutput: nonblank(scFocus.contributionOutput, 'executable config.downstream.scFocus.contributionOutput') }
  }
  if (handoffs.scRL !== undefined) {
    const scRL = exact(handoffs.scRL, 'executable config.downstream.scRL', ['latentKey', 'pseudotimeKey', 'decisionOutput'])
    if (nonblank(scRL.latentKey, 'executable config.downstream.scRL.latentKey') !== outputs.latent || !outputs.pseudotime || nonblank(scRL.pseudotimeKey, 'executable config.downstream.scRL.pseudotimeKey') !== outputs.pseudotime) throw new Error('scRL handoff requires declared latent and pseudotime outputs')
    downstream.scRL = { latentKey: outputs.latent, pseudotimeKey: outputs.pseudotime, decisionOutput: nonblank(scRL.decisionOutput, 'executable config.downstream.scRL.decisionOutput') }
  }
  const provenance = exact(config.provenance, 'executable config.provenance', ['recommendationSeed', 'methodSource', 'generatedAt', 'profileFingerprint', 'outcome'])
  const outcome = exact(provenance.outcome, 'executable config.provenance.outcome', ['status', 'methodId'])
  const methodSource = nonblank(provenance.methodSource, 'executable config.provenance.methodSource')
  const generatedAt = nonblank(provenance.generatedAt, 'executable config.provenance.generatedAt')
  if (!Number.isInteger(provenance.recommendationSeed) || (provenance.recommendationSeed as number) < 0 || (provenance.recommendationSeed as number) > 0xffffffff || outcome.status !== 'OK' || nonblank(outcome.methodId, 'executable config.provenance.outcome.methodId') !== nonblank(method.id, 'executable config.method.id') || !/^[a-f0-9]{64}$/.test(nonblank(provenance.profileFingerprint, 'executable config.provenance.profileFingerprint')) || !absoluteHttpUrl.test(methodSource) || !rfc3339.test(generatedAt) || Number.isNaN(Date.parse(generatedAt))) throw new Error('executable config provenance schema validation failed (http URL and RFC3339 timestamp required)')
  return deepFreeze({ schemaVersion: '1.0', routerVersion: nonblank(config.routerVersion, 'executable config.routerVersion'), evidenceVersion: nonblank(config.evidenceVersion, 'executable config.evidenceVersion'), method: { id: method.id as string, version: nonblank(method.version, 'executable config.method.version'), install }, preprocessing: { modality: preprocessing.modality as ExecutableConfig['preprocessing']['modality'], normalization: nonblank(preprocessing.normalization, 'executable config.preprocessing.normalization'), featureSelection: nonblank(preprocessing.featureSelection, 'executable config.preprocessing.featureSelection') }, parameters: parsedParameters, outputs, downstream, provenance: { recommendationSeed: provenance.recommendationSeed as number, methodSource, generatedAt, profileFingerprint: provenance.profileFingerprint as string, outcome: { status: 'OK', methodId: method.id as string } } })
}

export function serializeConfig(value: ExecutableConfig): { json: string; yaml: string } {
  const config = sorted(validateExecutableConfig(value))
  return { json: JSON.stringify(config, null, 2), yaml: stringifyYaml(config) }
}
function hasAsciiControl(value: string): boolean { return [...value].some((character) => { const code = character.charCodeAt(0); return code <= 0x1f || code === 0x7f }) }
