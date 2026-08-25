import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { compileConfig, type CompileConfigInput } from '../../app/core/config/compiler.ts'
import { sha256Hex } from '../../app/core/config/internal/compiler-engine.ts'
import { createFixtureCompiler, fixtureCompiler, fixtureInput, fixtureOutcome, fixtureOutcomeForProfile, fixtureProfile } from './helpers/compiler.ts'

const method = {
  id: 'graph_contrastive', aliases: ['graph-contrastive'], version: '1.0.0', modalities: ['scrna'], maxScale: 'gt_200k',
  outputs: ['latent', 'graph', 'metadata'], requiredPriors: [], supportedGoals: ['latent_representation', 'lineage_contribution'],
  resourceTier: 2, installCommand: 'python -m pip install graph-contrastive==1.0.0', license: 'MIT',
  sourceUrl: 'https://example.test/source', docsUrl: 'https://example.test/docs', paperUrl: 'https://example.test/paper', executable: true,
} as const

const template = {
  methodId: method.id, version: method.version, synthetic: true,
  template: {
    outputs: ['latent', 'graph', 'metadata'], packageName: 'graph-contrastive', packageVersion: '1.0.0', importName: 'graph_contrastive', constructor: 'GraphContrastive',
    wrapper: { fitMethod: 'fit_transform', input: 'adata', resultAttributes: { latent: 'latent', graph: 'graph', metadata: 'metadata' } },
    defaultParameters: { epochs: 10, learningRate: 0.1, useGpu: false, label: "O'Reilly" },
    allowedParameters: {
      epochs: { type: 'number', minimum: 1, maximum: 100, integer: true },
      learningRate: { type: 'number', minimum: 0, maximum: 1 },
      useGpu: { type: 'boolean' }, label: { type: 'string', enum: ["O'Reilly", 'default'] },
    },
    outputKeys: { latent: 'X_graph', graph: 'connectivities', metadata: 'graph_metadata' },
    downstream: { scFocus: { packageName: 'scfocus', packageVersion: '1.0.0', installCommand: 'python -m pip install scfocus==1.0.0', sourceUrl: 'https://example.test/scfocus', importName: 'scfocus', functionName: 'run_scfocus', contributionOutput: 'lineage_contributions' } },
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
  assert.match(compiled.pythonSnippet, /adata\.uns\['graph_metadata'\] = result\.metadata/)
  assert.doesNotMatch(compiled.pythonSnippet, /run_scfocus/)
  assert.deepEqual(Object.keys(compiled.config.downstream), [])
  assert.equal(Object.isFrozen(compiled), true)
  assert.equal(Object.isFrozen(compiled.config), true)
  assert.equal(Object.isFrozen(compiled.config.parameters), true)
  assert.throws(() => { (compiled.config.parameters as { epochs: number }).epochs = 99 }, /read only|frozen/i)
})

test('selects any verified recommendation role and invokes only explicitly requested pinned adapters', () => {
  const outcome = structuredClone(fixtureOutcome)
  outcome.recommendations[0].roles = ['best_fit', 'robust_alternative', 'resource_aware']
  const compiled = fixtureCompiler(input({ outcome, role: 'resource_aware', adapters: ['scFocus'] }))

  assert.match(compiled.pythonSnippet, /from scfocus import run_scfocus/)
  assert.match(compiled.pythonSnippet, /run_scfocus\(adata, latent_key='X_graph', branch_key=None, contribution_output='lineage_contributions'\)/)
  assert.equal(compiled.config.downstream.scFocus?.packageVersion, '1.0.0')
  assert.equal(compiled.config.downstream.scFocus?.sourceUrl, 'https://example.test/scfocus')
  assert.deepEqual(compiled.installCommands, [
    'python -m pip install graph-contrastive==1.0.0',
    'python -m pip install scfocus==1.0.0',
  ])
})

