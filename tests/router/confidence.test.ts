import assert from 'node:assert/strict'
import test from 'node:test'

import { gradeConfidence } from '../../app/core/router/confidence.ts'

const profile = {
  minEffectiveDatasets: 3,
  minCriticalCoverage: 0.8,
  maxWeightedVariance: 0.04,
  minTopThreeRetention: 0.75,
  minTopTwoMargin: 0.05,
}

test('awards high confidence only to finite sufficient evidence', () => {
  assert.deepEqual(gradeConfidence({
    effectiveDatasets: 4,
    criticalCoverage: 0.9,
    weightedVariance: 0.02,
    topThreeRetention: 0.8,
    topTwoMargin: 0.1,
  }, profile), { grade: 'high', reasons: [] })
})

test('cannot grade high when coverage is below the profile threshold', () => {
  const result = gradeConfidence({
    effectiveDatasets: 10,
    criticalCoverage: 0.79,
    weightedVariance: 0,
    topThreeRetention: 1,
    topTwoMargin: 1,
  }, profile)

  assert.equal(result.grade, 'low')
  assert.deepEqual(result.reasons, ['critical coverage below threshold'])
})

test('returns deterministic evidence reasons and rejects nonfinite or invalid evidence', () => {
  const result = gradeConfidence({
    effectiveDatasets: 2,
    criticalCoverage: 0.9,
    weightedVariance: 0.1,
    topThreeRetention: 0.7,
    topTwoMargin: 0.01,
  }, profile)
  assert.deepEqual(result, {
    grade: 'medium',
    reasons: [
      'effective datasets below threshold',
      'weighted variance above threshold',
      'top-three retention below threshold',
      'top-two margin below threshold',
    ],
  })
  assert.throws(() => gradeConfidence({ effectiveDatasets: Number.NaN, criticalCoverage: 1, weightedVariance: 0, topThreeRetention: 1, topTwoMargin: 1 }, profile), /effectiveDatasets/i)
  assert.throws(() => gradeConfidence({ effectiveDatasets: 1, criticalCoverage: 1.1, weightedVariance: 0, topThreeRetention: 1, topTwoMargin: 1 }, profile), /criticalCoverage/i)
})
