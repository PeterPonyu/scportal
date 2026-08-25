import { robustOutranking, type ConditionalMethodEvidence } from './outranking.ts'
import { filterCompatibleMethods } from './constraints.ts'
import { gowerSimilarity, type ContextFeatureWeights } from './gower.ts'
import { percentileNormalize } from './normalize.ts'
import { paretoLayers } from './pareto.ts'
import { shrunkenEstimate } from './shrinkage.ts'
import { gradeConfidence, type ConfidenceResult } from './confidence.ts'
import { explainRecommendation } from './explain.ts'
import type {
  BenchmarkObservation,
  DatasetContext,
  EvidenceProvenance,
  MethodCapability,
  MetricDefinition,
  MetricGroup,
  Recommendation,
  RouterInput,
  RouterOptions,
  RouterOutcome,
  TaskProfile,
} from './types.ts'
import { absoluteHttpUrl, rfc3339DateTime } from './validation.ts'

const groups: readonly MetricGroup[] = ['latent_geometry', 'continuity', 'trajectory', 'stability', 'biology', 'resources']
const modalities = ['scrna', 'scatac', 'multiome'] as const
const scales = ['lt_10k', '10k_50k', '50k_200k', 'gt_200k', 'unknown'] as const
const topologies = ['linear', 'bifurcating', 'multibranch', 'cyclic', 'mixed', 'unknown'] as const
const priorKeys = ['time', 'root_state', 'terminal_states', 'labels', 'perturbation'] as const
const goals = ['latent_representation', 'trajectory_reconstruction', 'fate_decision', 'lineage_contribution'] as const
const outputs = ['latent', 'graph', 'pseudotime', 'branch', 'metadata'] as const
const directions = ['higher_is_better', 'lower_is_better'] as const
const defaultWeights: ContextFeatureWeights = { modality: 1, scale: 1, topology: 1, priors: 1, perturbation: 1 }
const defaultOptions = { shrinkageAlpha: 1, bootstrapReplicates: 200, outrankingDelta: 0.02, minimumTopThreeRetention: 0.5 }
const routerInputFields = ['profile', 'datasets', 'methods', 'metrics', 'observations', 'evidenceVersion', 'routerVersion', 'releaseSynthetic'] as const

type DataRecord = Record<string, unknown>
type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

interface ParsedOptions {
  contextFeatureWeights: ContextFeatureWeights
  shrinkageAlpha: number
  bootstrapReplicates: number
  outrankingDelta: number
  minimumTopThreeRetention: number
}

interface CandidateEvidence {
  scores: Record<string, number>
  variance: number
  effectiveDatasets: number
  criticalCoverage: number
}

function compare(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0 }
function success<T>(value: T): Parsed<T> { return { ok: true, value } }
function failure<T>(error: string): Parsed<T> { return { ok: false, error } }
function inSet<T extends string>(value: unknown, values: readonly T[]): value is T { return typeof value === 'string' && values.includes(value as T) }
function nonempty(value: unknown): value is string { return typeof value === 'string' && value.length > 0 && ![...value].some((character) => { const code = character.charCodeAt(0); return code <= 0x1f || code === 0x7f }) }
function identifier(value: unknown): value is string { return nonempty(value) && /\S/.test(value) && value.trim() === value }

function exactRecord(value: unknown, required: readonly string[], optional: readonly string[] = []): Parsed<DataRecord> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return failure('must be a plain object')
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) return failure('must be a plain own-data object')
  const allowed = new Set([...required, ...optional])
  const keys = Reflect.ownKeys(value)
  if (keys.some((key) => typeof key !== 'string' || !allowed.has(key))) return failure('contains unknown or symbol fields')
  const record: DataRecord = Object.create(null)
  for (const key of keys) {
    if (typeof key !== 'string') return failure('contains a symbol field')
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) return failure(`${key} must be enumerable own data`)
    record[key] = descriptor.value
  }
  for (const key of required) if (!Object.hasOwn(record, key)) return failure(`missing required own field ${key}`)
  return success(record)
}

function dataArray(value: unknown): Parsed<unknown[]> {
  if (!Array.isArray(value)) return failure('must be a plain array')
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Array.prototype && prototype !== null) return failure('must be a plain array')
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length')
  if (!lengthDescriptor || !Object.hasOwn(lengthDescriptor, 'value') || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0) return failure('has invalid array length')
  const length = lengthDescriptor.value
  const keys = Reflect.ownKeys(value)
  if (keys.length !== length + 1) return failure('must be dense and contain no extra fields')
  const result: unknown[] = []
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) return failure('array items must be enumerable own data')
    result.push(descriptor.value)
  }
  return success(result)
}

