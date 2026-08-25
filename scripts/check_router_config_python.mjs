import methods from '../data/router/methods.json' with { type: 'json' }
import templates from '../data/router/config-templates.json' with { type: 'json' }
import { createCompilerEngine } from '../app/core/config/internal/compiler-engine.ts'

const profile = {
  id: 'python-syntax-fixture', modality: 'scrna', scale: '10k_50k', goals: ['latent_representation'], topology: 'linear', priors: {}, perturbation: false,
  weights: { latent_geometry: 1, continuity: 0, trajectory: 0, stability: 0, biology: 0, resources: 0 }, maxResourceTier: 2, minEffectiveDatasets: 1, minCriticalCoverage: 1, seed: 17,
}
const executableMethods = methods.map((method) => ({ ...method, executable: true }))
const compileFixture = createCompilerEngine(executableMethods, templates)
const compiled = compileFixture({
  outcome: { status: 'OK', recommendations: [{ methodId: 'graph_contrastive', roles: ['best_fit'], paretoLayer: 0, outrankingFlow: 0.5, conservativeUtility: 0.5, confidence: 'high', topThreeRetention: 1, effectiveDatasets: 1, criticalCoverage: 1, positiveEvidence: ['fixture'], positiveEvidenceDetails: [{ text: 'fixture', metricIds: [], datasetIds: [], synthetic: true }], evidenceLinks: [], limitations: [], excludedAlternatives: [] }], seed: 17, evidenceVersion: 'evidence-v1', routerVersion: 'router-v1' },
  profile, generatedAt: '2026-08-24T00:00:00.000Z',
})
process.stdout.write(compiled.pythonSnippet)
