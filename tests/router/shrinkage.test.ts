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
    coverage: 1,
  })
  assert.throws(() => shrunkenEstimate([{ similarity: -0.1, value: 0.7 }], 0.5, 1), /similarity/i)
  assert.throws(() => shrunkenEstimate([{ similarity: 0.1, value: Number.NaN }], 0.5, 1), /value/i)
  assert.throws(() => shrunkenEstimate([], 0.5, 0), /alpha/i)
})

test('rejects similarities above one', () => {
  assert.throws(
    () => shrunkenEstimate([{ similarity: 1.01, value: 0.7 }], 0.5, 1),
    /similarity.*between 0 and 1/i,
  )
})

test('reports observed coverage against an explicit eligible dataset denominator', () => {
  const estimate = shrunkenEstimate([
    { similarity: 1, value: 0.9 },
    { similarity: 0.5, value: 0.7 },
  ], 0.5, 1, 4)

  assert.equal(estimate.mean, 0.7)
  assert.equal(estimate.variance, 0.008888888888888896)
  assert.equal(estimate.effectiveDatasets, 1.8)
  assert.equal(estimate.evidenceWeight, 1.5)
  assert.equal(estimate.coverage, 0.5)
})

test('counts zero-similarity observations as coverage without adding evidence', () => {
  assert.deepEqual(shrunkenEstimate([{ similarity: 0, value: 0.9 }], 0.4, 2, 4), {
    mean: 0.4,
    variance: 0,
    effectiveDatasets: 0,
    evidenceWeight: 0,
    coverage: 0.25,
  })
  assert.deepEqual(shrunkenEstimate([], 0.4, 2, 4), {
    mean: 0.4,
    variance: 0,
    effectiveDatasets: 0,
    evidenceWeight: 0,
    coverage: 0,
  })
})

test('requires eligibleDatasets to be a nonnegative integer at least as large as the sample count', () => {
  const oneSample = [{ similarity: 1, value: 0.9 }]

  for (const eligibleDatasets of [-1, 0, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => shrunkenEstimate(oneSample, 0.5, 1, eligibleDatasets),
      /eligibleDatasets.*integer.*sample count/i,
    )
  }
})
