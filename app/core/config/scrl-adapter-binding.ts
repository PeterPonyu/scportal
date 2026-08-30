import { absoluteHttpUrl, ownDataRecord } from '../router/validation.ts'

export const SCRL_ADAPTER_PROTOCOL = 'scrl-adapter-v1' as const

const packageNamePattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
const packageVersionPattern = /^[A-Za-z0-9][A-Za-z0-9._+!-]*$/
const pythonIdentifierPattern = /^[A-Za-z_][A-Za-z0-9_]*$/
const pythonModulePattern = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/
const inputKeyOrder = ['latent', 'embedding', 'cluster', 'pseudotime'] as const
const outputKeyOrder = ['decision', 'metadata'] as const

export type ScrlInputKeyName = typeof inputKeyOrder[number]
export type ScrlOutputKeyName = typeof outputKeyOrder[number]
export type ScrlParameterValue = string | number | boolean

export interface ScrlAdapterBinding {
  protocol: typeof SCRL_ADAPTER_PROTOCOL
  bindingScope: 'source_tree'
  methodId: 'scRL'
  packageName: string
  packageVersion: string
  sourceUrl: string
  sourceModule: string
  functionName: string
  inputKeys: Record<ScrlInputKeyName, string>
  outputKeys: Record<ScrlOutputKeyName, string>
  parameters: Record<string, ScrlParameterValue>
}

export interface ScrlAdapterArtifact {
  binding: ScrlAdapterBinding
  status: 'source_bound'
  pythonSnippet: string
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim() || [...value].some((character) => {
    const code = character.charCodeAt(0)
    return code <= 0x1f || code === 0x7f
  })) throw new Error(`${label} must be a nonblank control-free string`)
  return value
}

function exact(record: Record<string, unknown>, label: string, fields: readonly string[]): void {
  const keys = Object.keys(record)
  if (keys.length !== fields.length || keys.some((key, index) => key !== fields[index])) {
    throw new Error(`${label} must declare exactly ${fields.join(', ')} in canonical order`)
  }
}

function freezeDeep<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const key of Reflect.ownKeys(value)) freezeDeep((value as Record<PropertyKey, unknown>)[key])
    Object.freeze(value)
  }
  return value
}

function parseKeyMap(value: unknown, label: string, fields: readonly string[]): Record<string, string> {
  const record = ownDataRecord(value, label)
  exact(record, label, fields)
  const parsed: Record<string, string> = {}
  for (const field of fields) parsed[field] = text(record[field], `${label}.${field}`)
  return parsed
}

function parseParameters(value: unknown): Record<string, ScrlParameterValue> {
  const record = ownDataRecord(value, 'scRL binding parameters')
  const parsed: Record<string, ScrlParameterValue> = {}
  for (const key of Object.keys(record).sort()) {
    if (!pythonIdentifierPattern.test(key)) throw new Error(`scRL binding parameter ${key} must be a Python identifier`)
    const parameter = record[key]
    if (typeof parameter === 'string') {
      parsed[key] = text(parameter, `scRL binding parameters.${key}`)
    } else if (typeof parameter === 'number' && Number.isFinite(parameter)) {
      parsed[key] = parameter
    } else if (typeof parameter === 'boolean') {
      parsed[key] = parameter
    } else {
      throw new Error(`scRL binding parameter ${key} must be a finite scalar`)
    }
  }

  const episodes = parsed.episodes
  if (typeof episodes !== 'number' || !Number.isInteger(episodes) || episodes < 10 || episodes % 10 !== 0) {
    throw new Error('scRL binding parameters.episodes must be a positive multiple of 10')
  }
  if (parsed.device !== undefined && (typeof parsed.device !== 'string' || !['auto', 'cpu', 'cuda'].includes(parsed.device))) {
    throw new Error('scRL binding parameters.device must be auto, cpu, or cuda')
  }
  if (parsed.seed !== undefined && (typeof parsed.seed !== 'number' || !Number.isInteger(parsed.seed) || parsed.seed < 0 || parsed.seed > 0xffffffff)) {
    throw new Error('scRL binding parameters.seed must be a uint32 integer')
  }
  return parsed
}

