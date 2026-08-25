import { stringify as stringifyYaml } from 'yaml'
import type { ExecutableConfig } from './types.ts'

function isOwnJson(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value !== 'object' || Array.isArray(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) return false
  return Reflect.ownKeys(value).every((key) => typeof key === 'string' && Object.hasOwn(value, key) && isOwnJson(Object.getOwnPropertyDescriptor(value, key)?.value))
}

export function validateExecutableConfig(value: unknown): ExecutableConfig {
  if (!isOwnJson(value)) throw new Error('executable config must contain only own finite JSON data')
  const config = value as ExecutableConfig
  if (config.schemaVersion !== '1.0' || !config.routerVersion || !config.evidenceVersion || !config.method?.id || !config.method.version || !config.method.install || !config.preprocessing?.modality || !config.preprocessing.normalization || !config.preprocessing.featureSelection || !config.outputs?.latent || !config.outputs.metadata || !config.provenance || !Number.isInteger(config.provenance.recommendationSeed) || config.provenance.recommendationSeed < 0 || config.provenance.recommendationSeed > 0xffffffff || !config.provenance.methodSource || !config.provenance.generatedAt || !/^[a-f0-9]{64}$/.test(config.provenance.profileFingerprint) || config.provenance.outcome?.status !== 'OK' || config.provenance.outcome.methodId !== config.method.id) throw new Error('executable config schema validation failed')
  if (config.downstream.scFocus && (!config.downstream.scFocus.latentKey || config.downstream.scFocus.latentKey !== config.outputs.latent || (config.downstream.scFocus.branchKey !== undefined && config.downstream.scFocus.branchKey !== config.outputs.branch))) throw new Error('scFocus handoff requires declared latent and branch outputs')
  if (config.downstream.scRL && (!config.downstream.scRL.latentKey || config.downstream.scRL.latentKey !== config.outputs.latent || !config.outputs.pseudotime || config.downstream.scRL.pseudotimeKey !== config.outputs.pseudotime)) throw new Error('scRL handoff requires declared latent and pseudotime outputs')
  return config
}

export function serializeConfig(value: ExecutableConfig): { json: string; yaml: string } {
  const config = validateExecutableConfig(value)
  return { json: JSON.stringify(config, null, 2), yaml: stringifyYaml(config) }
}
