import assert from 'node:assert/strict'
import test from 'node:test'

import { compileConfig, type CompileConfigInput } from '../../app/core/config/compiler.ts'

const method = {
  id: 'graph_contrastive', aliases: [], version: '1.0.0', modalities: ['scrna'], maxScale: 'gt_200k',
  outputs: ['latent', 'graph', 'metadata'], requiredPriors: [], supportedGoals: ['latent_representation', 'lineage_contribution'],
  resourceTier: 2, installCommand: 'python -m pip install graph-contrastive==1.0.0', license: 'MIT',
  sourceUrl: 'https://example.test/source', docsUrl: 'https://example.test/docs', paperUrl: 'https://example.test/paper', executable: true,
} as const

const template = {
  methodId: method.id, version: method.version, packageName: 'graph-contrastive', importName: 'graph_contrastive', constructor: 'GraphContrastive',
  defaultParameters: { epochs: 10, learningRate: 0.1, useGpu: false, label: "O'Reilly" },
  allowedParameters: {
    epochs: { type: 'number', minimum: 1, maximum: 100, integer: true },
    learningRate: { type: 'number', minimum: 0, maximum: 1 },
    useGpu: { type: 'boolean' },
    label: { type: 'string', enum: ["O'Reilly", 'default'] },
  },
  outputKeys: { latent: 'X_graph', graph: 'connectivities', metadata: 'graph_metadata' },
  downstream: { scFocus: { contributionOutput: 'lineage_contributions' } },
} as const

function input(overrides: Partial<CompileConfigInput> = {}): CompileConfigInput {
  return {
    outcome: { status: 'OK', recommendations: [{ methodId: method.id }], seed: 17, evidenceVersion: 'evidence-v1', routerVersion: 'router-v1' },
    method, profile: { id: 'quick', modality: 'scrna', scale: '10k_50k', goals: ['latent_representation'], topology: 'linear', priors: {}, perturbation: false, weights: { latent_geometry: 1, continuity: 0, trajectory: 0, stability: 0, biology: 0, resources: 0 }, maxResourceTier: 2, minEffectiveDatasets: 1, minCriticalCoverage: 1, seed: 17 },
    templates: [template], generatedAt: '2026-08-24T00:00:00.000Z', ...overrides,
  } as CompileConfigInput
}

test('compiles a successful recommendation through its canonical executable template', () => {
  const compiled = compileConfig(input({ parameters: { epochs: 20 } }))
  assert.equal(compiled.config.method.id, method.id)
  assert.equal(compiled.config.parameters.epochs, 20)
  assert.equal(compiled.config.parameters.learningRate, 0.1)
  assert.equal(compiled.config.provenance.recommendationSeed, 17)
  assert.equal(compiled.config.provenance.profileFingerprint.length, 64)
  assert.match(compiled.installCommand, /^python -m pip install graph-contrastive==1\.0\.0$/)
  assert.match(compiled.pythonSnippet, /from graph_contrastive import GraphContrastive/)
  assert.match(compiled.pythonSnippet, /model = GraphContrastive\(/)
  assert.match(compiled.pythonSnippet, /adata\.obsm\['X_graph'\]/)
  assert.match(compiled.pythonSnippet, /run_scfocus\(adata, latent_key='X_graph', branch_key=None, contribution_output='lineage_contributions'\)/)
  assert.doesNotMatch(compiled.pythonSnippet, /run_scrl/)
})

test('refuses missing latent, non-executable, missing recommendation, and template or version mismatches', () => {
  const cases: Array<[string, Partial<CompileConfigInput>, RegExp]> = [
    ['missing latent', { method: { ...method, outputs: ['graph', 'metadata'] } }, /latent/i],
    ['not executable', { method: { ...method, executable: false } }, /executable/i],
    ['no recommendation', { outcome: { status: 'REFUSED', code: 'INSUFFICIENT_EVIDENCE', candidates: [], evidenceGaps: [], seed: 17, evidenceVersion: 'evidence-v1', routerVersion: 'router-v1' } }, /successful recommendation/i],
    ['unregistered method', { templates: [{ ...template, methodId: 'other' }] }, /exactly one template/i],
    ['duplicate registry template', { templates: [template, structuredClone(template)] }, /exactly one template/i],
    ['version mismatch', { templates: [{ ...template, version: '9.9.9' }] }, /version/i],
  ]
  for (const [name, overrides, expected] of cases) assert.throws(() => compileConfig(input(overrides)), expected, name)
})

test('rejects unsafe commands and unsafe command/template token interpolation', () => {
  for (const installCommand of ['pip install a\nb', 'pip install a\rb', 'pip install `a`', 'pip install $(a)', 'pip install a; whoami', 'pip install a | whoami', 'pip install a > out']) {
    assert.throws(() => compileConfig(input({ method: { ...method, installCommand } })), /install command/i)
  }
  assert.throws(() => compileConfig(input({ templates: [{ ...template, packageName: 'bad;package' }] })), /packageName/i)
  assert.throws(() => compileConfig(input({ templates: [{ ...template, importName: 'bad.module' }] })), /importName/i)
})

test('accepts own, schema-valid parameter overrides and rejects inherited, unknown, undefined, polluted, nonfinite, ranged, integer, and enum values', () => {
  assert.equal(compileConfig(input({ parameters: Object.assign(Object.create(null), { epochs: 20 }) })).config.parameters.epochs, 20)
  const inherited = Object.create({ epochs: 20 })
  const cases: Array<[unknown, RegExp]> = [
    [inherited, /own/i],
    [{ unknown: 1 }, /unknown/i],
    [{ epochs: undefined }, /undefined/i],
    [Object.defineProperty(Object.create(null), '__proto__', { value: 1, enumerable: true }), /unsafe|unknown/i],
    [{ learningRate: Number.NaN }, /finite/i],
    [{ learningRate: 2 }, /maximum/i],
    [{ epochs: 1.5 }, /integer/i],
    [{ label: 'unexpected' }, /enum/i],
  ]
  for (const [parameters, expected] of cases) assert.throws(() => compileConfig(input({ parameters: parameters as Record<string, unknown> })), expected)
})

test('does not retain caller template or parameter mutations across concurrent compilations', async () => {
  const mutableTemplate = structuredClone(template)
  const mutableParameters = { epochs: 20 }
  const [first, second] = await Promise.all([
    Promise.resolve().then(() => compileConfig(input({ templates: [mutableTemplate], parameters: mutableParameters }))),
    Promise.resolve().then(() => compileConfig(input({ templates: [mutableTemplate], parameters: { epochs: 30 } }))),
  ])
  mutableParameters.epochs = 99
  mutableTemplate.defaultParameters.epochs = 99
  assert.equal(first.config.parameters.epochs, 20)
  assert.equal(second.config.parameters.epochs, 30)
  assert.equal(first.config.parameters.learningRate, 0.1)
})
