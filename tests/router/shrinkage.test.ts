import assert from 'node:assert/strict'
import test from 'node:test'

import { shrunkenEstimate } from '../../app/core/router/shrinkage.ts'

test('shrinks similarity-weighted observations toward the prior', () => {
  const estimate = shrunkenEstimate([
    { similarity: 1, value: 0.9 },
    { similarity: 0.5, value: 0.7 },
  ], 0.5, 1)

  assert.equal(estimate.mean, 0.7)
  assert.equal(estimate.evidenceWeight, 1.5)
  assert.equal(estimate.effectiveDatasets, 1.8)
  assert.equal(estimate.coverage, 1)
  assert.ok(Math.abs(estimate.variance - (0.00888888888888889)) < 1e-15)
})

test('returns the prior with zero evidence and does not synthesize missing observations', () => {
  assert.deepEqual(shrunkenEstimate([], 0.5, 1), {
    mean: 0.5,
    variance: 0,
    effectiveDatasets: 0,
    evidenceWeight: 0,
    coverage: 0,
  })
})

test('excludes zero-similarity samples and rejects invalid numeric input', () => {
  assert.deepEqual(shrunkenEstimate([{ similarity: 0, value: 0.9 }], 0.4, 2), {
    mean: 0.4,
    variance: 0,
    effectiveDatasets: 0,
    evidenceWeight: 0,
    coverage: 0,
  })
  assert.throws(() => shrunkenEstimate([{ similarity: -0.1, value: 0.7 }], 0.5, 1), /similarity/i)
  assert.throws(() => shrunkenEstimate([{ similarity: 0.1, value: Number.NaN }], 0.5, 1), /value/i)
  assert.throws(() => shrunkenEstimate([], 0.5, 0), /alpha/i)
})
