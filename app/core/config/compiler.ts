import { serializeConfig } from './serialize.ts'
import { validateMethodConfigTemplate } from './templates.ts'
import type { CompileConfigInput, CompiledArtifacts, ExecutableConfig, MethodConfigTemplate, ParameterValue } from './types.ts'

const shellCommand = /^(?:python|python3|pip|pip3)(?: -m pip)? install ([A-Za-z0-9][A-Za-z0-9._-]*==[A-Za-z0-9][A-Za-z0-9._+!-]*)$/
const pythonIdentifier = /^[A-Za-z_][A-Za-z0-9_]*$/

function validateInstall(methodId: string, install: string, packageName: string): string {
  if (/[\n\r`]|\$\(|[;&|<>]/.test(install)) throw new Error(`install command for ${methodId} contains unsafe shell syntax`)
  const match = shellCommand.exec(install)
  if (!match || !match[1].startsWith(`${packageName}==`)) throw new Error(`install command for ${methodId} must be a pinned grammar-safe package install`)
  return install
}

function ownParameters(value: unknown): Record<string, unknown> {
  if (value === undefined) return Object.create(null)
  if (value === null || typeof value !== 'object' || Array.isArray(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) throw new Error('parameters must be a plain own-data object')
  const result = Object.create(null) as Record<string, unknown>
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || ['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('parameters contain unsafe or symbol fields')
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) throw new Error(`parameters.${key} must be an enumerable own data field`)
    if (descriptor.value === undefined) throw new Error(`parameters.${key} must not be undefined`)
    result[key] = descriptor.value
  }
  return result
}

function validateParameters(template: MethodConfigTemplate, supplied: unknown): Record<string, ParameterValue> {
  const values: Record<string, ParameterValue> = { ...template.defaultParameters }
  for (const [key, value] of Object.entries(ownParameters(supplied))) {
    const definition = template.allowedParameters[key]
    if (!definition) throw new Error(`unknown parameter: ${key}`)
    if (typeof value !== definition.type || (typeof value === 'number' && !Number.isFinite(value))) throw new Error(`parameters.${key} must be a finite ${definition.type}`)
    if (typeof value === 'number' && definition.minimum !== undefined && value < definition.minimum) throw new Error(`parameters.${key} is below minimum`)
    if (typeof value === 'number' && definition.maximum !== undefined && value > definition.maximum) throw new Error(`parameters.${key} exceeds maximum`)
    if (typeof value === 'number' && definition.integer && !Number.isInteger(value)) throw new Error(`parameters.${key} must be an integer`)
    if (definition.enum && !definition.enum.includes(value as never)) throw new Error(`parameters.${key} is outside enum`)
    values[key] = value as ParameterValue
  }
  return values
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`
}

function fingerprint(profile: unknown): string {
  const hashes = [2166136261, 2246822519, 3266489917, 668265263]
  for (const unit of canonical(profile)) for (let index = 0; index < hashes.length; index += 1) hashes[index] = Math.imul(hashes[index] ^ (unit.charCodeAt(0) + index), 16777619 + index) >>> 0
  return hashes.map((value) => value.toString(16).padStart(8, '0').repeat(2)).join('')
}

function python(value: ParameterValue | undefined): string {
  if (value === undefined) return 'None'
  if (typeof value === 'boolean') return value ? 'True' : 'False'
  if (typeof value === 'number') return String(value)
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`
}

function pythonSnippet(template: MethodConfigTemplate, config: ExecutableConfig): string {
  if (!pythonIdentifier.test(template.importName) || !pythonIdentifier.test(template.constructor)) throw new Error('template importName and constructor must be Python identifiers')
  const lines = [`from ${template.importName} import ${template.constructor}`, '', `model = ${template.constructor}(`]
  for (const key of Object.keys(config.parameters).sort()) lines.push(`    ${key}=${python(config.parameters[key])},`)
  lines.push(')', "result = model.fit_transform(adata)", `adata.obsm[${python(config.outputs.latent)}] = result.latent`)
  if (config.outputs.graph) lines.push(`adata.obsp[${python(config.outputs.graph)}] = result.graph`)
  if (config.outputs.pseudotime) lines.push(`adata.obs[${python(config.outputs.pseudotime)}] = result.pseudotime`)
  if (config.outputs.branch) lines.push(`adata.obs[${python(config.outputs.branch)}] = result.branch`)
  if (config.downstream.scFocus) lines.push(`run_scfocus(adata, latent_key=${python(config.downstream.scFocus.latentKey)}, branch_key=${python(config.downstream.scFocus.branchKey)}, contribution_output=${python(config.downstream.scFocus.contributionOutput)})`)
  if (config.downstream.scRL) lines.push(`run_scrl(adata, latent_key=${python(config.downstream.scRL.latentKey)}, pseudotime_key=${python(config.downstream.scRL.pseudotimeKey)}, decision_output=${python(config.downstream.scRL.decisionOutput)})`)
  return `${lines.join('\n')}\n`
}

export function compileConfig(input: CompileConfigInput): CompiledArtifacts {
  if (input.outcome.status !== 'OK' || !input.outcome.recommendations.some((recommendation) => recommendation.methodId === input.method.id)) throw new Error('compileConfig requires a successful recommendation for the canonical method')
  if (!input.method.executable) throw new Error(`method ${input.method.id} is not executable`)
  if (!Array.isArray(input.templates)) throw new Error('compileConfig requires the canonical template registry')
  const registeredTemplates = input.templates.map(validateMethodConfigTemplate)
  const matches = registeredTemplates.filter((template) => template.methodId === input.method.id)
  if (matches.length !== 1) throw new Error(`canonical template registry must contain exactly one template for ${input.method.id}`)
  const template = matches[0]
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(template.packageName)) throw new Error('template.packageName must be a grammar-safe package token')
  if (!pythonIdentifier.test(template.importName) || !pythonIdentifier.test(template.constructor)) throw new Error('template.importName and constructor must be Python identifiers')
  if (template.version !== input.method.version) throw new Error('template version does not match method version')
  if (!input.method.outputs.includes('latent') || template.outputKeys.latent.length === 0) throw new Error('executable method must declare a latent output')
  for (const key of Object.keys(template.outputKeys) as Array<keyof MethodConfigTemplate['outputKeys']>) if (!input.method.outputs.includes(key)) throw new Error(`template output ${key} is not registered for method`)
  const installCommand = validateInstall(input.method.id, input.method.installCommand, template.packageName)
  const parameters = validateParameters(template, input.parameters)
  const downstream: ExecutableConfig['downstream'] = {}
  if (template.downstream?.scFocus) {
    const branchKey = template.downstream.scFocus.branchKey ?? template.outputKeys.branch
    if (template.downstream.scFocus.branchKey !== undefined && !template.outputKeys.branch) throw new Error('scFocus handoff requires a declared branch output')
    downstream.scFocus = { latentKey: template.outputKeys.latent, ...(branchKey === undefined ? {} : { branchKey }), contributionOutput: template.downstream.scFocus.contributionOutput }
  }
  if (template.downstream?.scRL) {
    const pseudotimeKey = template.downstream.scRL.pseudotimeKey ?? template.outputKeys.pseudotime
    if (!pseudotimeKey || !template.outputKeys.pseudotime) throw new Error('scRL handoff requires a declared pseudotime output')
    downstream.scRL = { latentKey: template.outputKeys.latent, pseudotimeKey, decisionOutput: template.downstream.scRL.decisionOutput }
  }
  const config: ExecutableConfig = {
    schemaVersion: '1.0', routerVersion: input.outcome.routerVersion, evidenceVersion: input.outcome.evidenceVersion,
    method: { id: input.method.id, version: input.method.version, install: installCommand },
    preprocessing: { modality: input.profile.modality, normalization: 'library_size_log1p', featureSelection: 'highly_variable_features' }, parameters,
    outputs: template.outputKeys, downstream,
    provenance: { recommendationSeed: input.outcome.seed, methodSource: input.method.sourceUrl, generatedAt: input.generatedAt, profileFingerprint: fingerprint(input.profile), outcome: { status: 'OK', methodId: input.method.id } },
  }
  const serialized = serializeConfig(config)
  const stem = `${input.method.id}-${input.outcome.routerVersion}-seed-${input.outcome.seed}`
  return { config, ...serialized, installCommand, pythonSnippet: pythonSnippet(template, config), filenames: { json: `${stem}.json`, yaml: `${stem}.yaml`, python: `${stem}.py` } }
}
