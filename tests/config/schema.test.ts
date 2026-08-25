import assert from 'node:assert/strict'
import test from 'node:test'
import { parse as parseYaml } from 'yaml'

import { serializeConfig, validateExecutableConfig } from '../../app/core/config/serialize.ts'
import { validateMethodConfigTemplate } from '../../app/core/config/templates.ts'

const executable = {
  schemaVersion: '1.0', routerVersion: 'router-v1', evidenceVersion: 'evidence-v1',
  method: { id: 'graph_contrastive', version: '1.0.0', install: 'python -m pip install graph-contrastive==1.0.0' },
  preprocessing: { modality: 'scrna', normalization: 'library_size_log1p', featureSelection: 'highly_variable_features' },
  parameters: { epochs: 10 }, outputs: { latent: 'X_graph', metadata: 'graph_metadata' }, downstream: {},
  provenance: { recommendationSeed: 17, methodSource: 'https://example.test/source', generatedAt: '2026-08-24T00:00:00.000Z', profileFingerprint: 'a'.repeat(64), outcome: { status: 'OK', methodId: 'graph_contrastive' } },
} as const

test('validates schema and preserves exact semantic JSON/YAML round trips', () => {
  const serialized = serializeConfig(executable)
  assert.deepEqual(JSON.parse(serialized.json), executable)
  assert.deepEqual(parseYaml(serialized.yaml), executable)
  assert.deepEqual(validateExecutableConfig(JSON.parse(serialized.json)), executable)
})

test('rejects executable-config inherited fields, pollution, invalid provenance, and handoffs requiring absent outputs', () => {
  const inherited = Object.create(executable)
  for (const value of [inherited, { ...executable, __proto__: { polluted: true } }, { ...executable, provenance: { ...executable.provenance, profileFingerprint: 'short' } }, { ...executable, downstream: { scRL: { latentKey: 'X_graph', pseudotimeKey: 'pt', decisionOutput: 'decision' } } }]) {
    assert.throws(() => validateExecutableConfig(value), /own|schema|profileFingerprint|pseudotime/i)
  }
})

test('validates complete own-only templates and freezes their nested fields', () => {
  const candidate = {
    methodId: 'graph_contrastive', version: '1.0.0', packageName: 'graph-contrastive', importName: 'graph_contrastive', constructor: 'GraphContrastive',
    defaultParameters: { epochs: 10 }, allowedParameters: { epochs: { type: 'number', minimum: 1, integer: true } },
    outputKeys: { latent: 'X_graph', metadata: 'graph_metadata' }, downstream: { scRL: { decisionOutput: 'decision' } },
  }
  const parsed = validateMethodConfigTemplate(candidate)
  assert.equal(Object.isFrozen(parsed), true)
  assert.equal(Object.isFrozen(parsed.allowedParameters), true)
  assert.throws(() => validateMethodConfigTemplate(Object.create(candidate)), /own/i)
  assert.throws(() => validateMethodConfigTemplate({ ...candidate, allowedParameters: Object.create({ epochs: { type: 'number' } }) }), /own/i)
})
