import type { Modality, RouterOutcome, TaskProfile } from '../router/types.ts'

export type ParameterValue = string | number | boolean
export type ParameterDefinition = { type: 'string' | 'number' | 'boolean'; minimum?: number; maximum?: number; integer?: boolean; enum?: ParameterValue[] }
export type OutputName = 'latent' | 'graph' | 'pseudotime' | 'branch' | 'metadata'
export type AdapterName = 'scFocus' | 'scRL'
export interface AdapterProvenance { packageName: string; packageVersion: string; installCommand: string; sourceUrl: string; importName: string; functionName: string }

export interface MethodConfigTemplate {
  methodId: string
  version: string
  packageName: string
  packageVersion: string
  importName: string
  constructor: string
  outputs: OutputName[]
  wrapper: { fitMethod: string; input: 'adata'; resultAttributes: Partial<Record<OutputName, string>> }
  defaultParameters: Record<string, ParameterValue>
  allowedParameters: Record<string, ParameterDefinition>
  outputKeys: { latent: string; graph?: string; pseudotime?: string; branch?: string; metadata: string }
  downstream?: {
    scFocus?: AdapterProvenance & { contributionOutput: string; branchKey?: string }
    scRL?: AdapterProvenance & { decisionOutput: string; pseudotimeKey?: string }
  }
}

export interface ExecutableConfig {
  schemaVersion: '1.0'
  routerVersion: string
  evidenceVersion: string
  method: { id: string; version: string; packageName: string; packageVersion: string; install: string }
  preprocessing: { modality: Modality; normalization: string; featureSelection: string }
  parameters: Record<string, ParameterValue>
  outputs: MethodConfigTemplate['outputKeys']
  downstream: {
    scFocus?: AdapterProvenance & { latentKey: string; branchKey?: string; contributionOutput: string }
    scRL?: AdapterProvenance & { latentKey: string; pseudotimeKey: string; decisionOutput: string }
  }
  provenance: { recommendationSeed: number; methodSource: string; generatedAt: string; profileFingerprint: string; release: { id: string; synthetic: boolean; configDigest: string; evidenceDigest: string }; outcome: { status: 'OK'; methodId: string } }
}

export interface CompiledArtifacts {
  config: ExecutableConfig
  json: string
  yaml: string
  installCommand: string
  installCommands: string[]
  pythonSnippet: string
  filenames: { json: string; yaml: string; python: string }
}

export interface CompileConfigInput {
  outcome: RouterOutcome
  profile: TaskProfile
  role?: 'best_fit' | 'robust_alternative' | 'resource_aware'
  adapters?: AdapterName[]
  parameters?: Record<string, unknown>
  generatedAt: string
}
