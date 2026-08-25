import assert from 'node:assert/strict'
import test from 'node:test'

import { createRng, sortCodeUnits } from '../../app/core/router/random.ts'
import { perturbWeights, stratifiedResample } from '../../app/core/router/bootstrap.ts'

test('creates repeatable Mulberry32 streams within the unit interval', () => {
  const first = createRng(20260823)
  const second = createRng(20260823)
  const different = createRng(20260824)
  const firstValues = Array.from({ length: 10 }, () => first())
  const secondValues = Array.from({ length: 10 }, () => second())

  assert.deepEqual(firstValues, secondValues)
  assert.notDeepEqual(firstValues, Array.from({ length: 10 }, () => different()))
  assert.ok(firstValues.every((value) => value >= 0 && value < 1))
})

test('accepts exactly unsigned 32-bit integer seeds', () => {
  assert.equal(createRng(0)(), createRng(0)())
  assert.equal(createRng(0xffffffff)(), createRng(0xffffffff)())
  for (const seed of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, 0x1_0000_0000]) {
    assert.throws(() => createRng(seed), /unsigned 32-bit integer/i)
  }
})

test('uses deterministic code-unit ordering', () => {
  assert.deepEqual(sortCodeUnits(['z', 'a', 'A', '\u00e4']), ['A', 'a', 'z', '\u00e4'])
})

test('resamples complete dataset contexts within each study group and preserves provenance identity', () => {
  const evidenceA = { methods: { alpha: { quality: 0.9 } } }
  const contexts = [
    { datasetId: 'd1', studyGroup: 'study-a', evidence: evidenceA },
    { datasetId: 'd2', studyGroup: 'study-a', evidence: { methods: { alpha: { quality: 0.8 } } } },
    { datasetId: 'd3', studyGroup: 'study-b', evidence: { methods: { alpha: { quality: 0.7 } } } },
  ]
  const sampled = stratifiedResample(contexts, createRng(17))

  assert.equal(sampled.length, contexts.length)
  assert.deepEqual(sampled.map(({ studyGroup }) => studyGroup).sort(), ['study-a', 'study-a', 'study-b'])
  assert.ok(sampled.every(({ sourceDatasetId }) => contexts.some(({ datasetId }) => datasetId === sourceDatasetId)))
  const inherited = sampled.find(({ sourceDatasetId }) => sourceDatasetId === 'd1')
  if (inherited) assert.equal(inherited.evidence, evidenceA)
  assert.deepEqual(contexts.map(({ datasetId }) => datasetId), ['d1', 'd2', 'd3'])
})

test('rejects malformed strata and duplicate dataset identities', () => {
  const rng = createRng(1)
  assert.throws(() => stratifiedResample([{ datasetId: 'd1', studyGroup: '', evidence: {} }], rng), /studyGroup/i)
  assert.throws(() => stratifiedResample([
    { datasetId: 'd1', studyGroup: 's', evidence: {} },
    { datasetId: 'd1', studyGroup: 's', evidence: {} },
  ], rng), /duplicate/i)
})

test('perturbs only positive finite weights and preserves input immutability', () => {
  const weights = { biology: 0.7, resources: 0.3, unused: 0 }
  const perturbed = perturbWeights(weights, createRng(3))

  assert.equal(perturbed.unused, 0)
  assert.equal(Object.values(perturbed).reduce((sum, value) => sum + value, 0), 1)
  assert.ok(perturbed.biology > 0 && perturbed.resources > 0)
  assert.deepEqual(weights, { biology: 0.7, resources: 0.3, unused: 0 })
  assert.throws(() => perturbWeights({ biology: Number.NaN }, createRng(1)), /finite nonnegative/i)
  assert.throws(() => perturbWeights({ biology: 0, resources: 0 }, createRng(1)), /positive weight/i)
})
