import { sortCodeUnits } from './random.ts'

export interface DatasetEvidenceContext<TEvidence> {
  datasetId: string
  studyGroup: string
  evidence: TEvidence
}

export interface ResampledDatasetContext<TEvidence> extends DatasetEvidenceContext<TEvidence> {
  sourceDatasetId: string
  drawIndex: number
}

function requireContextIdentity(context: DatasetEvidenceContext<unknown>, ids: Set<string>): void {
  if (typeof context.datasetId !== 'string' || context.datasetId.length === 0) throw new Error('datasetId must be nonempty')
  if (typeof context.studyGroup !== 'string' || context.studyGroup.length === 0) throw new Error('studyGroup must be nonempty')
  if (ids.has(context.datasetId)) throw new Error(`duplicate dataset ID: ${context.datasetId}`)
  ids.add(context.datasetId)
}

export function stratifiedResample<TEvidence>(
  contexts: readonly DatasetEvidenceContext<TEvidence>[],
  rng: () => number,
): ResampledDatasetContext<TEvidence>[] {
  if (typeof rng !== 'function') throw new Error('rng must be a function')
  const strata = new Map<string, DatasetEvidenceContext<TEvidence>[]>()
  const ids = new Set<string>()
  for (const context of contexts) {
    requireContextIdentity(context, ids)
    const stratum = strata.get(context.studyGroup) ?? []
    stratum.push(context)
    strata.set(context.studyGroup, stratum)
  }

  const sampled: ResampledDatasetContext<TEvidence>[] = []
  for (const studyGroup of sortCodeUnits([...strata.keys()])) {
    const stratum = strata.get(studyGroup)!
    for (let drawIndex = 0; drawIndex < stratum.length; drawIndex += 1) {
      const value = rng()
      if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('rng must return a finite value in [0, 1)')
      const source = stratum[Math.floor(value * stratum.length)]
      sampled.push({
        datasetId: source.datasetId,
        sourceDatasetId: source.datasetId,
        studyGroup: source.studyGroup,
        evidence: source.evidence,
        drawIndex,
      })
    }
  }
  return sampled
}

export function perturbWeights(weights: Readonly<Record<string, number>>, rng: () => number): Record<string, number> {
  if (typeof rng !== 'function') throw new Error('rng must be a function')
  const perturbed: Record<string, number> = {}
  let sum = 0
  for (const key of sortCodeUnits(Object.keys(weights))) {
    const weight = weights[key]
    if (!Number.isFinite(weight) || weight < 0) throw new Error('weights must be finite nonnegative numbers')
    if (weight === 0) {
      perturbed[key] = 0
      continue
    }
    const value = rng()
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('rng must return a finite value in [0, 1)')
    const adjusted = weight * (0.9 + 0.2 * value)
    if (!Number.isFinite(adjusted) || adjusted <= 0) throw new Error('weight perturbation must remain finite and positive')
    perturbed[key] = adjusted
    sum += adjusted
    if (!Number.isFinite(sum)) throw new Error('weight perturbation sum must be finite')
  }
  if (sum <= 0) throw new Error('weights must include a positive weight')
  for (const key of Object.keys(perturbed)) perturbed[key] = perturbed[key] / sum
  return perturbed
}