function typedArray<T>(value: unknown, label: string, valid: (item: unknown) => item is T, minimum = 0): Parsed<T[]> {
  const parsed = dataArray(value)
  if (!parsed.ok) return failure(`${label} ${parsed.error}`)
  if (parsed.value.length < minimum || parsed.value.some((item) => !valid(item))) return failure(`${label} has invalid items`)
  return success(parsed.value as T[])
}

function uniqueStrings(values: readonly string[], label: string, normalize: (value: string) => string = (value) => value): Parsed<string[]> {
  return new Set(values.map(normalize)).size === values.length ? success([...values]) : failure(`${label} contains duplicates`)
}

function parsePriors(value: unknown, allowUnknown: boolean): Parsed<TaskProfile['priors']> {
  const parsed = exactRecord(value, [], priorKeys)
  if (!parsed.ok) return failure(`priors ${parsed.error}`)
  const priors: TaskProfile['priors'] = {}
  for (const key of priorKeys) {
    if (!Object.hasOwn(parsed.value, key)) continue
    const prior = parsed.value[key]
    if (typeof prior !== 'boolean' && !(allowUnknown && prior === 'unknown')) return failure(`priors.${key} is invalid`)
    priors[key] = prior
  }
  return success(priors)
}

function parseAliases(value: unknown): Parsed<string[]> {
  const parsed = typedArray(value, 'aliases', identifier)
  return !parsed.ok ? parsed : uniqueStrings(parsed.value, 'aliases', (alias) => alias.toLowerCase())
}

function parseDataset(value: unknown): Parsed<DatasetContext> {
  const parsed = exactRecord(value, ['id', 'aliases', 'studyGroup', 'modality', 'scale', 'topology', 'priors', 'perturbation'])
  if (!parsed.ok) return failure(`dataset ${parsed.error}`)
  const aliases = parseAliases(parsed.value.aliases)
  const priors = parsePriors(parsed.value.priors, false)
  if (!identifier(parsed.value.id) || !aliases.ok || !nonempty(parsed.value.studyGroup) || !inSet(parsed.value.modality, modalities) || !inSet(parsed.value.scale, scales) || !inSet(parsed.value.topology, topologies) || !priors.ok || (typeof parsed.value.perturbation !== 'boolean' && parsed.value.perturbation !== 'unknown')) return failure('dataset has invalid fields')
  return success({ id: parsed.value.id, aliases: aliases.value, studyGroup: parsed.value.studyGroup, modality: parsed.value.modality, scale: parsed.value.scale, topology: parsed.value.topology, priors: priors.value as DatasetContext['priors'], perturbation: parsed.value.perturbation })
}

function parseMethod(value: unknown): Parsed<MethodCapability> {
  const parsed = exactRecord(value, ['id', 'aliases', 'version', 'modalities', 'maxScale', 'outputs', 'requiredPriors', 'supportedGoals', 'resourceTier', 'installCommand', 'license', 'sourceUrl', 'docsUrl', 'paperUrl', 'executable'])
  if (!parsed.ok) return failure(`method ${parsed.error}`)
  const aliases = parseAliases(parsed.value.aliases)
  const parsedModalities = typedArray(parsed.value.modalities, 'modalities', (item): item is MethodCapability['modalities'][number] => inSet(item, modalities), 1)
  const parsedOutputs = typedArray(parsed.value.outputs, 'outputs', (item): item is MethodCapability['outputs'][number] => inSet(item, outputs), 1)
  const requiredPriors = typedArray(parsed.value.requiredPriors, 'requiredPriors', (item): item is MethodCapability['requiredPriors'][number] => inSet(item, priorKeys))
  const supportedGoals = typedArray(parsed.value.supportedGoals, 'supportedGoals', (item): item is MethodCapability['supportedGoals'][number] => inSet(item, goals), 1)
  const uniqueOutputs = parsedOutputs.ok ? uniqueStrings(parsedOutputs.value, 'outputs') : parsedOutputs
  if (!identifier(parsed.value.id) || !aliases.ok || !nonempty(parsed.value.version) || !parsedModalities.ok || !inSet(parsed.value.maxScale, scales.slice(0, 4)) || !parsedOutputs.ok || !uniqueOutputs.ok || !requiredPriors.ok || !supportedGoals.ok || ![1, 2, 3].includes(parsed.value.resourceTier as number) || !nonempty(parsed.value.installCommand) || !nonempty(parsed.value.license) || !absoluteHttpUrl(parsed.value.sourceUrl) || !absoluteHttpUrl(parsed.value.docsUrl) || !absoluteHttpUrl(parsed.value.paperUrl) || typeof parsed.value.executable !== 'boolean') return failure('method has invalid fields')
  return success({ id: parsed.value.id, aliases: aliases.value, version: parsed.value.version, modalities: parsedModalities.value, maxScale: parsed.value.maxScale as MethodCapability['maxScale'], outputs: parsedOutputs.value, requiredPriors: requiredPriors.value, supportedGoals: supportedGoals.value, resourceTier: parsed.value.resourceTier as 1 | 2 | 3, installCommand: parsed.value.installCommand, license: parsed.value.license, sourceUrl: parsed.value.sourceUrl, docsUrl: parsed.value.docsUrl, paperUrl: parsed.value.paperUrl, executable: parsed.value.executable })
}

