export interface ParetoVector {
  methodId: string
  scores: Readonly<Record<string, number>>
  criticalGroups?: readonly string[]
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function sameOrderedValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function orderedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareCodeUnits)
}

function validateVectors(vectors: readonly ParetoVector[]): { dimensions: string[]; criticalGroups: string[] } {
  const ids = new Set<string>()
  let dimensions: string[] | undefined
  let criticalGroups: string[] | undefined

  for (const vector of vectors) {
    if (ids.has(vector.methodId)) throw new Error(`duplicate IDs: ${vector.methodId}`)
    ids.add(vector.methodId)

    const vectorDimensions = Object.keys(vector.scores).sort(compareCodeUnits)
    if (vectorDimensions.length === 0) throw new Error(`missing dimensions: ${vector.methodId}`)
    for (const group of vectorDimensions) {
      if (!Number.isFinite(vector.scores[group])) throw new Error(`non-finite group score: ${vector.methodId}:${group}`)
    }
    if (dimensions === undefined) dimensions = vectorDimensions
    else if (!sameOrderedValues(dimensions, vectorDimensions)) throw new Error('missing dimensions across Pareto vectors')

    const vectorCriticalGroups = orderedUnique(vector.criticalGroups ?? vectorDimensions)
    if (vectorCriticalGroups.some((group) => !Object.hasOwn(vector.scores, group))) {
      throw new Error(`missing critical coverage: ${vector.methodId}`)
    }
    if (criticalGroups === undefined) criticalGroups = vectorCriticalGroups
    else if (!sameOrderedValues(criticalGroups, vectorCriticalGroups)) {
      throw new Error('missing critical coverage across Pareto vectors')
    }
  }

  return { dimensions: dimensions ?? [], criticalGroups: criticalGroups ?? [] }
}

function dominates(
  left: ParetoVector,
  right: ParetoVector,
  dimensions: readonly string[],
  epsilon: number,
): boolean {
  let strictlyGreater = false
  for (const dimension of dimensions) {
    if (left.scores[dimension] < right.scores[dimension] - epsilon) return false
    if (left.scores[dimension] > right.scores[dimension] + epsilon) strictlyGreater = true
  }
  return strictlyGreater
}

export function paretoLayers(vectors: readonly ParetoVector[], epsilon: number = 1e-9): Map<string, number> {
  if (!Number.isFinite(epsilon) || epsilon < 0) throw new Error('epsilon must be finite and nonnegative')
  const { dimensions } = validateVectors(vectors)
  const remaining = [...vectors].sort((left, right) => compareCodeUnits(left.methodId, right.methodId))
  const layers = new Map<string, number>()
  let layer = 0

  while (remaining.length > 0) {
    const frontier = remaining.filter((candidate) => (
      !remaining.some((other) => other !== candidate && dominates(other, candidate, dimensions, epsilon))
    ))
    if (frontier.length === 0) {
      throw new Error(`cyclic epsilon dominance: ${remaining.map(({ methodId }) => methodId).join(', ')}`)
    }
    const frontierIds = new Set(frontier.map(({ methodId }) => methodId))
    for (const vector of frontier) layers.set(vector.methodId, layer)
    remaining.splice(0, remaining.length, ...remaining.filter(({ methodId }) => !frontierIds.has(methodId)))
    layer += 1
  }

  return layers
}