test('drives invocation and every result extraction from the validated declarative wrapper', () => {
  const declarative = {
    ...template,
    template: {
      ...template.template,
      wrapper: { fitMethod: 'run_model', input: 'adata', resultAttributes: { latent: 'embedding', graph: 'network', metadata: 'run_metadata' } },
    },
  }
  const snippet = createFixtureCompiler([method], [declarative])(input()).pythonSnippet

  assert.match(snippet, /result = model\.run_model\(adata\)/)
  assert.match(snippet, /adata\.obsm\['X_graph'\] = result\.embedding/)
  assert.match(snippet, /adata\.obsp\['connectivities'\] = result\.network/)
  assert.match(snippet, /adata\.uns\['graph_metadata'\] = result\.run_metadata/)
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

test('accepts fractional Kish effective dataset counts from a successful Router recommendation', () => {
  const outcome = structuredClone(fixtureOutcome)
  outcome.recommendations[0].effectiveDatasets = 2.7010225612725214

  assert.doesNotThrow(() => fixtureCompiler(input({ outcome })))
})

test('rejects an outcome mixed with a profile that has a different seed or hard capabilities', () => {
  assert.throws(
    () => fixtureCompiler(input({ profile: { ...fixtureProfile, seed: fixtureProfile.seed + 1 } })),
    /seed|profile|receipt/i,
  )
  assert.throws(
    () => fixtureCompiler(input({
      profile: { ...fixtureProfile, goals: ['trajectory_reconstruction'] },
    })),
    /capability|compatible|goal|receipt/i,
  )
  assert.throws(
    () => fixtureCompiler(input({ profile: { ...fixtureProfile, topology: 'mixed' } })),
    /profile|receipt|fingerprint/i,
  )
})

test('rejects aliases, forged handles, and untrusted registry construction', () => {
  const cases: Array<[string, Partial<CompileConfigInput>, RegExp]> = [
    ['alias outcome', { outcome: { ...structuredClone(fixtureOutcome), recommendations: [{ ...fixtureOutcome.recommendations[0], methodId: 'graph-contrastive' }] } }, /canonical|recommendation/i],
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

  assert.throws(
    () => createFixtureCompiler(
      [{ ...method, id: 'constructor', aliases: [] }],
      [{ ...template, methodId: 'constructor' }],
    ),
    /canonical|unsafe|identity/i,
  )
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

test('binds provenance to a deterministic SHA-256 fingerprint of the normalized profile', () => {
  assert.equal(sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  const profileWithSets = {
    ...fixtureProfile,
    goals: ['latent_representation', 'lineage_contribution'],
    candidateMethodIds: ['graph_contrastive', 'a_method'],
  } as typeof fixtureProfile & { candidateMethodIds: string[] }
  const original = fixtureCompiler(input({ profile: profileWithSets, outcome: fixtureOutcomeForProfile(profileWithSets) })).config.provenance.profileFingerprint
  const reordered = fixtureCompiler(input({
    profile: {
      ...Object.fromEntries(Object.entries(profileWithSets).reverse()),
      goals: [...profileWithSets.goals].reverse(),
      candidateMethodIds: [...profileWithSets.candidateMethodIds].reverse(),
    } as typeof profileWithSets,
    outcome: fixtureOutcomeForProfile({ ...Object.fromEntries(Object.entries(profileWithSets).reverse()), goals: [...profileWithSets.goals].reverse(), candidateMethodIds: [...profileWithSets.candidateMethodIds].reverse() } as typeof profileWithSets),
  })).config.provenance.profileFingerprint
  const changedProfile = { ...profileWithSets, candidateMethodIds: ['graph_contrastive', 'different_method'] }
  const changed = fixtureCompiler(input({ profile: changedProfile, outcome: fixtureOutcomeForProfile(changedProfile) })).config.provenance.profileFingerprint

  assert.match(original, /^[a-f0-9]{64}$/)
  assert.equal(reordered, original)
  assert.notEqual(changed, original)
})

test('writes every declared result shape before complete downstream adapters', () => {
  const completeMethod = { ...method, outputs: ['latent', 'graph', 'pseudotime', 'branch', 'metadata'] }
  const completeTemplate = {
    ...template,
    template: {
      ...template.template,
      outputs: ['latent', 'graph', 'pseudotime', 'branch', 'metadata'],
      wrapper: { ...template.template.wrapper, resultAttributes: { latent: 'latent', graph: 'graph', pseudotime: 'pseudotime', branch: 'branch', metadata: 'metadata' } },
      outputKeys: { latent: 'X_complete', graph: 'graph', pseudotime: 'pt', branch: 'branch', metadata: 'metadata' },
      downstream: {
        scFocus: { ...template.template.downstream.scFocus, branchKey: 'branch', contributionOutput: 'contribution' },
        scRL: { packageName: 'scrl', packageVersion: '1.0.0', installCommand: 'python -m pip install scrl==1.0.0', sourceUrl: 'https://example.test/scrl', importName: 'scrl', functionName: 'run_scrl', pseudotimeKey: 'pt', decisionOutput: 'decision' },
      },
    },
  }
  const snippet = createFixtureCompiler([completeMethod], [completeTemplate])(input({ adapters: ['scFocus', 'scRL'] })).pythonSnippet

  assert.match(snippet, /adata\.obsm\['X_complete'\] = result\.latent/)
  assert.match(snippet, /adata\.obsp\['graph'\] = result\.graph/)
  assert.match(snippet, /adata\.obs\['pt'\] = result\.pseudotime/)
  assert.match(snippet, /adata\.obs\['branch'\] = result\.branch/)
  assert.ok(snippet.indexOf("adata.obsm['X_complete']") < snippet.lastIndexOf('run_scfocus'))
  assert.ok(snippet.indexOf("adata.obs['pt']") < snippet.lastIndexOf('run_scrl'))
})

test('rejects duplicate normalized compiler inputs and mismatched output contracts', () => {
  const cases: Array<[string, readonly unknown[], readonly unknown[], Partial<CompileConfigInput>, RegExp]> = [
    ['duplicate roles', [method], [template], { outcome: { ...fixtureOutcome, recommendations: [{ ...fixtureOutcome.recommendations[0], roles: ['best_fit', 'best_fit'] }] } as never }, /duplicate|roles/i],
    ['duplicate profile goals', [method], [template], { profile: { ...fixtureProfile, goals: ['latent_representation', 'latent_representation'] } as never }, /duplicate|goals/i],
    ['duplicate candidates', [method], [template], { profile: { ...fixtureProfile, candidateMethodIds: [method.id, method.id] } }, /duplicate|candidate/i],
    ['duplicate aliases', [{ ...method, aliases: ['same', 'same'] }], [template], {}, /duplicate|aliases/i],
    ['duplicate method outputs', [{ ...method, outputs: ['latent', 'latent', 'metadata'] }], [template], {}, /duplicate|outputs/i],
    ['duplicate method modalities', [{ ...method, modalities: ['scrna', 'scrna'] }], [template], {}, /duplicate|modalities/i],
    ['duplicate method priors', [{ ...method, requiredPriors: ['time', 'time'] }], [template], {}, /duplicate|priors/i],
    ['duplicate method goals', [{ ...method, supportedGoals: ['latent_representation', 'latent_representation'] }], [template], {}, /duplicate|goals/i],
    ['reordered method outputs', [{ ...method, outputs: ['metadata', 'latent', 'graph'] }], [template], {}, /output|order|match/i],
    ['reordered wrapper outputs', [method], [{ ...template, template: { ...template.template, outputs: ['metadata', 'latent', 'graph'] } }], {}, /output|order|match/i],
    ['reordered output keys', [method], [{ ...template, template: { ...template.template, outputKeys: { metadata: 'graph_metadata', latent: 'X_graph', graph: 'connectivities' } } }], {}, /output|order/i],
    ['duplicate evidence metric IDs', [method], [template], { outcome: { ...fixtureOutcome, recommendations: [{ ...fixtureOutcome.recommendations[0], positiveEvidenceDetails: [{ ...fixtureOutcome.recommendations[0].positiveEvidenceDetails[0], metricIds: ['intrinsic_geometry', 'intrinsic_geometry'] }] }] } as never }, /duplicate|metricIds/i],
    ['duplicate evidence dataset IDs', [method], [template], { outcome: { ...fixtureOutcome, recommendations: [{ ...fixtureOutcome.recommendations[0], positiveEvidenceDetails: [{ ...fixtureOutcome.recommendations[0].positiveEvidenceDetails[0], datasetIds: ['fixture_dataset', 'fixture_dataset'] }] }] } as never }, /duplicate|datasetIds/i],
    ['duplicate exclusion method IDs', [method], [template], { outcome: { ...fixtureOutcome, recommendations: [{ ...fixtureOutcome.recommendations[0], excludedAlternatives: [{ methodId: 'other', reasons: ['RESOURCE_LIMIT'] }, { methodId: 'other', reasons: ['SCALE_LIMIT'] }] }] } as never }, /duplicate|excluded/i],
    ['duplicate exclusion reasons', [method], [template], { outcome: { ...fixtureOutcome, recommendations: [{ ...fixtureOutcome.recommendations[0], excludedAlternatives: [{ methodId: 'other', reasons: ['RESOURCE_LIMIT', 'RESOURCE_LIMIT'] }] }] } as never }, /duplicate|reasons/i],
    ['wrapper output mismatch', [method], [{ ...template, template: { ...template.template, outputs: ['latent', 'metadata'] } }], {}, /output|coverage|match/i],
    ['package pin mismatch', [method], [{ ...template, template: { ...template.template, packageVersion: '2.0.0' } }], {}, /package|install|version/i],
    ['wrapper extraction mismatch', [method], [{ ...template, template: { ...template.template, wrapper: { ...template.template.wrapper, resultAttributes: { latent: 'latent', metadata: 'metadata' } } } }], {}, /wrapper|output|result/i],
    ['output key duplicate', [method], [{ ...template, template: { ...template.template, outputKeys: { latent: 'same', graph: 'same', metadata: 'metadata' } } }], {}, /duplicate|output/i],
    ['control locator', [method], [template], { outcome: { ...fixtureOutcome, recommendations: [{ ...fixtureOutcome.recommendations[0], evidenceLinks: [{ ...fixtureOutcome.recommendations[0].evidenceLinks[0], locator: 'table\u0000S1' }] }] } as never }, /locator|control/i],
  ]
  for (const [name, methods, templates, overrides, expected] of cases) assert.throws(() => createFixtureCompiler(methods, templates)(input(overrides)), expected, name)
})