function parseMetric(value: unknown): Parsed<MetricDefinition> {
  const parsed = exactRecord(value, ['id', 'aliases', 'group', 'direction', 'auxiliary', 'description'])
  if (!parsed.ok) return failure(`metric ${parsed.error}`)
  const aliases = parseAliases(parsed.value.aliases)
  if (!identifier(parsed.value.id) || !aliases.ok || !inSet(parsed.value.group, groups) || !inSet(parsed.value.direction, directions) || typeof parsed.value.auxiliary !== 'boolean' || !nonempty(parsed.value.description)) return failure('metric has invalid fields')
  return success({ id: parsed.value.id, aliases: aliases.value, group: parsed.value.group, direction: parsed.value.direction, auxiliary: parsed.value.auxiliary, description: parsed.value.description })
}

function parseProvenance(value: unknown): Parsed<EvidenceProvenance> {
  const parsed = exactRecord(value, ['paperId', 'locator', 'datasetVersion', 'methodVersion', 'runConfigId', 'extractedAt'])
  if (!parsed.ok) return failure(`provenance ${parsed.error}`)
  if (!identifier(parsed.value.paperId) || !nonempty(parsed.value.locator) || !nonempty(parsed.value.datasetVersion) || !nonempty(parsed.value.methodVersion) || !identifier(parsed.value.runConfigId) || !rfc3339DateTime(parsed.value.extractedAt)) return failure('provenance has invalid fields')
  return success(parsed.value as unknown as EvidenceProvenance)
}

function parseObservation(value: unknown): Parsed<BenchmarkObservation> {
  const parsed = exactRecord(value, ['datasetId', 'methodId', 'metricId', 'rawValue', 'provenance'])
  if (!parsed.ok) return failure(`observation ${parsed.error}`)
  const provenance = parseProvenance(parsed.value.provenance)
  if (!identifier(parsed.value.datasetId) || !identifier(parsed.value.methodId) || !identifier(parsed.value.metricId) || !Number.isFinite(parsed.value.rawValue) || !provenance.ok) return failure('observation has invalid fields or provenance')
  return success({ datasetId: parsed.value.datasetId, methodId: parsed.value.methodId, metricId: parsed.value.metricId, rawValue: parsed.value.rawValue as number, provenance: provenance.value })
}

function parseWeights(value: unknown): Parsed<TaskProfile['weights']> {
  const parsed = exactRecord(value, groups)
  if (!parsed.ok) return failure(`weights ${parsed.error}`)
  const weights = {} as TaskProfile['weights']
  let sum = 0
  for (const group of groups) {
    const weight = parsed.value[group]
    if (!Number.isFinite(weight) || (weight as number) < 0) return failure(`weights.${group} must be finite and nonnegative`)
    weights[group] = weight as number
    sum += weight as number
  }
  if (!Number.isFinite(sum) || sum <= 0) return failure('weights must sum to a positive value')
  return success(weights)
}

