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

function requireFiniteShrinkage(value: number, stage: string): number {
  if (!Number.isFinite(value)) throw new Error(`shrinkage numeric overflow: ${stage}`)
  return value
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
    evidenceWeight = requireFiniteShrinkage(
      evidenceWeight + sample.similarity,
      'accumulated evidence weight',
    )
    const weightedContribution = requireFiniteShrinkage(
      sample.similarity * sample.value,
      'weighted value contribution',
    )
    weightedValue = requireFiniteShrinkage(
      weightedValue + weightedContribution,
      'accumulated weighted value',
    )
    const squaredSimilarity = sample.similarity ** 2
    if (!Number.isFinite(squaredSimilarity) || squaredSimilarity === 0) {
      throw new Error('shrinkage numeric overflow: squared similarity weight')
    }
    squaredWeight = requireFiniteShrinkage(
      squaredWeight + squaredSimilarity,
      'accumulated squared similarity weight',
    )
  }

  const coverage = requireFiniteShrinkage(
    eligibleDatasets === 0 ? 0 : samples.length / eligibleDatasets,
    'coverage output',
  )
  requireFiniteShrinkage(evidenceWeight, 'evidence weight output')
  if (evidenceWeight === 0) {
    return { mean: priorMean, variance: 0, effectiveDatasets: 0, evidenceWeight: 0, coverage }
  }

  const priorContribution = requireFiniteShrinkage(alpha * priorMean, 'prior contribution')
  const estimateWeight = requireFiniteShrinkage(evidenceWeight + alpha, 'estimate weight')
  const meanNumerator = requireFiniteShrinkage(
    weightedValue + priorContribution,
    'shrunken mean numerator',
  )
  const mean = requireFiniteShrinkage(meanNumerator / estimateWeight, 'mean output')
  const observedMean = requireFiniteShrinkage(weightedValue / evidenceWeight, 'observed mean')
  let weightedSquaredDeviation = 0
  for (const sample of samples) {
    if (sample.similarity === 0) continue
    const deviation = requireFiniteShrinkage(sample.value - observedMean, 'deviation')
    const squaredDeviation = requireFiniteShrinkage(deviation ** 2, 'squared deviation')
    const weightedDeviation = requireFiniteShrinkage(
      sample.similarity * squaredDeviation,
      'weighted squared deviation contribution',
    )
    weightedSquaredDeviation = requireFiniteShrinkage(
      weightedSquaredDeviation + weightedDeviation,
      'accumulated weighted squared deviation',
    )
  }
  const variance = requireFiniteShrinkage(weightedSquaredDeviation / evidenceWeight, 'variance output')
  const squaredEvidenceWeight = requireFiniteShrinkage(evidenceWeight ** 2, 'squared evidence weight')
  const effectiveDatasets = requireFiniteShrinkage(
    squaredEvidenceWeight / squaredWeight,
    'effective datasets output',
  )

  return {
    mean,
    variance,
    effectiveDatasets,
    evidenceWeight,
    coverage,
  }
}
