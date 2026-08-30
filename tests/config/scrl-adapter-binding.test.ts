import assert from 'node:assert/strict'
import test from 'node:test'

import { compileScrlAdapterBinding, validateScrlAdapterBinding } from '../../app/core/config/scrl-adapter-binding.ts'

const binding = {
  protocol: 'scrl-adapter-v1',
  bindingScope: 'source_tree',
  methodId: 'scRL',
  packageName: 'scrl-fatedecision',
  packageVersion: '0.0.7',
  sourceUrl: 'https://github.com/PeterPonyu/scRL',
  sourceModule: 'scripts.sci.chain.scrl_adapter',
  functionName: 'run_scrl_adapter',
  inputKeys: {
    latent: 'X_latent',
    embedding: 'X_embed',
    cluster: 'cluster',
    pseudotime: 'pt',
  },
  outputKeys: {
    decision: 'scrl_state_value',
    metadata: 'scrl_adapter_metadata',
  },
  parameters: {
    episodes: 10,
    device: 'cpu',
    seed: 4,
  },
} as const

test('compiles the source-bound scRL protocol into a deterministic Python call', () => {
  const artifact = compileScrlAdapterBinding(binding)

  assert.equal(artifact.status, 'source_bound')
  assert.equal(Object.hasOwn(artifact, 'installCommand'), false)
  assert.equal(Object.isFrozen(artifact), true)
  assert.equal(Object.isFrozen(artifact.binding), true)
  assert.match(artifact.pythonSnippet, /^from scripts\.sci\.chain\.scrl_adapter import run_scrl_adapter\n/)
  assert.match(artifact.pythonSnippet, /adapter = run_scrl_adapter\(\n\x20{2}adata,\n\x20{2}latent_key='X_latent',\n\x20{2}embedding_key='X_embed',\n\x20{2}cluster_key='cluster',\n\x20{2}pseudotime_key='pt',\n\x20{2}device='cpu',\n\x20{2}episodes=10,\n\x20{2}seed=4,\n\)/)
  assert.match(artifact.pythonSnippet, /adata\.obs\['scrl_state_value'\] = adapter\.get_state_value\(\)/)
  assert.match(artifact.pythonSnippet, /adata\.uns\['scrl_adapter_metadata'\] = adapter\.metadata/)
  assert.ok(artifact.pythonSnippet.indexOf("device='cpu'") < artifact.pythonSnippet.indexOf('episodes=10'))
  assert.ok(artifact.pythonSnippet.indexOf('episodes=10') < artifact.pythonSnippet.indexOf('seed=4'))
})

test('normalizes and freezes a valid source-bound binding without adding a public install claim', () => {
  const validated = validateScrlAdapterBinding(binding)

  assert.deepEqual(validated, binding)
  assert.equal(validated.bindingScope, 'source_tree')
  assert.equal(Object.hasOwn(validated, 'installCommand'), false)
  assert.equal(Object.isFrozen(validated.inputKeys), true)
  assert.equal(Object.isFrozen(validated.outputKeys), true)
  assert.equal(Object.isFrozen(validated.parameters), true)
})

test('rejects protocol, module, input, parameter, and public-release drift', () => {
  const cases: Array<[string, unknown, RegExp]> = [
    ['wrong protocol', { ...binding, protocol: 'scrl-adapter-v0' }, /protocol/i],
    ['unsafe module', { ...binding, sourceModule: 'scripts.sci.chain.scrl_adapter;os' }, /module|identifier/i],
    ['missing input', { ...binding, inputKeys: { ...binding.inputKeys, pseudotime: '' } }, /inputKeys|pseudotime/i],
    ['non-multiple episode budget', { ...binding, parameters: { ...binding.parameters, episodes: 9 } }, /episodes|multiple/i],
    ['non-scalar parameter', { ...binding, parameters: { ...binding.parameters, grid_size: [10] } }, /parameter/i],
    ['public release field', { ...binding, installCommand: 'python -m pip install scrl-fatedecision==0.0.7' }, /unknown|public|install|exactly/i],
    ['wrong scope', { ...binding, bindingScope: 'public_release' }, /scope/i],
  ]

  for (const [label, candidate, expected] of cases) {
    assert.throws(() => validateScrlAdapterBinding(candidate), expected, label)
  }
})