function parseProfile(value: unknown): Parsed<TaskProfile> {
  const parsed = exactRecord(value, ['id', 'modality', 'scale', 'goals', 'topology', 'priors', 'perturbation', 'weights', 'maxResourceTier', 'minEffectiveDatasets', 'minCriticalCoverage', 'seed'], ['candidateMethodIds'])
  if (!parsed.ok) return failure(`profile ${parsed.error}`)
  const parsedGoals = typedArray(parsed.value.goals, 'goals', (item): item is TaskProfile['goals'][number] => inSet(item, goals), 1)
  const priors = parsePriors(parsed.value.priors, true)
  const weights = parseWeights(parsed.value.weights)
  const candidates = Object.hasOwn(parsed.value, 'candidateMethodIds') ? typedArray(parsed.value.candidateMethodIds, 'candidateMethodIds', identifier) : success<string[] | undefined>(undefined)
  const uniqueGoals = parsedGoals.ok ? uniqueStrings(parsedGoals.value, 'goals') : parsedGoals
  const uniqueCandidates = candidates.ok && candidates.value !== undefined ? uniqueStrings(candidates.value, 'candidateMethodIds') : candidates
  if (!identifier(parsed.value.id) || !inSet(parsed.value.modality, modalities) || !inSet(parsed.value.scale, scales) || !parsedGoals.ok || !uniqueGoals.ok || !inSet(parsed.value.topology, topologies) || !priors.ok || (typeof parsed.value.perturbation !== 'boolean' && parsed.value.perturbation !== 'unknown') || !weights.ok || ![1, 2, 3].includes(parsed.value.maxResourceTier as number) || !Number.isInteger(parsed.value.minEffectiveDatasets) || (parsed.value.minEffectiveDatasets as number) < 1 || !Number.isFinite(parsed.value.minCriticalCoverage) || (parsed.value.minCriticalCoverage as number) < 0 || (parsed.value.minCriticalCoverage as number) > 1 || !Number.isInteger(parsed.value.seed) || (parsed.value.seed as number) < 0 || (parsed.value.seed as number) > 0xffffffff || !candidates.ok || !uniqueCandidates.ok) return failure('profile has invalid fields')
  return success({ id: parsed.value.id, modality: parsed.value.modality, scale: parsed.value.scale, goals: parsedGoals.value, topology: parsed.value.topology, priors: priors.value, perturbation: parsed.value.perturbation, weights: weights.value, maxResourceTier: parsed.value.maxResourceTier as 1 | 2 | 3, minEffectiveDatasets: parsed.value.minEffectiveDatasets as number, minCriticalCoverage: parsed.value.minCriticalCoverage as number, seed: parsed.value.seed as number, ...(candidates.value === undefined ? {} : { candidateMethodIds: candidates.value }) })
}

function parseEntityArray<T>(value: unknown, label: string, parse: (item: unknown) => Parsed<T>): Parsed<T[]> {
  const parsed = dataArray(value)
  if (!parsed.ok) return failure(`${label} ${parsed.error}`)
  const result: T[] = []
  for (const item of parsed.value) {
    const entity = parse(item)
    if (!entity.ok) return failure(entity.error)
    result.push(entity.value)
  }
  return success(result)
}

function assertUniqueIdentities(kind: string, entities: readonly { id: string; aliases: string[] }[]): string | undefined {
  const seen = new Set<string>()
  for (const entity of entities) {
    for (const identity of [entity.id, ...entity.aliases]) {
      const normalized = identity.toLowerCase()
      if (seen.has(normalized)) return `duplicate canonical ${kind} identity: ${identity}`
      seen.add(normalized)
    }
  }
  return undefined
}

