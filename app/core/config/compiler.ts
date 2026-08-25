import { serializeConfig, validateExecutableConfig } from './serialize.ts'
import { validateConfigTemplateRegistryEntry } from './templates.ts'
import type { CompileConfigInput, CompiledArtifacts, ExecutableConfig, MethodConfigTemplate, ParameterValue } from './types.ts'
import type { MethodCapability } from '../router/types.ts'

const shellCommand = /^(?:python|python3|pip|pip3)(?: -m pip)? install ([A-Za-z0-9][A-Za-z0-9._-]*==[A-Za-z0-9][A-Za-z0-9._+!-]*)$/
const pythonIdentifier = /^[A-Za-z_][A-Za-z0-9_]*$/
const dangerousKeys = new Set(['__proto__', 'prototype', 'constructor'])
const methodFields = ['id', 'aliases', 'version', 'modalities', 'maxScale', 'outputs', 'requiredPriors', 'supportedGoals', 'resourceTier', 'installCommand', 'license', 'sourceUrl', 'docsUrl', 'paperUrl', 'executable']

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

function required(record: Record<string, unknown>, key: string, label: string): unknown {
  if (!Object.hasOwn(record, key)) throw new Error(`${label} missing own field ${key}`)
  return record[key]
}

function nonblank(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a nonblank string`)
  return value
}

function strings(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) throw new Error(`${label} must be a string array`)
  return [...value]
}

function parseMethod(value: unknown): MethodCapability {
  const record = ownRecord(value, 'method registry entry')
  if (Object.keys(record).length !== methodFields.length || methodFields.some((key) => !Object.hasOwn(record, key))) throw new Error('method registry entry is incomplete or has unknown fields')
  const id = nonblank(required(record, 'id', 'method registry entry'), 'method registry entry.id')
  const modalities = strings(required(record, 'modalities', 'method registry entry'), 'method registry entry.modalities')
  const outputs = strings(required(record, 'outputs', 'method registry entry'), 'method registry entry.outputs')
  const priors = strings(required(record, 'requiredPriors', 'method registry entry'), 'method registry entry.requiredPriors')
  const goals = strings(required(record, 'supportedGoals', 'method registry entry'), 'method registry entry.supportedGoals')
  const maxScale = required(record, 'maxScale', 'method registry entry')
  const resourceTier = required(record, 'resourceTier', 'method registry entry')
  const executable = required(record, 'executable', 'method registry entry')
  if (!modalities.every((entry) => ['scrna', 'scatac', 'multiome'].includes(entry)) || !outputs.every((entry) => ['latent', 'graph', 'pseudotime', 'branch', 'metadata'].includes(entry)) || !priors.every((entry) => ['time', 'root_state', 'terminal_states', 'labels', 'perturbation'].includes(entry)) || !goals.every((entry) => ['latent_representation', 'trajectory_reconstruction', 'fate_decision', 'lineage_contribution'].includes(entry)) || !['lt_10k', '10k_50k', '50k_200k', 'gt_200k'].includes(maxScale as string) || ![1, 2, 3].includes(resourceTier as number) || typeof executable !== 'boolean') throw new Error(`method registry entry ${id} has invalid capability fields`)
  return { id, aliases: strings(required(record, 'aliases', 'method registry entry'), 'method registry entry.aliases'), version: nonblank(required(record, 'version', 'method registry entry'), 'method registry entry.version'), modalities: modalities as MethodCapability['modalities'], maxScale: maxScale as MethodCapability['maxScale'], outputs: outputs as MethodCapability['outputs'], requiredPriors: priors as MethodCapability['requiredPriors'], supportedGoals: goals as MethodCapability['supportedGoals'], resourceTier: resourceTier as MethodCapability['resourceTier'], installCommand: nonblank(required(record, 'installCommand', 'method registry entry'), 'method registry entry.installCommand'), license: nonblank(required(record, 'license', 'method registry entry'), 'method registry entry.license'), sourceUrl: nonblank(required(record, 'sourceUrl', 'method registry entry'), 'method registry entry.sourceUrl'), docsUrl: nonblank(required(record, 'docsUrl', 'method registry entry'), 'method registry entry.docsUrl'), paperUrl: nonblank(required(record, 'paperUrl', 'method registry entry'), 'method registry entry.paperUrl'), executable }
}

function validateInstall(methodId: string, install: string, packageName: string): string {
  if (/[\n\r`]|\$\(|[;&|<>]/.test(install)) throw new Error(`install command for ${methodId} contains unsafe shell syntax`)
  const match = shellCommand.exec(install)
  if (!match || !match[1].startsWith(`${packageName}==`)) throw new Error(`install command for ${methodId} must be a pinned grammar-safe package install`)
  return install
}

