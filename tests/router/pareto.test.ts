import assert from 'node:assert/strict'
import test from 'node:test'

import { paretoLayers, type ParetoVector } from '../../app/core/router/pareto.ts'

function vector(methodId: string, scores: Record<string, number>, criticalGroups: readonly string[] = Object.keys(scores)): ParetoVector {
  return { methodId, scores, criticalGroups }
}

test('places a dominating method ahead of the method it dominates', () => {
  const layers = paretoLayers([
    vector('dominated', { trajectory: 0.7, resources: 0.6 }),
    vector('dominant', { trajectory: 0.8, resources: 0.7 }),
  ])

  assert.deepEqual([...layers], [['dominant', 0], ['dominated', 1]])
})

test('keeps incomparable trade-offs and identical score vectors on one ordered frontier', () => {
  const layers = paretoLayers([
    vector('zeta', { trajectory: 0.8, resources: 0.5 }),
    vector('alpha', { trajectory: 0.8, resources: 0.5 }),
    vector('beta', { trajectory: 0.5, resources: 0.8 }),
  ])

  assert.deepEqual([...layers], [['alpha', 0], ['beta', 0], ['zeta', 0]])
})

test('uses epsilon to avoid false dominance while preserving transitive layers', () => {
  const layers = paretoLayers([
    vector('third', { trajectory: 0.7 }),
    vector('second', { trajectory: 0.8 }),
    vector('first', { trajectory: 0.9 }),
  ], 0.05)
  const nearTie = paretoLayers([
    vector('a', { trajectory: 0.8 }),
    vector('b', { trajectory: 0.76 }),
  ], 0.05)

  assert.deepEqual([...layers], [['first', 0], ['second', 1], ['third', 2]])
  assert.deepEqual([...nearTie], [['a', 0], ['b', 0]])
})

test('rejects malformed vectors before calculating Pareto layers', () => {
  for (const [expected, vectors, epsilon] of [
    [/duplicate IDs/i, [vector('same', { trajectory: 1 }), vector('same', { trajectory: 0 })], undefined],
    [/missing dimensions/i, [vector('a', { trajectory: 1 }), vector('b', { trajectory: 1, resources: 1 })], undefined],
    [/missing critical coverage/i, [vector('a', { trajectory: 1, resources: 1 }, ['trajectory']), vector('b', { trajectory: 1, resources: 1 })], undefined],
    [/non-finite group score/i, [vector('a', { trajectory: Number.NaN })], undefined],
    [/non-finite group score/i, [vector('a', { trajectory: Infinity })], undefined],
    [/epsilon/i, [vector('a', { trajectory: 1 })], -1],
    [/epsilon/i, [vector('a', { trajectory: 1 })], Number.NaN],
  ] as const) {
    assert.throws(() => paretoLayers(vectors, epsilon), expected)
  }
})