function parseRouterInput(value: unknown): Parsed<RouterInput> {
  const parsed = exactRecord(value, routerInputFields)
  if (!parsed.ok) return failure(`invalid Router input: ${parsed.error}`)
  const profile = parseProfile(parsed.value.profile)
  const datasets = parseEntityArray(parsed.value.datasets, 'datasets', parseDataset)
  const methods = parseEntityArray(parsed.value.methods, 'methods', parseMethod)
  const metrics = parseEntityArray(parsed.value.metrics, 'metrics', parseMetric)
  const observations = parseEntityArray(parsed.value.observations, 'observations', parseObservation)
  const invalid = [profile, datasets, methods, metrics, observations].find((result) => !result.ok)
  if (!profile.ok || !datasets.ok || !methods.ok || !metrics.ok || !observations.ok) return failure(`invalid Router input: ${invalid && !invalid.ok ? invalid.error : 'invalid records'}`)
  if (!identifier(parsed.value.evidenceVersion) || !identifier(parsed.value.routerVersion) || typeof parsed.value.releaseSynthetic !== 'boolean') return failure('invalid Router input: versions and releaseSynthetic must be own typed fields')
  const identityError = assertUniqueIdentities('dataset', datasets.value) ?? assertUniqueIdentities('method', methods.value) ?? assertUniqueIdentities('metric', metrics.value)
  if (identityError) return failure(`invalid Router input: ${identityError}`)
  const datasetIds = new Set(datasets.value.map(({ id }) => id))
  const methodsById = new Map(methods.value.map((method) => [method.id, method]))
  const metricIds = new Set(metrics.value.map(({ id }) => id))
  const candidateIds = profile.value.candidateMethodIds
  if (candidateIds) {
    const unique = new Set(candidateIds)
    if (unique.size !== candidateIds.length || candidateIds.some((id) => !methodsById.has(id))) return failure('invalid canonical candidateMethodIds: IDs must be known and unique')
  }
  const observationKeys = new Map<string, Map<string, Map<string, Set<string>>>>()
  for (const observation of observations.value) {
    const method = methodsById.get(observation.methodId)
    if (!datasetIds.has(observation.datasetId) || !method || !metricIds.has(observation.metricId)) return failure('observations must use canonical registry IDs')
    if (observation.provenance.methodVersion !== method.version) return failure(`observation method version mismatch: ${observation.methodId}`)
    const methodKeys = observationKeys.get(observation.datasetId) ?? new Map<string, Map<string, Set<string>>>()
    observationKeys.set(observation.datasetId, methodKeys)
    const metricKeys = methodKeys.get(observation.methodId) ?? new Map<string, Set<string>>()
    methodKeys.set(observation.methodId, metricKeys)
    const runConfigKeys = metricKeys.get(observation.metricId) ?? new Set<string>()
    metricKeys.set(observation.metricId, runConfigKeys)
    if (runConfigKeys.has(observation.provenance.runConfigId)) return failure('duplicate canonical observation')
    runConfigKeys.add(observation.provenance.runConfigId)
  }
  return success({ profile: profile.value, datasets: datasets.value, methods: methods.value, metrics: metrics.value, observations: observations.value, evidenceVersion: parsed.value.evidenceVersion, routerVersion: parsed.value.routerVersion, releaseSynthetic: parsed.value.releaseSynthetic })
}

function parseContextWeights(value: unknown): Parsed<ContextFeatureWeights> {
  const keys = ['modality', 'scale', 'topology', 'priors', 'perturbation'] as const
  const parsed = exactRecord(value, keys)
  if (!parsed.ok) return failure(`contextFeatureWeights option ${parsed.error}`)
  const result = {} as ContextFeatureWeights
  let total = 0
  for (const key of keys) {
    const weight = parsed.value[key]
    if (!Number.isFinite(weight) || (weight as number) < 0) return failure(`contextFeatureWeights option ${key} must be finite and nonnegative`)
    result[key] = weight as number
    total += weight as number
  }
  if (!Number.isFinite(total) || total <= 0) return failure('contextFeatureWeights option weights must have a positive total')
  return success(result)
}

function parseRouterOptions(value: unknown): Parsed<ParsedOptions> {
  const parsed = exactRecord(value, [], ['contextFeatureWeights', 'shrinkageAlpha', 'bootstrapReplicates', 'outrankingDelta', 'minimumTopThreeRetention'])
  if (!parsed.ok) return failure(`invalid Router option: ${parsed.error}`)
  const contextWeights = Object.hasOwn(parsed.value, 'contextFeatureWeights') ? parseContextWeights(parsed.value.contextFeatureWeights) : success(defaultWeights)
  const shrinkageAlpha = Object.hasOwn(parsed.value, 'shrinkageAlpha') ? parsed.value.shrinkageAlpha : defaultOptions.shrinkageAlpha
  const bootstrapReplicates = Object.hasOwn(parsed.value, 'bootstrapReplicates') ? parsed.value.bootstrapReplicates : defaultOptions.bootstrapReplicates
  const outrankingDelta = Object.hasOwn(parsed.value, 'outrankingDelta') ? parsed.value.outrankingDelta : defaultOptions.outrankingDelta
  const minimumTopThreeRetention = Object.hasOwn(parsed.value, 'minimumTopThreeRetention') ? parsed.value.minimumTopThreeRetention : defaultOptions.minimumTopThreeRetention
  if (!contextWeights.ok) return failure(contextWeights.error)
  if (!Number.isFinite(shrinkageAlpha) || (shrinkageAlpha as number) <= 0) return failure('invalid Router option: shrinkageAlpha must be finite and positive')
  if (!Number.isInteger(bootstrapReplicates) || (bootstrapReplicates as number) <= 0) return failure('invalid Router option: bootstrapReplicates must be a positive integer')
  if (!Number.isFinite(outrankingDelta) || (outrankingDelta as number) < 0) return failure('invalid Router option: outrankingDelta must be finite and nonnegative')
  if (!Number.isFinite(minimumTopThreeRetention) || (minimumTopThreeRetention as number) < 0 || (minimumTopThreeRetention as number) > 1) return failure('invalid Router option: minimumTopThreeRetention must be between 0 and 1')
  return success({ contextFeatureWeights: contextWeights.value, shrinkageAlpha: shrinkageAlpha as number, bootstrapReplicates: bootstrapReplicates as number, outrankingDelta: outrankingDelta as number, minimumTopThreeRetention: minimumTopThreeRetention as number })
}

