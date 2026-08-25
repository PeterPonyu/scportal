import canonicalMethods from '../../../data/router/methods.json' with { type: 'json' }
import canonicalTemplates from '../../../data/router/config-templates.json' with { type: 'json' }
import { createCompilerEngine } from './internal/compiler-engine.ts'
import type { CompileConfigInput, CompiledArtifacts } from './types.ts'

const compileCanonicalRelease = createCompilerEngine(canonicalMethods, canonicalTemplates)

export function compileConfig(input: CompileConfigInput): CompiledArtifacts {
  return compileCanonicalRelease(input)
}

export type { CompileConfigInput, CompiledArtifacts }
