import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { compileConfig, type CompileConfigInput } from '../../app/core/config/compiler.ts'
import { routeMethods } from '../../app/core/router/index.ts'

const dataDirectory = new URL('../../data/router/', import.meta.url)
const json = <T>(name: string): T => JSON.parse(readFileSync(new URL(name, dataDirectory), 'utf8')) as T

const method = {
  id: 'graph_contrastive', aliases: ['graph-contrastive'], version: '1.0.0', modalities: ['scrna'], maxScale: 'gt_200k',
  outputs: ['latent', 'graph', 'metadata'], requiredPriors: [], supportedGoals: ['latent_representation', 'lineage_contribution'],
  resourceTier: 2, installCommand: 'python -m pip install graph-contrastive==1.0.0', license: 'MIT',
  sourceUrl: 'https://example.test/source', docsUrl: 'https://example.test/docs', paperUrl: 'https://example.test/paper', executable: true,
} as const

const template = {
  methodId: method.id, version: method.version, synthetic: true,
  template: {
    outputs: ['latent', 'graph', 'metadata'], packageName: 'graph-contrastive', importName: 'graph_contrastive', constructor: 'GraphContrastive',
    defaultParameters: { epochs: 10, learningRate: 0.1, useGpu: false, label: "O'Reilly" },
    allowedParameters: {
      epochs: { type: 'number', minimum: 1, maximum: 100, integer: true },
      learningRate: { type: 'number', minimum: 0, maximum: 1 },
      useGpu: { type: 'boolean' }, label: { type: 'string', enum: ["O'Reilly", 'default'] },
    },
    outputKeys: { latent: 'X_graph', graph: 'connectivities', metadata: 'graph_metadata' },
    downstream: { scFocus: { contributionOutput: 'lineage_contributions' } },
  },
} as const

function input(overrides: Partial<CompileConfigInput> = {}): CompileConfigInput {
  return {
    outcome: { status: 'OK', recommendations: [{ methodId: method.id, roles: ['best_fit'] }], seed: 17, evidenceVersion: 'evidence-v1', routerVersion: 'router-v1' },
    profile: { id: 'quick', modality: 'scrna', scale: '10k_50k', goals: ['latent_representation'], topology: 'linear', priors: {}, perturbation: false, weights: { latent_geometry: 1, continuity: 0, trajectory: 0, stability: 0, biology: 0, resources: 0 }, maxResourceTier: 2, minEffectiveDatasets: 1, minCriticalCoverage: 1, seed: 17 },
    methods: [method], templates: [template], generatedAt: '2026-08-24T00:00:00.000Z', ...overrides,
  } as CompileConfigInput
}

