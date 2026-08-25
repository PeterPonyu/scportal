import assert from 'node:assert/strict'
import test from 'node:test'

import { empiricalFifthPercentile, robustOutranking } from '../../app/core/router/outranking.ts'

const input = {
  contexts: [
    { datasetId: 'a1', studyGroup: 'study-a', evidence: { methods: { alpha: { biology: 0.95, resources: 0.8 }, beta: { biology: 0.7, resources: 0.6 }, gamma: { biology: 0.5, resources: 0.5 } } } },
    { datasetId: 'a2', studyGroup: 'study-a', evidence: { methods: { alpha: { biology: 0.9, resources: 0.8 }, beta: { biology: 0.65, resources: 0.65 }, gamma: { biology: 0.55, resources: 0.45 } } } },
    { datasetId: 'b1', studyGroup: 'study-b', evidence: { methods: { alpha: { biology: 0.92, resources: 0.82 }, beta: { biology: 0.68, resources: 0.63 }, gamma: { biology: 0.52, resources: 0.48 } } } },
  ],
  weights: { biology: 0.7, resources: 0.3 },
  delta: 0.02,
  replicates: 200,
  seed: 20260823,
}

test('computes deterministic coherent robust outranking for conditional dataset evidence', () => {
  const before = structuredClone(input)
  const first = robustOutranking(input)
  const second = robustOutranking(input)

  assert.deepEqual(first, second)
  assert.equal(first.replicates, 200)
  assert.equal(first.seed, 20260823)
  assert.ok(first.phi.alpha > 0)
  for (const methodId of Object.keys(first.phi)) {
    assert.ok(first.phi[methodId] >= -1 && first.phi[methodId] <= 1)
    assert.ok(Number.isFinite(first.utilityLowerBound[methodId]))
    assert.ok(first.topThreeRetention[methodId] >= 0 && first.topThreeRetention[methodId] <= 1)
    for (const opponentId of Object.keys(first.phi)) {
      assert.ok(first.winProbability[methodId][opponentId] >= 0 && first.winProbability[methodId][opponentId] <= 1)
      assert.ok(first.winProbability[methodId][opponentId] + first.winProbability[opponentId][methodId] <= 1)
    }
  }
  assert.deepEqual(input, before)
})

test('defines empirical fifth percentile as the floor-indexed order statistic', () => {
  assert.equal(empiricalFifthPercentile([5, 1, 3, 2, 4]), 1)
  assert.equal(empiricalFifthPercentile(Array.from({ length: 100 }, (_, index) => index)), 4)
})

test('handles zero, one, and tied methods with deterministic code-unit ordering', () => {
  const noMethods = robustOutranking({ ...input, contexts: [{ datasetId: 'only', studyGroup: 's', evidence: { methods: {} } }], replicates: 1 })
  assert.deepEqual(noMethods.phi, {})

  const oneMethod = robustOutranking({
    contexts: [{ datasetId: 'only', studyGroup: 's', evidence: { methods: { alpha: { biology: 0.5, resources: 0.5 } } } }],
    weights: input.weights,
    delta: 0,
    replicates: 1,
    seed: 0,
  })
  assert.deepEqual(oneMethod.phi, { alpha: 0 })
  assert.deepEqual(oneMethod.winProbability, { alpha: { alpha: 0 } })

  const tied = robustOutranking({
    contexts: [{ datasetId: 'only', studyGroup: 's', evidence: { methods: { z: { biology: 0.5, resources: 0.5 }, A: { biology: 0.5, resources: 0.5 } } } }],
    weights: input.weights,
    delta: 0,
    replicates: 1,
    seed: 0,
  })
  assert.equal(tied.phi.A, 0)
  assert.equal(tied.phi.z, 0)
  assert.equal(tied.topThreeRetention.A, 1)
  assert.equal(tied.topThreeRetention.z, 1)
})

test('fails closed for invalid outranking inputs and missing conditional group evidence', () => {
  assert.throws(() => robustOutranking({ ...input, delta: -1 }), /delta/i)
  assert.throws(() => robustOutranking({ ...input, replicates: 0 }), /replicates/i)
  assert.throws(() => robustOutranking({ ...input, contexts: [{ datasetId: 'd', studyGroup: 's', evidence: { methods: { alpha: { biology: 1 }, beta: { biology: 1, resources: 1 } } } }] }), /missing conditional group evidence/i)
  assert.throws(() => robustOutranking({ ...input, contexts: [
    { datasetId: 'd', studyGroup: 's', evidence: { methods: { alpha: { biology: Number.MAX_VALUE, resources: Number.MAX_VALUE } } } },
    { datasetId: 'd', studyGroup: 's', evidence: { methods: { alpha: { biology: Number.MAX_VALUE, resources: Number.MAX_VALUE } } } },
  ] }), /duplicate/i)
})