function validateParameters(template: MethodConfigTemplate, value: unknown): Record<string, ParameterValue> {
  const supplied = value === undefined ? Object.create(null) : ownRecord(value, 'parameters')
  const parameters: Record<string, ParameterValue> = Object.assign(Object.create(null), template.defaultParameters)
  for (const [key, candidate] of Object.entries(supplied)) {
    if (!pythonIdentifier.test(key)) throw new Error(`parameters.${key} must be a Python identifier`)
    if (candidate === undefined) throw new Error(`parameters.${key} must not be undefined`)
    const definition = template.allowedParameters[key]
    if (!definition) throw new Error(`unknown parameter: ${key}`)
    if (typeof candidate !== definition.type || (typeof candidate === 'number' && !Number.isFinite(candidate))) throw new Error(`parameters.${key} must be a finite ${definition.type}`)
    if (typeof candidate === 'number' && definition.minimum !== undefined && candidate < definition.minimum) throw new Error(`parameters.${key} is below minimum`)
    if (typeof candidate === 'number' && definition.maximum !== undefined && candidate > definition.maximum) throw new Error(`parameters.${key} exceeds maximum`)
    if (typeof candidate === 'number' && definition.integer && !Number.isInteger(candidate)) throw new Error(`parameters.${key} must be an integer`)
    if (definition.enum && !definition.enum.includes(candidate as never)) throw new Error(`parameters.${key} is outside enum`)
    parameters[key] = candidate as ParameterValue
  }
  return parameters
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`
}

function fingerprint(profile: unknown): string {
  const hashes = [2166136261, 2246822519, 3266489917, 668265263]
  for (const unit of canonical(profile)) for (let index = 0; index < hashes.length; index += 1) hashes[index] = Math.imul(hashes[index] ^ (unit.charCodeAt(0) + index), 16777619 + index) >>> 0
  return hashes.map((hash) => hash.toString(16).padStart(8, '0').repeat(2)).join('')
}

function python(value: ParameterValue | undefined): string {
  if (value === undefined) return 'None'
  if (typeof value === 'boolean') return value ? 'True' : 'False'
  if (typeof value === 'number') return String(value)
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`
}

function renderPython(template: MethodConfigTemplate, config: ExecutableConfig): string {
  const lines = [`from ${template.importName} import ${template.constructor}`, '', `model = ${template.constructor}(`]
  for (const key of Object.keys(config.parameters).sort()) lines.push(`    ${key}=${python(config.parameters[key])},`)
  lines.push(')', 'result = model.fit_transform(adata)', `adata.obsm[${python(config.outputs.latent)}] = result.latent`)
  if (config.outputs.graph) lines.push(`adata.obsp[${python(config.outputs.graph)}] = result.graph`)
  if (config.outputs.pseudotime) lines.push(`adata.obs[${python(config.outputs.pseudotime)}] = result.pseudotime`)
  if (config.outputs.branch) lines.push(`adata.obs[${python(config.outputs.branch)}] = result.branch`)
  if (config.downstream.scFocus) lines.push(`run_scfocus(adata, latent_key=${python(config.downstream.scFocus.latentKey)}, branch_key=${python(config.downstream.scFocus.branchKey)}, contribution_output=${python(config.downstream.scFocus.contributionOutput)})`)
  if (config.downstream.scRL) lines.push(`run_scrl(adata, latent_key=${python(config.downstream.scRL.latentKey)}, pseudotime_key=${python(config.downstream.scRL.pseudotimeKey)}, decision_output=${python(config.downstream.scRL.decisionOutput)})`)
  return `${lines.join('\n')}\n`
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { for (const key of Reflect.ownKeys(value)) deepFreeze((value as Record<PropertyKey, unknown>)[key]); Object.freeze(value) }
  return value
}

export function compileConfig(input: CompileConfigInput): CompiledArtifacts {
  if (!Array.isArray(input.methods) || !Array.isArray(input.templates)) throw new Error('compileConfig requires complete canonical method and template registries')
  if (input.outcome.status !== 'OK') throw new Error('compileConfig requires a successful recommendation')
  const bestFits = input.outcome.recommendations.filter((recommendation) => recommendation.roles.includes('best_fit'))
  const selected = bestFits[0]?.methodId
  if (bestFits.length !== 1 || typeof selected !== 'string' || !selected) throw new Error('compileConfig requires one canonical best_fit recommendation')
  const methods = input.methods.map(parseMethod)
  const templates = input.templates.map(validateConfigTemplateRegistryEntry)
  const methodsById = new Map(methods.map((method) => [method.id, method]))
  const templatesById = new Map(templates.map((template) => [template.methodId, template]))
  if (methodsById.size !== methods.length) throw new Error('duplicate canonical method registry entry')
  if (templatesById.size !== templates.length) throw new Error('duplicate canonical template registry entry')
  if (methods.length === 0 || methods.length !== templates.length || methods.some((method) => !templatesById.has(method.id))) throw new Error('compileConfig requires complete canonical method and template registries')
  const method = methodsById.get(selected)
  const template = templatesById.get(selected)
  if (!method || !template) throw new Error('successful recommendation must name a canonical registry method and template')
  if (!method.executable) throw new Error(`method ${method.id} is not executable`)
  if (template.version !== method.version) throw new Error('template version does not match method version')
  if (!method.outputs.includes('latent') || !template.outputKeys.latent) throw new Error('executable method must declare a latent output')
  for (const key of Object.keys(template.outputKeys) as Array<keyof MethodConfigTemplate['outputKeys']>) if (!method.outputs.includes(key)) throw new Error(`template output ${key} is not registered for method`)
  const installCommand = validateInstall(method.id, method.installCommand, template.packageName)
  const downstream: ExecutableConfig['downstream'] = Object.create(null)
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
  const config: ExecutableConfig = { schemaVersion: '1.0', routerVersion: input.outcome.routerVersion, evidenceVersion: input.outcome.evidenceVersion, method: { id: method.id, version: method.version, install: installCommand }, preprocessing: { modality: input.profile.modality, normalization: 'library_size_log1p', featureSelection: 'highly_variable_features' }, parameters: validateParameters(template, input.parameters), outputs: template.outputKeys, downstream, provenance: { recommendationSeed: input.outcome.seed, methodSource: method.sourceUrl, generatedAt: input.generatedAt, profileFingerprint: fingerprint(input.profile), outcome: { status: 'OK', methodId: method.id } } }
  const serialized = serializeConfig(config)
  const stem = `${method.id}-${input.outcome.routerVersion}-seed-${input.outcome.seed}`
  return deepFreeze({ config: validateExecutableConfig(config), ...serialized, installCommand, pythonSnippet: renderPython(template, config), filenames: { json: `${stem}.json`, yaml: `${stem}.yaml`, python: `${stem}.py` } })
}
