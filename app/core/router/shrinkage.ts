export interface ConditionalEstimate {
  mean: number
  variance: number
  effectiveDatasets: number
  evidenceWeight: number
  coverage: number
}

export interface ConditionalSample {
  similarity: number
  value: number
}

export function shrunkenEstimate(
  samples: readonly ConditionalSample[],
  priorMean: number,
  alpha: number,
  eligibleDatasets: number = samples.length,
): ConditionalEstimate {
  if (!Number.isFinite(priorMean)) throw new Error('priorMean must be finite')
  if (!Number.isFinite(alpha) || alpha <= 0) throw new Error('alpha must be finite and positive')
  if (!Number.isInteger(eligibleDatasets) || eligibleDatasets < 0 || eligibleDatasets < samples.length) {
    throw new Error('eligibleDatasets must be a nonnegative integer at least as large as the sample count')
  }

  let evidenceWeight = 0
  let weightedValue = 0
  let squaredWeight = 0
  for (const sample of samples) {
    if (!Number.isFinite(sample.similarity) || sample.similarity < 0 || sample.similarity > 1) {
      throw new Error('similarity must be finite and between 0 and 1')
    }
    if (!Number.isFinite(sample.value)) throw new Error('value must be finite')
    if (sample.similarity === 0) continue
    evidenceWeight += sample.similarity
    weightedValue += sample.similarity * sample.value
    squaredWeight += sample.similarity ** 2
  }

  const coverage = eligibleDatasets === 0 ? 0 : samples.length / eligibleDatasets
  if (evidenceWeight === 0) {
    return { mean: priorMean, variance: 0, effectiveDatasets: 0, evidenceWeight: 0, coverage }
  }

  const observedMean = weightedValue / evidenceWeight
  let weightedSquaredDeviation = 0
  for (const sample of samples) {
    if (sample.similarity > 0) weightedSquaredDeviation += sample.similarity * (sample.value - observedMean) ** 2
  }

  return {
    mean: (weightedValue + alpha * priorMean) / (evidenceWeight + alpha),
    variance: weightedSquaredDeviation / evidenceWeight,
    effectiveDatasets: (evidenceWeight ** 2) / squaredWeight,
    evidenceWeight,
    coverage,
  }
}
