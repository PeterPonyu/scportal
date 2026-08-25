import type { Modality, RouterOutcome, TaskProfile } from '../router/types.ts'

export type ParameterValue = string | number | boolean
export type ParameterDefinition = { type: 'string' | 'number' | 'boolean'; minimum?: number; maximum?: number; integer?: boolean; enum?: ParameterValue[] }

export interface MethodConfigTemplate {
  methodId: string
  version: string
  packageName: string
  importName: string
  constructor: string
  defaultParameters: Record<string, ParameterValue>
  allowedParameters: Record<string, ParameterDefinition>
  outputKeys: { latent: string; graph?: string; pseudotime?: string; branch?: string; metadata: string }
  downstream?: { scFocus?: { contributionOutput: string; branchKey?: string }; scRL?: { decisionOutput: string; pseudotimeKey?: string } }
}

export interface ExecutableConfig {
  schemaVersion: '1.0'
  routerVersion: string
  evidenceVersion: string
  method: { id: string; version: string; install: string }
  preprocessing: { modality: Modality; normalization: string; featureSelection: string }
  parameters: Record<string, ParameterValue>
  outputs: MethodConfigTemplate['outputKeys']
  downstream: { scFocus?: { latentKey: string; branchKey?: string; contributionOutput: string }; scRL?: { latentKey: string; pseudotimeKey?: string; decisionOutput: string } }
  provenance: { recommendationSeed: number; methodSource: string; generatedAt: string; profileFingerprint: string; outcome: { status: 'OK'; methodId: string } }
}

export interface CompiledArtifacts {
  config: ExecutableConfig
  json: string
  yaml: string
  installCommand: string
  pythonSnippet: string
  filenames: { json: string; yaml: string; python: string }
}

export interface CompileConfigInput {
  outcome: RouterOutcome
  profile: TaskProfile
  parameters?: Record<string, unknown>
  generatedAt: string
}
