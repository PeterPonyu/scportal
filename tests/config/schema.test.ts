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

test('validates strict schema-equivalent own data, freezes it, and serializes insertion-order-independently', () => {
  const reversed = Object.fromEntries(Object.entries(executable).reverse())
  const first = serializeConfig(executable)
  const second = serializeConfig(reversed as typeof executable)
  assert.equal(first.json, second.json)
  assert.equal(first.yaml, second.yaml)
  assert.deepEqual(JSON.parse(first.json), executable)
  assert.deepEqual(parseYaml(first.yaml), executable)
  const validated = validateExecutableConfig(JSON.parse(first.json))
  assert.equal(Object.isFrozen(validated), true)
  assert.equal(Object.isFrozen(validated.method), true)
  assert.throws(() => { validated.method.id = 'other' }, /read only|frozen/i)
})

test('rejects exact-schema violations, unsafe own keys, non-data fields, unsafe install grammar, and incompatible handoffs', () => {
  const getter = Object.defineProperty({ ...executable }, 'routerVersion', { enumerable: true, get: () => 'router-v1' })
  const cases: Array<[unknown, RegExp]> = [
    [Object.create(executable), /own|plain/i],
    [{ ...executable, unknown: true }, /unknown|schema/i],
    [{ ...executable, method: { ...executable.method, extra: true } }, /unknown|schema/i],
    [{ ...executable, parameters: { 'not-valid': 1 } }, /identifier|unsafe/i],
    [Object.defineProperty({ ...executable }, '__proto__', { value: 1, enumerable: true }), /unsafe/i],
    [getter, /data/i],
    [{ ...executable, method: { ...executable.method, install: 'pip install graph-contrastive==1.0.0; whoami' } }, /install/i],
    [{ ...executable, downstream: { scFocus: { latentKey: 'wrong', contributionOutput: 'x' } } }, /scFocus|latent/i],
    [{ ...executable, downstream: { scRL: { latentKey: 'X_graph', pseudotimeKey: 'pt', decisionOutput: 'x' } } }, /scRL|pseudotime/i],
    [{ ...executable, outputs: { ...executable.outputs, graph: undefined } }, /graph|undefined/i],
    [{ ...executable, outputs: { ...executable.outputs, pseudotime: undefined } }, /pseudotime|undefined/i],
    [{ ...executable, outputs: { ...executable.outputs, branch: undefined } }, /branch|undefined/i],
    [{ ...executable, downstream: { scFocus: { latentKey: 'X_graph', branchKey: undefined, contributionOutput: 'x' } } }, /branchKey|undefined/i],
    [{ ...executable, downstream: { scFocus: undefined } }, /handoff|undefined/i],
    [{ ...executable, downstream: { scRL: undefined } }, /handoff|undefined/i],
    [{ ...executable, provenance: { ...executable.provenance, generatedAt: '2026-08-24' } }, /date-time|timestamp/i],
    [{ ...executable, provenance: { ...executable.provenance, generatedAt: '2026-02-30T00:00:00Z' } }, /date-time|timestamp/i],
    [{ ...executable, provenance: { ...executable.provenance, methodSource: 'javascript:alert(1)' } }, /http|url/i],
    [{ ...executable, provenance: { ...executable.provenance, methodSource: 'https://' } }, /http|url/i],
    [{ ...executable, parameters: { label: 'bad\u0000value' } }, /control/i],
    [{ ...executable, outputs: { ...executable.outputs, latent: 'bad\u007fvalue' } }, /control/i],
  ]
  for (const [value, expected] of cases) assert.throws(() => validateExecutableConfig(value), expected)
})

test('validates template defaults against constraints and rejects unsafe Python parameter names and invalid constraint metadata', () => {
  const candidate = {
    methodId: 'graph_contrastive', version: '1.0.0', packageName: 'graph-contrastive', importName: 'graph_contrastive', constructor: 'GraphContrastive',
    defaultParameters: { epochs: 10 }, allowedParameters: { epochs: { type: 'number', minimum: 1, integer: true } },
    outputKeys: { latent: 'X_graph', metadata: 'graph_metadata' }, downstream: { scRL: { decisionOutput: 'decision' } },
  }
  const parsed = validateMethodConfigTemplate(candidate)
  assert.equal(Object.isFrozen(parsed), true)
  assert.equal(Object.isFrozen(parsed.allowedParameters), true)
  const cases = [
    { ...candidate, defaultParameters: { epochs: 0 } },
    { ...candidate, defaultParameters: { epochs: 1.5 } },
    { ...candidate, allowedParameters: { epochs: { type: 'string', minimum: 1 } } },
    { ...candidate, allowedParameters: { epochs: { type: 'boolean', integer: true } } },
    { ...candidate, allowedParameters: { epochs: { type: 'number', enum: [] } } },
    { ...candidate, allowedParameters: { epochs: { type: 'number', enum: [1, 'two'] } } },
    { ...candidate, allowedParameters: { epochs: { type: 'number', enum: Object.assign(new Array(1), {}) } } },
    { ...candidate, allowedParameters: { 'not-valid': { type: 'number' } }, defaultParameters: { 'not-valid': 1 } },
    { ...candidate, importName: 'not-valid' },
    { ...candidate, constructor: 'not-valid' },
    { ...candidate, downstream: { scFocus: { contributionOutput: 'x', extra: true } } },
  ]
  for (const value of cases) assert.throws(() => validateMethodConfigTemplate(value), /default|number|enum|identifier|unknown/i)
})
