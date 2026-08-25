import { createCompilerEngine, sha256Hex } from '../../../app/core/config/internal/compiler-engine.ts'
import type { CompileConfigInput, MethodConfigTemplate } from '../../../app/core/config/types.ts'
import type { MethodCapability, RouterOutcome, TaskProfile } from '../../../app/core/router/types.ts'

export const fixtureMethod: MethodCapability = {
  id: 'graph_contrastive', aliases: ['graph-contrastive'], version: '1.0.0', modalities: ['scrna'], maxScale: 'gt_200k',
  outputs: ['latent', 'graph', 'metadata'], requiredPriors: [], supportedGoals: ['latent_representation', 'lineage_contribution'],
  resourceTier: 2, installCommand: 'python -m pip install graph-contrastive==1.0.0', license: 'MIT',
  sourceUrl: 'https://example.test/source', docsUrl: 'https://example.test/docs', paperUrl: 'https://example.test/paper', executable: true,
}

export const fixtureTemplate: MethodConfigTemplate = {
  methodId: fixtureMethod.id, version: fixtureMethod.version, packageName: 'graph-contrastive', packageVersion: '1.0.0', importName: 'graph_contrastive', constructor: 'GraphContrastive',
  outputs: ['latent', 'graph', 'metadata'],
  wrapper: { fitMethod: 'fit_transform', input: 'adata', resultAttributes: { latent: 'latent', graph: 'graph', metadata: 'metadata' } },
  defaultParameters: { epochs: 10, learningRate: 0.1, useGpu: false, label: "O'Reilly" },
  allowedParameters: {
    epochs: { type: 'number', minimum: 1, maximum: 100, integer: true }, learningRate: { type: 'number', minimum: 0, maximum: 1 },
    useGpu: { type: 'boolean' }, label: { type: 'string', enum: ["O'Reilly", 'default'] },
  },
  outputKeys: { latent: 'X_graph', graph: 'connectivities', metadata: 'graph_metadata' },
  downstream: { scFocus: { packageName: 'scfocus', packageVersion: '1.0.0', installCommand: 'python -m pip install scfocus==1.0.0', sourceUrl: 'https://example.test/scfocus', importName: 'scfocus', functionName: 'run_scfocus', contributionOutput: 'lineage_contributions' } },
}

export const fixtureProfile: TaskProfile = {
  id: 'quick', modality: 'scrna', scale: '10k_50k', goals: ['latent_representation'], topology: 'linear', priors: {}, perturbation: false,
  weights: { latent_geometry: 1, continuity: 0, trajectory: 0, stability: 0, biology: 0, resources: 0 }, maxResourceTier: 2,
  minEffectiveDatasets: 1, minCriticalCoverage: 1, seed: 17,
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map((key) => [key, canonical((value as Record<string, unknown>)[key])]))
  return value
}

export function fixtureReceiptForProfile(profile: TaskProfile) {
  return {
  profileFingerprint: sha256Hex(JSON.stringify(canonical({ ...profile, goals: [...profile.goals].sort(), ...(profile.candidateMethodIds === undefined ? {} : { candidateMethodIds: [...profile.candidateMethodIds].sort() }) }))),
  release: { id: 'evidence-v1', synthetic: true, description: 'Synthetic compiler fixture.', configDigest: 'c'.repeat(64), evidenceDigest: 'd'.repeat(64) },
  }
}

export function fixtureOutcomeForProfile(profile: TaskProfile): RouterOutcome {
  return { ...structuredClone(fixtureOutcome), seed: profile.seed, receipt: fixtureReceiptForProfile(profile) }
}

export const fixtureOutcome: RouterOutcome = {
  status: 'OK', seed: 17, evidenceVersion: 'evidence-v1', routerVersion: 'router-v1', recommendations: [{
    methodId: fixtureMethod.id, roles: ['best_fit'], paretoLayer: 0, outrankingFlow: 0.5, conservativeUtility: 0.5, confidence: 'high',
    topThreeRetention: 1, effectiveDatasets: 1, criticalCoverage: 1, positiveEvidence: ['fixture evidence'],
    positiveEvidenceDetails: [{ text: 'fixture evidence', group: 'latent_geometry', score: 0.8, baseline: 0.5, contribution: 0.3, direction: 'supports', metricIds: ['intrinsic_geometry'], datasetIds: ['fixture_dataset'], synthetic: true }],
    evidenceLinks: [{ paperId: 'fixture-paper', locator: 'table:S1', datasetId: 'fixture_dataset', metricId: 'intrinsic_geometry', datasetVersion: '1', methodVersion: '1.0.0', runConfigId: 'fixture-default', extractedAt: '2026-08-24T00:00:00Z', synthetic: true }],
    confidenceReasons: ['fixture confidence'], limitations: [], alternativeDispositions: [], excludedAlternatives: [],
  }], receipt: fixtureReceiptForProfile(fixtureProfile),
}

export const fixtureCompiler = createCompilerEngine([fixtureMethod], [{ methodId: fixtureTemplate.methodId, version: fixtureTemplate.version, synthetic: true, template: { outputs: fixtureTemplate.outputs, packageName: fixtureTemplate.packageName, packageVersion: fixtureTemplate.packageVersion, importName: fixtureTemplate.importName, constructor: fixtureTemplate.constructor, wrapper: fixtureTemplate.wrapper, defaultParameters: fixtureTemplate.defaultParameters, allowedParameters: fixtureTemplate.allowedParameters, outputKeys: fixtureTemplate.outputKeys, downstream: fixtureTemplate.downstream } }])

export function createFixtureCompiler(methods: readonly unknown[], templates: readonly unknown[]) {
  return createCompilerEngine(methods, templates)
}

export function fixtureInput(overrides: Partial<CompileConfigInput> = {}): CompileConfigInput {
  return { outcome: fixtureOutcome, profile: fixtureProfile, generatedAt: '2026-08-24T00:00:00.000Z', ...overrides }
}
