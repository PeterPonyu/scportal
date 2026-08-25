import { createCompilerEngine } from '../../../app/core/config/internal/compiler-engine.ts'

const profile = {
  id: 'python-syntax-fixture', modality: 'scrna', scale: '10k_50k', goals: ['latent_representation'], topology: 'linear', priors: {}, perturbation: false,
  weights: { latent_geometry: 1, continuity: 0, trajectory: 0, stability: 0, biology: 0, resources: 0 }, maxResourceTier: 2, minEffectiveDatasets: 1, minCriticalCoverage: 1, seed: 17,
}

function method(id, outputs) {
  return { id, aliases: [], version: '1.0.0', modalities: ['scrna'], maxScale: '10k_50k', outputs, requiredPriors: [], supportedGoals: ['latent_representation'], resourceTier: 1, installCommand: `python -m pip install ${id}==1.0.0`, license: 'MIT', sourceUrl: 'https://example.test/source', docsUrl: 'https://example.test/docs', paperUrl: 'https://example.test/paper', executable: true }
}

function template(entry, outputKeys, downstream) {
  return { methodId: entry.id, version: entry.version, synthetic: true, template: { outputs: entry.outputs, packageName: entry.id, importName: entry.id.replace(/-/g, '_'), constructor: 'FixtureModel', defaultParameters: {}, allowedParameters: {}, outputKeys, ...(downstream === undefined ? {} : { downstream }) } }
}

const fixtures = [
  (() => { const entry = method('latent-fixture', ['latent', 'metadata']); return [entry, template(entry, { latent: 'X_latent', metadata: 'metadata' })] })(),
  (() => { const entry = method('graph-fixture', ['latent', 'graph', 'metadata']); return [entry, template(entry, { latent: 'X_graph', graph: 'graph', metadata: 'metadata' })] })(),
  (() => { const entry = method('time-fixture', ['latent', 'pseudotime', 'metadata']); return [entry, template(entry, { latent: 'X_time', pseudotime: 'pt', metadata: 'metadata' }, { scRL: { decisionOutput: 'decision' } })] })(),
  (() => { const entry = method('branch-fixture', ['latent', 'branch', 'metadata']); return [entry, template(entry, { latent: 'X_branch', branch: 'branch', metadata: 'metadata' }, { scFocus: { contributionOutput: 'contribution' } })] })(),
]

for (const [entry, entryTemplate] of fixtures) {
  const compile = createCompilerEngine([entry], [entryTemplate])
  process.stdout.write(compile({ outcome: { status: 'OK', recommendations: [{ methodId: entry.id, roles: ['best_fit'], paretoLayer: 0, outrankingFlow: 0.5, conservativeUtility: 0.5, confidence: 'high', topThreeRetention: 1, effectiveDatasets: 1, criticalCoverage: 1, positiveEvidence: ['fixture'], positiveEvidenceDetails: [{ text: 'fixture', metricIds: [], datasetIds: [], synthetic: true }], evidenceLinks: [], limitations: [], excludedAlternatives: [] }], seed: 17, evidenceVersion: 'evidence-v1', routerVersion: 'router-v1' }, profile, generatedAt: '2026-08-24T00:00:00.000Z' }).pythonSnippet)
}