test('compiles a successful recommendation through exactly one canonical registry method and wrapper template', () => {
  const compiled = compileConfig(input({ parameters: { epochs: 20 } }))
  assert.equal(compiled.config.method.id, method.id)
  assert.equal(compiled.config.parameters.epochs, 20)
  assert.equal(compiled.config.parameters.learningRate, 0.1)
  assert.equal(compiled.config.provenance.recommendationSeed, 17)
  assert.match(compiled.installCommand, /^python -m pip install graph-contrastive==1\.0\.0$/)
  assert.match(compiled.pythonSnippet, /from graph_contrastive import GraphContrastive/)
  assert.match(compiled.pythonSnippet, new RegExp(' {4}epochs=20,'))
  assert.match(compiled.pythonSnippet, /label='O\\'Reilly'/)
  assert.match(compiled.pythonSnippet, /adata\.obsm\['X_graph'\]/)
  assert.match(compiled.pythonSnippet, /run_scfocus\(adata, latent_key='X_graph', branch_key=None, contribution_output='lineage_contributions'\)/)
  assert.equal(Object.isFrozen(compiled), true)
  assert.equal(Object.isFrozen(compiled.config), true)
  assert.equal(Object.isFrozen(compiled.config.parameters), true)
  assert.throws(() => { (compiled.config.parameters as { epochs: number }).epochs = 99 }, /read only|frozen/i)
})

test('uses real data method and config-template registries without caller-selected capability objects', () => {
  const methods = json<Array<Record<string, unknown>>>('methods.json').map((entry) => ({ ...entry, executable: true }))
  const templates = json<Array<Record<string, unknown>>>('config-templates.json')
  const compiled = compileConfig(input({ methods, templates }))
  assert.equal(compiled.config.method.id, 'graph_contrastive')
  assert.equal(compiled.config.outputs.latent, 'X_graph')
})

test('compiles the canonical best-fit result from the real router and data registries', () => {
  const methods = json<Array<Record<string, unknown>>>('methods.json').map((entry) => ({ ...entry, executable: true }))
  const profile = json<Array<Record<string, unknown>>>('task-profiles.json').find((entry) => entry.id === 'quick_trajectory')!
  const outcome = routeMethods({ profile, methods, datasets: json('datasets.json'), metrics: json('metrics.json'), observations: json('observations.synthetic.json'), evidenceVersion: 'evidence-v1', routerVersion: 'router-v1', releaseSynthetic: true })
  assert.equal(outcome.status, 'OK')
  if (outcome.status !== 'OK') return
  const compiled = compileConfig(input({ outcome, profile: profile as CompileConfigInput['profile'], methods, templates: json('config-templates.json') }))
  assert.equal(compiled.config.method.id, outcome.recommendations.find((recommendation) => recommendation.roles.includes('best_fit'))!.methodId)
})

test('rejects aliases, forged or inherited registries, duplicates, and incomplete canonical registries', () => {
  const inheritedMethod = Object.create(method)
  const inheritedTemplate = Object.create(template)
  const cases: Array<[string, Partial<CompileConfigInput>, RegExp]> = [
    ['alias outcome', { outcome: { status: 'OK', recommendations: [{ methodId: 'graph-contrastive', roles: ['best_fit'] }], seed: 17, evidenceVersion: 'evidence-v1', routerVersion: 'router-v1' } }, /canonical|recommendation/i],
    ['forged method', { methods: [{ ...method, id: method.id, installCommand: 'python -m pip install forged==1.0.0' }] }, /registry|install|canonical/i],
    ['inherited method', { methods: [inheritedMethod] }, /own|plain/i],
    ['inherited template', { templates: [inheritedTemplate] }, /own|plain/i],
    ['duplicate method', { methods: [method, structuredClone(method)] }, /duplicate/i],
    ['duplicate template', { templates: [template, structuredClone(template)] }, /duplicate/i],
    ['incomplete methods', { methods: [] }, /complete|canonical/i],
    ['flattened template', { templates: [template.template] }, /wrapper|methodId|template/i],
  ]
  for (const [name, overrides, expected] of cases) assert.throws(() => compileConfig(input(overrides)), expected, name)
})

test('rejects unsafe commands, unsafe parameter names, and invalid parameter values', () => {
  for (const installCommand of ['pip install a\nb', 'pip install a\rb', 'pip install `a`', 'pip install $(a)', 'pip install a; whoami', 'pip install a | whoami', 'pip install a > out']) {
    assert.throws(() => compileConfig(input({ methods: [{ ...method, installCommand }] })), /install command/i)
  }
  const cases: Array<[unknown, RegExp]> = [
    [{ 'not-valid': 1 }, /identifier/i], [{ unknown: 1 }, /unknown/i], [{ epochs: undefined }, /undefined/i],
    [Object.defineProperty(Object.create(null), '__proto__', { value: 1, enumerable: true }), /unsafe|identifier/i],
    [{ learningRate: Number.NaN }, /finite/i], [{ learningRate: 2 }, /maximum/i], [{ epochs: 1.5 }, /integer/i], [{ label: 'unexpected' }, /enum/i],
  ]
  for (const [parameters, expected] of cases) assert.throws(() => compileConfig(input({ parameters: parameters as Record<string, unknown> })), expected)
})

test('does not retain caller registry or parameter mutations after compilation', () => {
  const mutableTemplate = structuredClone(template)
  const mutableParameters = { epochs: 20 }
  const compiled = compileConfig(input({ templates: [mutableTemplate], parameters: mutableParameters }))
  mutableTemplate.template.defaultParameters.epochs = 99
  mutableParameters.epochs = 99
  assert.equal(compiled.config.parameters.epochs, 20)
  assert.equal(compiled.config.parameters.learningRate, 0.1)
})
