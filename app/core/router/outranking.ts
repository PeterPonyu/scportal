import { perturbWeights, stratifiedResample, type DatasetEvidenceContext } from './bootstrap.ts'
import { compareCodeUnits, createRng, sortCodeUnits } from './random.ts'

export interface ConditionalMethodEvidence {
  methods: Readonly<Record<string, Readonly<Record<string, number>>>>
}

export interface RobustOutrankingInput {
  contexts: readonly DatasetEvidenceContext<ConditionalMethodEvidence>[]
  weights: Readonly<Record<string, number>>
  delta: number
  replicates: number
  seed: number
  estimateReplicate?: (
    contexts: readonly DatasetEvidenceContext<ConditionalMethodEvidence>[],
    weights: Readonly<Record<string, number>>,
  ) => Readonly<Record<string, number>>
}

export interface OutrankingResult {
  phi: Record<string, number>
  winProbability: Record<string, Record<string, number>>
  topThreeRetention: Record<string, number>
  utilityLowerBound: Record<string, number>
  replicates: number
  seed: number
}

function requireFinite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`outranking numeric overflow: ${label}`)
  return value
}

function methodIds(contexts: readonly DatasetEvidenceContext<ConditionalMethodEvidence>[]): string[] {
  const ids = new Set<string>()
  for (const context of contexts) for (const methodId of Object.keys(context.evidence.methods)) ids.add(methodId)
  return sortCodeUnits([...ids])
}

function utility(
  context: DatasetEvidenceContext<ConditionalMethodEvidence>,
  methodId: string,
  weights: Readonly<Record<string, number>>,
): number {
  const estimates = context.evidence.methods[methodId]
  if (!estimates) throw new Error(`missing conditional group evidence: ${context.datasetId}:${methodId}`)
  let value = 0
  for (const group of Object.keys(weights)) {
    if (!Object.hasOwn(estimates, group)) throw new Error(`missing conditional group evidence: ${context.datasetId}:${methodId}:${group}`)
    const estimate = estimates[group]
    if (!Number.isFinite(estimate)) throw new Error(`non-finite conditional group evidence: ${context.datasetId}:${methodId}:${group}`)
    value = requireFinite(value + weights[group] * estimate, 'utility')
  }
  return value
}

function utilities(
  contexts: readonly DatasetEvidenceContext<ConditionalMethodEvidence>[],
  methodIds: readonly string[],
  weights: Readonly<Record<string, number>>,
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const methodId of methodIds) {
    let sum = 0
    for (const context of contexts) sum = requireFinite(sum + utility(context, methodId, weights), 'utility sum')
    result[methodId] = contexts.length === 0 ? 0 : requireFinite(sum / contexts.length, 'utility mean')
  }
  return result
}

function rankedMethodIds(values: Readonly<Record<string, number>>): string[] {
  return Object.keys(values).sort((left, right) => values[right] - values[left] || compareCodeUnits(left, right))
}

function topThreeMethodIds(values: Readonly<Record<string, number>>): Set<string> {
  const ranked = rankedMethodIds(values)
  if (ranked.length <= 3) return new Set(ranked)
  const thirdUtility = values[ranked[2]]
  return new Set(ranked.filter((methodId) => values[methodId] >= thirdUtility))
}

function validateReplicateUtilities(values: Readonly<Record<string, number>>, ids: readonly string[]): Record<string, number> {
  const result: Record<string, number> = Object.create(null)
  for (const methodId of ids) {
    if (!Object.hasOwn(values, methodId) || !Number.isFinite(values[methodId])) throw new Error(`invalid replicate utility: ${methodId}`)
    result[methodId] = values[methodId]
  }
  return result
}

export function empiricalFifthPercentile(values: readonly number[]): number {
  if (values.length === 0) throw new Error('percentile requires at least one value')
  const ordered = [...values]
  for (const value of ordered) if (!Number.isFinite(value)) throw new Error('percentile values must be finite')
  ordered.sort((left, right) => left - right)
  return ordered[Math.floor(0.05 * (ordered.length - 1))]
}

export function robustOutranking(input: RobustOutrankingInput): OutrankingResult {
  if (!Number.isFinite(input.delta) || input.delta < 0) throw new Error('delta must be finite and nonnegative')
  if (!Number.isInteger(input.replicates) || input.replicates <= 0) throw new Error('replicates must be a positive integer')
  const rng = createRng(input.seed)
  stratifiedResample(input.contexts, () => 0.5)
  const ids = methodIds(input.contexts)
  const wins = new Map<string, Map<string, number>>()
  const retention = new Map<string, number>()
  const replicateUtilities = new Map<string, number[]>()
  for (const methodId of ids) {
    wins.set(methodId, new Map(ids.map((opponentId) => [opponentId, 0])))
    retention.set(methodId, 0)
    replicateUtilities.set(methodId, [])
  }
  for (let replicate = 0; replicate < input.replicates; replicate += 1) {
    const sampled = stratifiedResample(input.contexts, rng)
    const weights = perturbWeights(input.weights, rng)
    const values = input.estimateReplicate
      ? validateReplicateUtilities(input.estimateReplicate(sampled, weights), ids)
      : utilities(sampled, ids, weights)
    const topThree = topThreeMethodIds(values)
    for (const methodId of ids) {
      replicateUtilities.get(methodId)!.push(values[methodId])
      if (topThree.has(methodId)) retention.set(methodId, retention.get(methodId)! + 1)
      for (const opponentId of ids) {
        if (values[methodId] > values[opponentId] + input.delta) wins.get(methodId)!.set(opponentId, wins.get(methodId)!.get(opponentId)! + 1)
      }
    }
  }
  const phi: Record<string, number> = {}
  const winProbability: Record<string, Record<string, number>> = {}
  const topThreeRetention: Record<string, number> = {}
  const utilityLowerBound: Record<string, number> = {}
  for (const methodId of ids) {
    winProbability[methodId] = {}
    let net = 0
    for (const opponentId of ids) {
      const probability = wins.get(methodId)!.get(opponentId)! / input.replicates
      winProbability[methodId][opponentId] = requireFinite(probability, 'win probability')
      if (methodId !== opponentId) net = requireFinite(net + probability - wins.get(opponentId)!.get(methodId)! / input.replicates, 'net flow')
    }
    phi[methodId] = ids.length <= 1 ? 0 : requireFinite(net / (ids.length - 1), 'phi')
    topThreeRetention[methodId] = requireFinite(retention.get(methodId)! / input.replicates, 'top-three retention')
    utilityLowerBound[methodId] = empiricalFifthPercentile(replicateUtilities.get(methodId)!)
  }
  return { phi, winProbability, topThreeRetention, utilityLowerBound, replicates: input.replicates, seed: input.seed }
}