function safeOwnData(value: unknown, key: string): unknown {
  if (value === null || typeof value !== 'object') return undefined
  const descriptor = Object.getOwnPropertyDescriptor(value, key)
  return descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined
}

function refused(input: unknown, code: Extract<RouterOutcome, { status: 'REFUSED' }>['code'], evidenceGaps: string[], candidates: string[] = []): RouterOutcome {
  const profile = safeOwnData(input, 'profile')
  const seed = safeOwnData(profile, 'seed')
  const evidenceVersion = safeOwnData(input, 'evidenceVersion')
  const routerVersion = safeOwnData(input, 'routerVersion')
  return { status: 'REFUSED', code, candidates: [...candidates].sort(compare), evidenceGaps, seed: Number.isInteger(seed) && (seed as number) >= 0 && (seed as number) <= 0xffffffff ? seed as number : 0, evidenceVersion: typeof evidenceVersion === 'string' ? evidenceVersion : 'invalid', routerVersion: typeof routerVersion === 'string' ? routerVersion : 'invalid' }
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function meanRunValue(runs: readonly BenchmarkObservation[]): number {
  let scale = 0
  for (const run of runs) scale = Math.max(scale, Math.abs(run.rawValue))
  if (scale === 0) return 0
  let scaledTotal = 0
  for (const run of runs) {
    scaledTotal += run.rawValue / scale
    if (!Number.isFinite(scaledTotal)) throw new Error('observation run mean overflow')
  }
  const mean = scale * (scaledTotal / runs.length)
  if (!Number.isFinite(mean)) throw new Error('observation run mean overflow')
  return mean
}

function aggregateObservationRuns(observations: readonly BenchmarkObservation[]): BenchmarkObservation[] {
  const datasets = new Map<string, Map<string, Map<string, BenchmarkObservation[]>>>()
  for (const observation of observations) {
    const methods = datasets.get(observation.datasetId) ?? new Map<string, Map<string, BenchmarkObservation[]>>()
    datasets.set(observation.datasetId, methods)
    const metrics = methods.get(observation.methodId) ?? new Map<string, BenchmarkObservation[]>()
    methods.set(observation.methodId, metrics)
    const runs = metrics.get(observation.metricId) ?? []
    metrics.set(observation.metricId, runs)
    runs.push(observation)
  }
  const aggregated: BenchmarkObservation[] = []
  for (const datasetId of [...datasets.keys()].sort(compare)) {
    const methods = datasets.get(datasetId)!
    for (const methodId of [...methods.keys()].sort(compare)) {
      const metrics = methods.get(methodId)!
      for (const metricId of [...metrics.keys()].sort(compare)) {
        const runs = [...metrics.get(metricId)!].sort((left, right) => compare(left.provenance.runConfigId, right.provenance.runConfigId))
        // Scoring needs one existing provenance-shaped row; explanations consume every original run below.
        aggregated.push({ ...runs[0], rawValue: meanRunValue(runs) })
      }
    }
  }
  return aggregated
}

function routeMethodsUnchecked(input: RouterInput, options: ParsedOptions): RouterOutcome {
  const { compatible, excluded } = filterCompatibleMethods(input.profile, input.methods)
  if (compatible.length === 0) {
    const conflict = excluded.length > 0 && excluded.every((item) => item.reasons.some((reason) => reason === 'RESOURCE_LIMIT' || reason === 'MISSING_OUTPUT' || reason === 'MISSING_REQUIRED_PRIOR'))
    return refused(input, conflict ? 'CONFLICTING_REQUIREMENTS' : 'NO_COMPATIBLE_METHOD', ['no compatible method after hard constraints'])
  }
  const selectedGroups = groups.filter((group) => input.profile.weights[group] > 0)
  const selectedWeights = Object.fromEntries(selectedGroups.map((group) => [group, input.profile.weights[group]]))
  const metricGroups = new Map(input.metrics.map((metric) => [metric.id, metric.group]))
  const selectedMetrics = input.metrics.filter((metric) => !metric.auxiliary && selectedGroups.includes(metric.group))
  const selectedMetricIds = new Set(selectedMetrics.map((metric) => metric.id))
  const compatibleIds = new Set(compatible.map((method) => method.id))
  const observations = input.observations.filter((observation) => compatibleIds.has(observation.methodId) && selectedMetricIds.has(observation.metricId))
  const normalized = percentileNormalize(aggregateObservationRuns(observations), new Map(input.metrics.map((metric) => [metric.id, metric])))
  const similarities = new Map(input.datasets.map((dataset) => [dataset.id, gowerSimilarity(input.profile, dataset, options.contextFeatureWeights)]))
  const candidates = new Map<string, CandidateEvidence>()
  for (const method of compatible) {
    const scores: Record<string, number> = {}
    const estimates = selectedGroups.flatMap((group) => {
      const groupMetrics = selectedMetrics.filter((metric) => metric.group === group)
      const metricEstimates = groupMetrics.map((metric) => {
        const samples = normalized.filter((observation) => observation.methodId === method.id && observation.metricId === metric.id)
          .map((observation) => ({ similarity: similarities.get(observation.datasetId)!, value: observation.percentile }))
        const empiricalPrior = normalized.filter((observation) => observation.metricId === metric.id)
        const prior = empiricalPrior.length === 0 ? 0.5 : average(empiricalPrior.map((observation) => observation.percentile))
        return shrunkenEstimate(samples, prior, options.shrinkageAlpha, input.datasets.length)
      })
      scores[group] = metricEstimates.length === 0 ? 0.5 : average(metricEstimates.map((estimate) => estimate.mean))
      return metricEstimates
    })
    const criticalCoverage = estimates.length === 0 ? 0 : Math.min(...estimates.map((estimate) => estimate.coverage))
    candidates.set(method.id, { scores, effectiveDatasets: estimates.length === 0 ? 0 : Math.min(...estimates.map((estimate) => estimate.effectiveDatasets)), criticalCoverage, variance: estimates.length === 0 ? 0 : average(estimates.map((estimate) => estimate.variance)) })
  }

  const coverageQualified = compatible.map(({ id }) => id).filter((methodId) => candidates.get(methodId)!.criticalCoverage >= input.profile.minCriticalCoverage)
  if (coverageQualified.length === 0) return refused(input, 'CRITICAL_COVERAGE_GAP', ['no candidate meets the critical coverage threshold'], compatible.map(({ id }) => id))
  const layers = paretoLayers(coverageQualified.map((methodId) => ({ methodId, scores: candidates.get(methodId)!.scores, criticalGroups: selectedGroups })))
  const frontier = coverageQualified.filter((methodId) => layers.get(methodId) === 0)
  const evidenceQualified = frontier.filter((methodId) => candidates.get(methodId)!.effectiveDatasets >= input.profile.minEffectiveDatasets)
  if (evidenceQualified.length === 0) return refused(input, 'INSUFFICIENT_EVIDENCE', ['no Pareto candidate meets the effective dataset threshold'], frontier)

  const contexts = input.datasets.flatMap((dataset) => {
    const methods: Record<string, Record<string, number>> = {}
    for (const methodId of evidenceQualified) {
      const groupValues: Record<string, number> = {}
      for (const group of selectedGroups) {
        const observed = normalized.filter((observation) => observation.datasetId === dataset.id && observation.methodId === methodId && metricGroups.get(observation.metricId) === group)
        if (observed.length === 0) return []
        const percentile = average(observed.map((observation) => observation.percentile))
        const similarity = similarities.get(dataset.id)!
        groupValues[group] = 0.5 + similarity * (percentile - 0.5)
      }
      methods[methodId] = groupValues
    }
    return [{ datasetId: dataset.id, studyGroup: dataset.studyGroup, evidence: { methods } satisfies ConditionalMethodEvidence }]
  })
  if (contexts.length === 0) return refused(input, 'INSUFFICIENT_EVIDENCE', ['no common bootstrap context across qualified candidates and selected groups'], evidenceQualified)
  const outranking = robustOutranking({ contexts, weights: selectedWeights, delta: options.outrankingDelta, replicates: options.bootstrapReplicates, seed: input.profile.seed })
  const ranked = [...evidenceQualified].sort((left, right) => outranking.phi[right] - outranking.phi[left] || outranking.utilityLowerBound[right] - outranking.utilityLowerBound[left] || compare(left, right))
  const topTwoMargin = ranked.length < 2 ? 1 : Math.max(0, outranking.phi[ranked[0]] - outranking.phi[ranked[1]])
  const confidence = new Map<string, ConfidenceResult>()
  for (const methodId of ranked) {
    const candidate = candidates.get(methodId)!
    confidence.set(methodId, gradeConfidence({ effectiveDatasets: candidate.effectiveDatasets, criticalCoverage: candidate.criticalCoverage, weightedVariance: candidate.variance, topThreeRetention: outranking.topThreeRetention[methodId], topTwoMargin }, { minEffectiveDatasets: input.profile.minEffectiveDatasets, minCriticalCoverage: input.profile.minCriticalCoverage, maxWeightedVariance: 0.1, minTopThreeRetention: options.minimumTopThreeRetention, minTopTwoMargin: 0 }))
  }
  const stable = ranked.filter((methodId) => outranking.topThreeRetention[methodId] >= options.minimumTopThreeRetention)
  if (stable.length === 0) return refused(input, 'UNSTABLE_TOP_THREE', ['no candidate meets the nominal top-three retention threshold'], ranked)
  const qualified = stable.filter((methodId) => confidence.get(methodId)!.grade !== 'low')
  if (qualified.length === 0) return refused(input, 'INSUFFICIENT_EVIDENCE', ['no stable candidate has acceptable confidence'], stable)

  const bestFit = qualified[0]
  const robust = [...qualified].sort((left, right) => outranking.topThreeRetention[right] - outranking.topThreeRetention[left] || candidates.get(left)!.variance - candidates.get(right)!.variance || compare(left, right))[0]
  const scientificFloor = outranking.utilityLowerBound[bestFit] - 0.02
  const resource = [...qualified].filter((methodId) => outranking.utilityLowerBound[methodId] >= scientificFloor).sort((left, right) => input.methods.find((method) => method.id === left)!.resourceTier - input.methods.find((method) => method.id === right)!.resourceTier || compare(left, right))[0]
  const roles = new Map<string, Recommendation['roles']>()
  for (const [methodId, role] of [[bestFit, 'best_fit'], [robust, 'robust_alternative'], [resource, 'resource_aware']] as const) roles.set(methodId, [...(roles.get(methodId) ?? []), role])
  const recommendations = [...roles.keys()].sort(compare).map((methodId) => {
    const candidate = candidates.get(methodId)!
    return { methodId, roles: roles.get(methodId)!, paretoLayer: 0, outrankingFlow: outranking.phi[methodId], conservativeUtility: outranking.utilityLowerBound[methodId], confidence: confidence.get(methodId)!.grade, topThreeRetention: outranking.topThreeRetention[methodId], effectiveDatasets: candidate.effectiveDatasets, criticalCoverage: candidate.criticalCoverage, ...explainRecommendation({ methodId, profile: input.profile, groupScores: candidate.scores, observations, metricGroups, synthetic: input.releaseSynthetic }), excludedAlternatives: excluded }
  })
  return { status: 'OK', recommendations, seed: input.profile.seed, evidenceVersion: input.evidenceVersion, routerVersion: input.routerVersion }
}

export function routeMethods(input: RouterInput, options: RouterOptions = {}): RouterOutcome {
  const parsedInput = parseRouterInput(input)
  if (!parsedInput.ok) return refused(input, 'INSUFFICIENT_EVIDENCE', [parsedInput.error])
  const parsedOptions = parseRouterOptions(options)
  if (!parsedOptions.ok) return refused(parsedInput.value, 'INSUFFICIENT_EVIDENCE', [parsedOptions.error])
  return routeMethodsUnchecked(parsedInput.value, parsedOptions.value)
}
