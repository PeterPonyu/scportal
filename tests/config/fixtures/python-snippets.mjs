import { createCompilerEngine } from '../../../app/core/config/internal/compiler-engine.ts'
import { profileFingerprint } from '../../../app/core/router/release-digest.ts'
import { writeFileSync } from 'node:fs'

const profile = {
  id: 'python-syntax-fixture', modality: 'scrna', scale: '10k_50k', goals: ['latent_representation'], topology: 'linear', priors: {}, perturbation: false,
  weights: { latent_geometry: 1, continuity: 0, trajectory: 0, stability: 0, biology: 0, resources: 0 }, maxResourceTier: 2, minEffectiveDatasets: 1, minCriticalCoverage: 1, seed: 17,
}

function method(id, outputs) {
  return { id, aliases: [], version: '1.0.0', modalities: ['scrna'], maxScale: '10k_50k', outputs, requiredPriors: [], supportedGoals: ['latent_representation'], resourceTier: 1, installCommand: `python -m pip install ${id}==1.0.0`, license: 'MIT', sourceUrl: 'https://example.test/source', docsUrl: 'https://example.test/docs', paperUrl: 'https://example.test/paper', executable: true }
}

function wrapper(outputs) {
  const resultAttributes = {}
  for (const output of outputs) resultAttributes[output] = output
  return { fitMethod: 'fit_transform', input: 'adata', resultAttributes }
}

function getterWrapper(outputs) {
  const resultGetters = {}
  for (const output of outputs) resultGetters[output] = `get_${output}`
  return { style: 'constructor_fit_getter', fitMethod: 'fit', input: 'adata', resultGetters }
}

function adapter(name, extra) {
  return { packageName: name, packageVersion: '1.0.0', installCommand: `python -m pip install ${name}==1.0.0`, sourceUrl: `https://example.test/${name}`, importName: name, functionName: `run_${name}`, ...extra }
}

function template(entry, outputKeys, downstream, shape = wrapper) {
  return { methodId: entry.id, version: entry.version, synthetic: true, template: { outputs: entry.outputs, packageName: entry.id, packageVersion: entry.version, importName: entry.id.replace(/-/g, '_'), constructor: 'FixtureModel', wrapper: shape(entry.outputs), defaultParameters: {}, allowedParameters: {}, outputKeys, ...(downstream === undefined ? {} : { downstream }) } }
}

const fixtures = [
  (() => { const entry = method('latent-fixture', ['latent', 'metadata']); return [entry, template(entry, { latent: 'X_latent', metadata: 'metadata' })] })(),
  (() => { const entry = method('graph-fixture', ['latent', 'graph', 'metadata']); return [entry, template(entry, { latent: 'X_graph', graph: 'graph', metadata: 'metadata' })] })(),
  (() => { const entry = method('time-fixture', ['latent', 'pseudotime', 'metadata']); return [entry, template(entry, { latent: 'X_time', pseudotime: 'pt', metadata: 'metadata' }, { scRL: adapter('scrl', { decisionOutput: 'decision' }) })] })(),
  (() => { const entry = method('branch-fixture', ['latent', 'branch', 'metadata']); return [entry, template(entry, { latent: 'X_branch', branch: 'branch', metadata: 'metadata' }, { scFocus: adapter('scfocus', { contributionOutput: 'contribution' }) })] })(),
  (() => { const entry = method('getter-fixture', ['latent', 'metadata']); return [entry, template(entry, { latent: 'X_getter', metadata: 'metadata' }, undefined, getterWrapper)] })(),
]

function outcome(entry) {
  return {
    status: 'OK', seed: profile.seed, evidenceVersion: 'evidence-v1', routerVersion: 'router-v1',
    recommendations: [{
      methodId: entry.id, roles: ['best_fit'], paretoLayer: 0, outrankingFlow: 0.5, conservativeUtility: 0.5, confidence: 'high',
      topThreeRetention: 1, effectiveDatasets: 1, criticalCoverage: 1, positiveEvidence: ['fixture evidence'],
      positiveEvidenceDetails: [{ text: 'fixture evidence', group: 'latent_geometry', score: 0.8, baseline: 0.5, contribution: 0.3, direction: 'supports', metricIds: ['intrinsic_geometry'], datasetIds: ['fixture_dataset'], synthetic: true }],
      evidenceLinks: [{ paperId: 'fixture-paper', locator: 'table:S1', datasetId: 'fixture_dataset', metricId: 'intrinsic_geometry', datasetVersion: '1', methodVersion: '1.0.0', runConfigId: 'fixture-default', extractedAt: '2026-08-24T00:00:00Z', synthetic: true }],
      confidenceReasons: ['fixture confidence'], limitations: [], alternativeDispositions: [], excludedAlternatives: [],
    }],
    receipt: { profileFingerprint: profileFingerprint(profile), release: { id: 'evidence-v1', synthetic: true, description: 'Synthetic compiler fixture.', configDigest: 'c'.repeat(64), evidenceDigest: 'd'.repeat(64) } },
  }
}

let snippets = ''
for (const [entry, entryTemplate] of fixtures) {
  const compile = createCompilerEngine([entry], [entryTemplate])
  snippets += compile({ outcome: outcome(entry), profile, generatedAt: '2026-08-24T00:00:00.000Z' }).pythonSnippet
}
if (!process.argv[2]) throw new Error('output path is required')
writeFileSync(process.argv[2], snippets, 'utf8')