export function validateScrlAdapterBinding(value: unknown): ScrlAdapterBinding {
  const record = ownDataRecord(value, 'scRL adapter binding')
  exact(record, 'scRL adapter binding', [
    'protocol', 'bindingScope', 'methodId', 'packageName', 'packageVersion',
    'sourceUrl', 'sourceModule', 'functionName', 'inputKeys', 'outputKeys', 'parameters',
  ])
  if (record.protocol !== SCRL_ADAPTER_PROTOCOL) throw new Error('scRL adapter binding protocol is invalid')
  if (record.bindingScope !== 'source_tree') throw new Error('scRL adapter binding scope must be source_tree')
  if (record.methodId !== 'scRL') throw new Error('scRL adapter binding methodId must be scRL')
  const packageName = text(record.packageName, 'scRL adapter binding packageName')
  const packageVersion = text(record.packageVersion, 'scRL adapter binding packageVersion')
  const sourceUrl = text(record.sourceUrl, 'scRL adapter binding sourceUrl')
  const sourceModule = text(record.sourceModule, 'scRL adapter binding sourceModule')
  const functionName = text(record.functionName, 'scRL adapter binding functionName')
  if (!packageNamePattern.test(packageName) || !packageVersionPattern.test(packageVersion)) throw new Error('scRL adapter binding package identity is invalid')
  if (!absoluteHttpUrl(sourceUrl)) throw new Error('scRL adapter binding sourceUrl must be an absolute HTTP(S) URL')
  if (!pythonModulePattern.test(sourceModule) || !pythonIdentifierPattern.test(functionName)) throw new Error('scRL adapter binding Python module or callable is invalid')

  const inputKeys = parseKeyMap(record.inputKeys, 'scRL binding inputKeys', inputKeyOrder)
  const outputKeys = parseKeyMap(record.outputKeys, 'scRL binding outputKeys', outputKeyOrder)
  const parameters = parseParameters(record.parameters)
  return freezeDeep({
    protocol: SCRL_ADAPTER_PROTOCOL,
    bindingScope: 'source_tree' as const,
    methodId: 'scRL' as const,
    packageName,
    packageVersion,
    sourceUrl,
    sourceModule,
    functionName,
    inputKeys: freezeDeep(inputKeys) as Record<ScrlInputKeyName, string>,
    outputKeys: freezeDeep(outputKeys) as Record<ScrlOutputKeyName, string>,
    parameters: freezeDeep(parameters),
  })
}

function python(value: ScrlParameterValue | string): string {
  if (typeof value === 'boolean') return value ? 'True' : 'False'
  if (typeof value === 'number') return String(value)
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

export function compileScrlAdapterBinding(value: unknown): ScrlAdapterArtifact {
  const binding = validateScrlAdapterBinding(value)
  const inputLines = inputKeyOrder.map((name) => `  ${name === 'pseudotime' ? 'pseudotime_key' : `${name}_key`}=${python(binding.inputKeys[name])},`)
  const parameterLines = Object.keys(binding.parameters).sort().map((name) => `  ${name}=${python(binding.parameters[name])},`)
  const snippet = [
    `from ${binding.sourceModule} import ${binding.functionName}`,
    '',
    `adapter = ${binding.functionName}(`,
    '  adata,',
    ...inputLines,
    ...parameterLines,
    ')',
    `adata.obs[${python(binding.outputKeys.decision)}] = adapter.get_state_value()`,
    `adata.uns[${python(binding.outputKeys.metadata)}] = adapter.metadata`,
    '',
  ].join('\n')
  return freezeDeep({ binding, status: 'source_bound' as const, pythonSnippet: snippet })
}
