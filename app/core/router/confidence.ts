export interface ConfidenceEvidence {
  effectiveDatasets: number
  criticalCoverage: number
  weightedVariance: number
  topThreeRetention: number
  topTwoMargin: number
}

export interface ConfidenceProfile {
  minEffectiveDatasets: number
  minCriticalCoverage: number
  maxWeightedVariance: number
  minTopThreeRetention: number
  minTopTwoMargin: number
}

export interface ConfidenceResult {
  grade: 'high' | 'medium' | 'low'
  reasons: string[]
}

function requireRange(value: number, label: string, maximum?: number): void {
  if (!Number.isFinite(value) || value < 0 || (maximum !== undefined && value > maximum)) {
    throw new Error(`${label} must be finite${maximum === undefined ? ' and nonnegative' : ` and between 0 and ${maximum}`}`)
  }
}

export function gradeConfidence(evidence: ConfidenceEvidence, profile: ConfidenceProfile): ConfidenceResult {
  requireRange(evidence.effectiveDatasets, 'effectiveDatasets')
  requireRange(evidence.criticalCoverage, 'criticalCoverage', 1)
  requireRange(evidence.weightedVariance, 'weightedVariance')
  requireRange(evidence.topThreeRetention, 'topThreeRetention', 1)
  requireRange(evidence.topTwoMargin, 'topTwoMargin')
  requireRange(profile.minEffectiveDatasets, 'minEffectiveDatasets')
  requireRange(profile.minCriticalCoverage, 'minCriticalCoverage', 1)
  requireRange(profile.maxWeightedVariance, 'maxWeightedVariance')
  requireRange(profile.minTopThreeRetention, 'minTopThreeRetention', 1)
  requireRange(profile.minTopTwoMargin, 'minTopTwoMargin')

  const reasons: string[] = []
  if (evidence.effectiveDatasets < profile.minEffectiveDatasets) reasons.push('effective datasets below threshold')
  if (evidence.criticalCoverage < profile.minCriticalCoverage) reasons.push('critical coverage below threshold')
  if (evidence.weightedVariance > profile.maxWeightedVariance) reasons.push('weighted variance above threshold')
  if (evidence.topThreeRetention < profile.minTopThreeRetention) reasons.push('top-three retention below threshold')
  if (evidence.topTwoMargin < profile.minTopTwoMargin) reasons.push('top-two margin below threshold')
  if (reasons.length === 0) return { grade: 'high', reasons }
  return { grade: evidence.criticalCoverage < profile.minCriticalCoverage ? 'low' : 'medium', reasons }
}
