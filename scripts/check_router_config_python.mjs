import methods from '../data/router/methods.json' with { type: 'json' }
import templates from '../data/router/config-templates.json' with { type: 'json' }
import { compileConfig, createUnitFixtureReleaseRegistry } from '../app/core/config/compiler.ts'

const profile = {
  id: 'python-syntax-fixture', modality: 'scrna', scale: '10k_50k', goals: ['latent_representation'], topology: 'linear', priors: {}, perturbation: false,
  weights: { latent_geometry: 1, continuity: 0, trajectory: 0, stability: 0, biology: 0, resources: 0 }, maxResourceTier: 2, minEffectiveDatasets: 1, minCriticalCoverage: 1, seed: 17,
}
const executableMethods = methods.map((method) => ({ ...method, executable: true }))
const compiled = compileConfig({
  outcome: { status: 'OK', recommendations: [{ methodId: 'graph_contrastive', roles: ['best_fit'] }], seed: 17, evidenceVersion: 'evidence-v1', routerVersion: 'router-v1' },
  profile, releaseRegistry: createUnitFixtureReleaseRegistry(executableMethods, templates), generatedAt: '2026-08-24T00:00:00.000Z',
})
process.stdout.write(compiled.pythonSnippet)
