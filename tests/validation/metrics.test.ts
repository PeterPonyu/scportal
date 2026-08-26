import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const { NON_EVALUABLE, expectedCalibrationError, normalizedRegret, paretoCoverageCount, resourceFeasibility, spearmanRho, top1Hit, top3Hit, top3Retention } = await import('../../validation/src/metrics.ts')

const ranking = [
  { methodId: 'oracle', utility: 0.9 },
  { methodId: 'middle', utility: 0.6 },
  { methodId: 'worst', utility: 0.3 },
]

describe('publication metrics', () => {
  it('scores Top-1 and Top-3 hits against a held-out ranking', () => {
    assert.equal(top1Hit('oracle', ranking), 1)
    assert.equal(top1Hit('middle', ranking), 0)
    assert.equal(top3Hit('middle', ranking), 1)
    assert.equal(top3Hit('worst', ranking), 1)
  })

  it('keeps normalized regret inside [0, 1]', () => {
    assert.equal(normalizedRegret('oracle', ranking), 0)
    assert.equal(normalizedRegret('middle', ranking), 0.5)
    assert.equal(normalizedRegret('worst', ranking), 1)
    const value = normalizedRegret('middle', ranking)
    assert.equal(typeof value === 'number' && value >= 0 && value <= 1, true)
  })

  it('computes Spearman rho with midranks for ties', () => {
    assert.equal(spearmanRho([1, 2, 3], [1, 2, 3]), 1)
    assert.equal(spearmanRho([1, 2, 3], [3, 2, 1]), -1)
    assert.equal(spearmanRho([1, 1, 0], [0.8, 0.4, 0.2]), 1.5 / Math.sqrt(3))
  })

  it('passes through Top-3 retention in [0, 1]', () => {
    assert.equal(top3Retention(0.8), 0.8)
    assert.equal(top3Retention(0), 0)
    assert.equal(top3Retention(1), 1)
  })

  it('computes five-bin expected calibration error', () => {
    const calibrated = [
      { confidence: 0.8, correct: true },
      { confidence: 0.8, correct: true },
      { confidence: 0.8, correct: true },
      { confidence: 0.8, correct: true },
      { confidence: 0.8, correct: false },
    ]
    assert.equal(expectedCalibrationError(calibrated, 5), 0)
    const miscalibrated = [
      { confidence: 0.9, correct: true },
      { confidence: 0.9, correct: true },
      { confidence: 0.9, correct: true },
      { confidence: 0.9, correct: false },
      { confidence: 0.9, correct: false },
    ]
    assert.equal(expectedCalibrationError(miscalibrated, 5), Math.abs(0.6 - 0.9))
  })

  it('counts recommended methods that sit on the holdout Pareto frontier', () => {
    assert.equal(paretoCoverageCount(['oracle'], ['oracle', 'middle']), 1)
    assert.equal(paretoCoverageCount(['oracle', 'worst'], ['oracle', 'middle']), 1)
    assert.equal(paretoCoverageCount(['worst'], ['oracle', 'middle']), 0)
  })

  it('marks resource-feasible recommendations without coercing misses to success', () => {
    assert.equal(resourceFeasibility('geometry_vae', 1, 2), 1)
    assert.equal(resourceFeasibility('neural_ode', 3, 2), 0)
  })

  it('records refusal and empty candidate sets as non_evaluable, never 0', () => {
    assert.equal(top1Hit(null, ranking), NON_EVALUABLE)
    assert.equal(top1Hit('oracle', []), NON_EVALUABLE)
    assert.equal(top3Hit(undefined, ranking), NON_EVALUABLE)
    assert.equal(normalizedRegret(null, ranking), NON_EVALUABLE)
    assert.equal(normalizedRegret('missing', ranking), NON_EVALUABLE)
    assert.equal(spearmanRho([], [1]), NON_EVALUABLE)
    assert.equal(spearmanRho([1], [1]), NON_EVALUABLE)
    assert.equal(top3Retention(undefined), NON_EVALUABLE)
    assert.equal(top3Retention(1.2), NON_EVALUABLE)
    assert.equal(expectedCalibrationError([], 5), NON_EVALUABLE)
    assert.equal(paretoCoverageCount([], ['oracle']), NON_EVALUABLE)
    assert.equal(paretoCoverageCount(null, ['oracle']), NON_EVALUABLE)
    assert.equal(resourceFeasibility(null, 1, 2), NON_EVALUABLE)
    assert.notEqual(top1Hit(null, ranking), 0)
    assert.notEqual(normalizedRegret(null, ranking), 0)
  })
})
