import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { compileConfig, type CompileConfigInput } from '../../app/core/config/compiler.ts'
import { createFixtureCompiler, fixtureCompiler, fixtureInput, fixtureOutcome, fixtureProfile } from './helpers/compiler.ts'

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

const input = fixtureInput

test('compiles a successful recommendation through exactly one canonical registry method and wrapper template', () => {
  const compiled = fixtureCompiler(input({ parameters: { epochs: 20 } }))
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

test('public compiler fails closed against the exact canonical release because every canonical method is non-executable', () => {
  assert.throws(() => compileConfig(input()), /not executable/i)
})

test('public compiler exposes neither a fixture issuer nor raw registry injection', () => {
  const compilerSource = readFileSync(new URL('../../app/core/config/compiler.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(compilerSource, /createUnitFixtureReleaseRegistry|issueRegistry|TrustedReleaseRegistry/)
  assert.throws(() => compileConfig({ ...input(), releaseRegistry: {} } as never), /unknown|missing/i)
})

test('rejects malformed own-data router outcomes and task profiles before filename construction', () => {
  const sparse = new Array(1)
  const cases: Array<[Partial<CompileConfigInput>, RegExp]> = [
    [{ outcome: { ...fixtureOutcome, recommendations: sparse } as never }, /dense|recommendations/i],
    [{ outcome: { ...fixtureOutcome, routerVersion: 'router version' } }, /safe token/i],
    [{ outcome: { ...fixtureOutcome, recommendations: [{ ...fixtureOutcome.recommendations[0], roles: ['not-a-role'] }] } as never }, /roles/i],
    [{ profile: { ...fixtureProfile, goals: [] } }, /goals/i],
    [{ profile: { ...fixtureProfile, weights: { latent_geometry: 0, continuity: 0, trajectory: 0, stability: 0, biology: 0, resources: 0 } } }, /positive sum/i],
    [{ profile: { ...fixtureProfile, minEffectiveDatasets: 0 } }, /minEffectiveDatasets/i],
    [{ profile: { ...fixtureProfile, minCriticalCoverage: 1.1 } }, /minCriticalCoverage/i],
    [{ profile: { ...fixtureProfile, seed: -1 } }, /seed/i],
  ]
  for (const [overrides, expected] of cases) assert.throws(() => fixtureCompiler(input(overrides)), expected)
})

test('rejects aliases, forged handles, and untrusted registry construction', () => {
  const cases: Array<[string, Partial<CompileConfigInput>, RegExp]> = [
    ['alias outcome', { outcome: { status: 'OK', recommendations: [{ methodId: 'graph-contrastive', roles: ['best_fit'] }], seed: 17, evidenceVersion: 'evidence-v1', routerVersion: 'router-v1' } }, /canonical|recommendation/i],
    ['forged input registry', { releaseRegistry: { methods: [method], templates: [template] } as never }, /unknown|missing/i],
  ]
  for (const [name, overrides, expected] of cases) assert.throws(() => fixtureCompiler(input(overrides)), expected, name)
  for (const [name, methods, templates] of [
    ['inherited method', [Object.create(method)], [template]],
    ['inherited template', [method], [Object.create(template)]],
    ['duplicate method', [method, structuredClone(method)], [template]],
    ['duplicate template', [method], [template, structuredClone(template)]],
    ['case-insensitive alias collision', [{ ...method, aliases: ['GRAPH_CONTRASTIVE'] }], [template]],
    ['sparse methods', Object.assign(new Array(1), {}), [template]],
  ] as const) assert.throws(() => createFixtureCompiler(methods, templates), /own|plain|duplicate|dense|canonical|complete/i, name)
})

test('rejects unsafe commands, unsafe parameter names, and invalid parameter values', () => {
  for (const installCommand of ['pip install a\nb', 'pip install a\rb', 'pip install `a`', 'pip install $(a)', 'pip install a; whoami', 'pip install a | whoami', 'pip install a > out']) {
    assert.throws(() => createFixtureCompiler([{ ...method, installCommand }], [template])(input()), /install|control|unsafe/i)
  }
  const cases: Array<[unknown, RegExp]> = [
    [{ 'not-valid': 1 }, /invalid/i], [{ unknown: 1 }, /invalid/i], [{ epochs: undefined }, /invalid/i],
    [Object.defineProperty(Object.create(null), '__proto__', { value: 1, enumerable: true }), /unsafe|identifier|invalid/i],
    [{ learningRate: Number.NaN }, /invalid/i], [{ learningRate: 2 }, /invalid/i], [{ epochs: 1.5 }, /invalid/i], [{ label: 'unexpected' }, /invalid/i],
  ]
  for (const [parameters, expected] of cases) assert.throws(() => fixtureCompiler(input({ parameters: parameters as Record<string, unknown> })), expected)
})

test('does not retain caller registry or parameter mutations after compilation', () => {
  const mutableTemplate = structuredClone(template)
  const mutableParameters = { epochs: 20 }
  const compiler = fixtureCompiler
  const compiled = compiler(input({ parameters: mutableParameters }))
  mutableTemplate.template.defaultParameters.epochs = 99
  mutableParameters.epochs = 99
  assert.equal(compiled.config.parameters.epochs, 20)
  assert.equal(compiled.config.parameters.learningRate, 0.1)
})
