import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { routeMethods } from '../../app/core/router/index.ts'

const dataDirectory = new URL('../../data/router/', import.meta.url)

function json<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(name, dataDirectory), 'utf8')) as T
}

function executableRegistryInput() {
  return {
    profile: json<Record<string, unknown>[]>('task-profiles.json').find(({ id }) => id === 'quick_trajectory')!,
    datasets: json<unknown[]>('datasets.json'),
    methods: json<Array<Record<string, unknown>>>('methods.json').map((method) => ({ ...method, executable: true })),
    metrics: json<unknown[]>('metrics.json'),
    observations: json<unknown[]>('observations.synthetic.json'),
    evidenceVersion: 'router-evidence-synthetic-v1',
    routerVersion: 'router-core-v1',
    releaseSynthetic: true,
  }
}

function onlyTrajectoryWeights(profile: Record<string, unknown>) {
  return {
    ...profile,
    weights: { latent_geometry: 0, continuity: 0, trajectory: 1, stability: 0, biology: 0, resources: 0 },
  }
}

function unstableFourMethodInput() {
  const base = executableRegistryInput()
  const methodIds = ['alpha', 'beta', 'gamma', 'delta']
  const metricIds = base.metrics.filter((metric) => !metric.auxiliary).map((metric) => metric.id)
  const datasets = [...base.datasets, { ...base.datasets[0], id: 'synthetic_fourth', aliases: [] }]
  const rows = [
    [4, 3, 2, 1],
    [1, 4, 3, 2],
    [2, 1, 4, 3],
    [3, 2, 1, 4],
  ]
  return {
    ...base,
    profile: { ...base.profile, maxResourceTier: 1 },
    datasets: datasets.map((dataset) => ({
      ...dataset,
      studyGroup: 'one-stratum',
      scale: '10k_50k',
      topology: 'bifurcating',
      priors: { time: true },
      perturbation: false,
    })),
    methods: methodIds.map((id) => ({ ...base.methods[0], id, aliases: [], resourceTier: 1 })),
    observations: datasets.flatMap((dataset, datasetIndex) => methodIds.flatMap((methodId, methodIndex) => metricIds.map((metricId) => ({
      datasetId: dataset.id,
      methodId,
      metricId,
      rawValue: rows[datasetIndex][methodIndex],
      provenance: { paperId: 'synthetic-contract-fixture', locator: 'table:S1', datasetVersion: '1', methodVersion: '1.0.0', runConfigId: 'unstable-fixture', extractedAt: '2026-08-23' },
    })))),
  }
}

test('routes canonical multi-method evidence into deterministic Pareto-qualified traceable roles', () => {
  const input = executableRegistryInput()
  const first = routeMethods(input)
  const second = routeMethods(input)

  assert.deepEqual(first, second)
  assert.equal(first.status, 'OK')
  if (first.status !== 'OK') return
  assert.ok(first.recommendations.length >= 1)
  assert.ok(first.recommendations.every((recommendation) => recommendation.paretoLayer === 0))
  assert.deepEqual(
    new Set(first.recommendations.flatMap((recommendation) => recommendation.roles)),
    new Set(['best_fit', 'robust_alternative', 'resource_aware']),
  )
  for (const recommendation of first.recommendations) {
    assert.ok(Number.isFinite(recommendation.outrankingFlow))
    assert.ok(Number.isFinite(recommendation.conservativeUtility))
    assert.ok(recommendation.positiveEvidence.length > 0)
    assert.ok(recommendation.positiveEvidenceDetails.every((detail) => detail.metricIds.length > 0 && detail.datasetIds.length > 0))
    assert.ok(recommendation.positiveEvidenceDetails.every((detail) => detail.synthetic === true))
    assert.ok(recommendation.evidenceLinks.every((link) => link.paperId === 'synthetic-contract-fixture'))
  }
})

test('refuses every public failure state without manufacturing rankings', () => {
  const input = executableRegistryInput()
  const cases = [
    ['no compatible', { ...input, methods: [], observations: [] }, 'NO_COMPATIBLE_METHOD'],
    ['insufficient effective datasets', { ...input, profile: { ...input.profile, minEffectiveDatasets: 99 } }, 'INSUFFICIENT_EVIDENCE'],
    ['critical coverage', { ...input, observations: input.observations.filter((observation) => observation.metricId !== 'trajectory_directionality') }, 'CRITICAL_COVERAGE_GAP'],
    ['unstable top three', { ...unstableFourMethodInput(), options: { minimumTopThreeRetention: 0.9 } }, 'UNSTABLE_TOP_THREE'],
    ['conflicting requirements', { ...input, profile: { ...input.profile, goals: ['fate_decision'], maxResourceTier: 1, priors: { time: false } } }, 'CONFLICTING_REQUIREMENTS'],
  ] as const

  for (const [name, candidate, code] of cases) {
    const { options, ...routerInput } = candidate
    const outcome = routeMethods(routerInput, options)
    assert.equal(outcome.status, 'REFUSED', name)
    if (outcome.status !== 'REFUSED') continue
    assert.equal(outcome.code, code)
    assert.deepEqual(Object.keys(outcome).filter((key) => /rank|flow|utility/i.test(key)), [])
    assert.ok(outcome.evidenceGaps.length > 0)
  }
})

test('fails closed when an input identity is not canonical registry data', () => {
  const input = executableRegistryInput()
  const outcome = routeMethods({
    ...input,
    observations: input.observations.map((observation) => (
      observation.datasetId === 'synthetic_branch_time'
        ? { ...observation, datasetId: 'synthetic-branch-time' }
        : observation
    )),
  })

  assert.equal(outcome.status, 'REFUSED')
  if (outcome.status === 'REFUSED') {
    assert.equal(outcome.code, 'INSUFFICIENT_EVIDENCE')
    assert.match(outcome.evidenceGaps.join('\n'), /canonical|invalid/i)
  }
})

test('accepts one candidate metric observed on two of three eligible datasets at the 0.6 coverage gate', () => {
  const input = executableRegistryInput()
  const missingDatasetId = input.datasets[0].id
  const outcome = routeMethods({
    ...input,
    profile: {
      ...onlyTrajectoryWeights(input.profile),
      candidateMethodIds: ['geometry_vae'],
      minEffectiveDatasets: 1,
      minCriticalCoverage: 0.6,
    },
    observations: input.observations.filter((observation) => !(
      observation.methodId === 'geometry_vae'
      && observation.metricId === 'trajectory_directionality'
      && observation.datasetId === missingDatasetId
    )),
  })

  assert.equal(outcome.status, 'OK')
  if (outcome.status === 'OK') {
    assert.equal(outcome.recommendations[0].methodId, 'geometry_vae')
    assert.equal(outcome.recommendations[0].criticalCoverage, 2 / 3)
  }
})

test('routes with only positively weighted trajectory observations', () => {
  const input = executableRegistryInput()
  const outcome = routeMethods({
    ...input,
    profile: {
      ...onlyTrajectoryWeights(input.profile),
      candidateMethodIds: ['graph_contrastive'],
      minEffectiveDatasets: 1,
    },
    observations: input.observations.filter((observation) => observation.metricId === 'trajectory_directionality'),
  })

  assert.equal(outcome.status, 'OK')
})

test('conditions bootstrap evidence so a distant contradictory dataset cannot overturn the near context', () => {
  const input = executableRegistryInput()
  const baseMethod = input.methods.find((method) => method.id === 'graph_contrastive')!
  const baseDataset = input.datasets[0]
  const profile = {
    ...onlyTrajectoryWeights(input.profile),
    minEffectiveDatasets: 1,
    minCriticalCoverage: 1,
  }
  const datasets = [
    { ...baseDataset, id: 'near', aliases: [], studyGroup: 'near-study', modality: 'scrna' },
    { ...baseDataset, id: 'distant', aliases: [], studyGroup: 'distant-study', modality: 'scatac' },
  ]
  const methods = ['alpha', 'zeta'].map((id) => ({ ...baseMethod, id, aliases: [] }))
  const observations = [
    ['near', 'alpha', 0],
    ['near', 'zeta', 10],
    ['distant', 'alpha', 10],
    ['distant', 'zeta', 0],
  ].map(([datasetId, methodId, rawValue]) => ({
    datasetId,
    methodId,
    metricId: 'trajectory_directionality',
    rawValue,
    provenance: { paperId: 'synthetic-contract-fixture', locator: 'table:S1', datasetVersion: '1', methodVersion: '1.0.0', runConfigId: 'context-fixture', extractedAt: '2026-08-23' },
  }))
  const outcome = routeMethods({ ...input, profile, datasets, methods, observations }, {
    contextFeatureWeights: { modality: 1, scale: 0, topology: 0, priors: 0, perturbation: 0 },
  })

  assert.equal(outcome.status, 'OK')
  if (outcome.status === 'OK') {
    assert.ok(outcome.recommendations.find((recommendation) => recommendation.roles.includes('best_fit'))?.methodId === 'zeta')
  }
})

test('removes a four-method unstable candidate before assigning any role', () => {
  const outcome = routeMethods(unstableFourMethodInput(), { minimumTopThreeRetention: 0.85 })

  assert.equal(outcome.status, 'OK')
  if (outcome.status === 'OK') {
    assert.ok(outcome.recommendations.length > 0)
    assert.ok(outcome.recommendations.every((recommendation) => recommendation.topThreeRetention >= 0.85))
  }
})

test('refuses when qualified candidates have no common observed bootstrap context', () => {
  const input = executableRegistryInput()
  const baseMethod = input.methods.find((method) => method.id === 'graph_contrastive')!
  const methods = ['alpha', 'zeta'].map((id) => ({ ...baseMethod, id, aliases: [] }))
  const profile = {
    ...onlyTrajectoryWeights(input.profile),
    minEffectiveDatasets: 1,
    minCriticalCoverage: 0.3,
  }
  const observations = [
    { ...input.observations.find((observation) => observation.metricId === 'trajectory_directionality')!, datasetId: input.datasets[0].id, methodId: 'alpha' },
    { ...input.observations.find((observation) => observation.metricId === 'trajectory_directionality')!, datasetId: input.datasets[1].id, methodId: 'zeta' },
  ]
  const outcome = routeMethods({ ...input, profile, methods, observations })

  assert.equal(outcome.status, 'REFUSED')
  if (outcome.status === 'REFUSED') {
    assert.equal(outcome.code, 'INSUFFICIENT_EVIDENCE')
    assert.match(outcome.evidenceGaps.join('\n'), /common bootstrap context/i)
  }
})

test('uses explicit releaseSynthetic instead of inferring fixture status from the version string', () => {
  const input = executableRegistryInput()
  for (const releaseSynthetic of [false, true]) {
    const outcome = routeMethods({ ...input, evidenceVersion: 'release-v1', releaseSynthetic })
    assert.equal(outcome.status, 'OK')
    if (outcome.status === 'OK') {
      assert.ok(outcome.recommendations.every((recommendation) => (
        recommendation.positiveEvidenceDetails.every((detail) => detail.synthetic === releaseSynthetic)
        && recommendation.evidenceLinks.every((link) => link.synthetic === releaseSynthetic)
      )))
    }
  }
})

test('accepts exact valid context weights and rejects zero shrinkage alpha by option name', () => {
  const input = executableRegistryInput()
  const valid = routeMethods(input, {
    contextFeatureWeights: { modality: 1, scale: 1, topology: 1, priors: 1, perturbation: 1 },
  })
  assert.equal(valid.status, 'OK')

  const invalid = routeMethods(input, { shrinkageAlpha: 0 })
  assert.equal(invalid.status, 'REFUSED')
  if (invalid.status === 'REFUSED') assert.match(invalid.evidenceGaps.join('\n'), /shrinkageAlpha.*positive/i)
})

test('rejects unknown and malformed Router option fields fail-closed', () => {
  const input = executableRegistryInput()
  const cases = [
    { unknownOption: 1 },
    { bootstrapReplicates: 1.5 },
    { outrankingDelta: -1 },
    { minimumTopThreeRetention: 1.1 },
    { contextFeatureWeights: { modality: 1, scale: 1, topology: 1, priors: 1 } },
    { contextFeatureWeights: { modality: 1, scale: 1, topology: 1, priors: 1, perturbation: 1, extra: 1 } },
  ]
  for (const options of cases) {
    const outcome = routeMethods(input, options)
    assert.equal(outcome.status, 'REFUSED')
    if (outcome.status === 'REFUSED') assert.match(outcome.evidenceGaps.join('\n'), /option/i)
  }
})

test('rejects inherited and accessor-backed public data without invoking accessors', () => {
  const input = executableRegistryInput()
  const inheritedProfile = Object.create(input.profile)
  assert.equal(routeMethods({ ...input, profile: inheritedProfile }).status, 'REFUSED')

  let calls = 0
  const accessorProfile = { ...input.profile }
  Object.defineProperty(accessorProfile, 'seed', { enumerable: true, get() { calls += 1; return 1 } })
  assert.equal(routeMethods({ ...input, profile: accessorProfile }).status, 'REFUSED')
  assert.equal(calls, 0)

  const inheritedDataset = Object.create(input.datasets[0])
  assert.equal(routeMethods({ ...input, datasets: [inheritedDataset, ...input.datasets.slice(1)] }).status, 'REFUSED')
})

test('requires exact own Router input fields and canonical unique candidate IDs', () => {
  const input = executableRegistryInput()
  const { releaseSynthetic: _releaseSynthetic, ...missingReleaseFlag } = input
  const cases = [
    missingReleaseFlag,
    { ...input, unexpected: true },
    { ...input, profile: { ...input.profile, candidateMethodIds: ['geometry_vae', 'geometry_vae'] } },
    { ...input, profile: { ...input.profile, candidateMethodIds: ['unknown_method'] } },
    { ...input, profile: { ...input.profile, candidateMethodIds: ['Geometry VAE'] } },
  ]
  for (const candidate of cases) {
    const outcome = routeMethods(candidate)
    assert.equal(outcome.status, 'REFUSED')
    if (outcome.status === 'REFUSED') assert.match(outcome.evidenceGaps.join('\n'), /invalid|canonical|candidate|releaseSynthetic/i)
  }
})

test('rejects malformed nested registry and provenance records', () => {
  const input = executableRegistryInput()
  const { modality: _modality, ...datasetWithoutModality } = input.datasets[0]
  const { outputs: _outputs, ...methodWithoutOutputs } = input.methods[0]
  const { direction: _direction, ...metricWithoutDirection } = input.metrics[0]
  const observation = input.observations[0]
  const { extractedAt: _extractedAt, ...provenanceWithoutDate } = observation.provenance
  const cases = [
    { ...input, datasets: [datasetWithoutModality, ...input.datasets.slice(1)] },
    { ...input, methods: [methodWithoutOutputs, ...input.methods.slice(1)] },
    { ...input, metrics: [metricWithoutDirection, ...input.metrics.slice(1)] },
    { ...input, observations: [{ ...observation, provenance: provenanceWithoutDate }, ...input.observations.slice(1)] },
  ]
  for (const candidate of cases) assert.equal(routeMethods(candidate).status, 'REFUSED')
})

test('treats observation identity structurally when distinct fields contain NUL characters', () => {
  const input = executableRegistryInput()
  const sourceDataset = input.datasets[0]
  const sourceMethod = input.methods.find((method) => method.id === 'graph_contrastive')!
  const sourceObservation = input.observations.find((observation) => observation.metricId === 'trajectory_directionality')!
  const datasets = [
    { ...sourceDataset, id: 'left\u0000right', aliases: [] },
    { ...sourceDataset, id: 'left', aliases: [] },
  ]
  const methods = [
    { ...sourceMethod, id: 'method', aliases: [] },
    { ...sourceMethod, id: 'right\u0000method', aliases: [] },
  ]
  const observations = [
    { ...sourceObservation, datasetId: 'left\u0000right', methodId: 'method' },
    { ...sourceObservation, datasetId: 'left', methodId: 'right\u0000method' },
  ]
  const distinct = routeMethods({
    ...input,
    profile: {
      ...onlyTrajectoryWeights(input.profile),
      candidateMethodIds: ['method'],
      minEffectiveDatasets: 1,
      minCriticalCoverage: 0.5,
    },
    datasets,
    methods,
    observations,
  })

  assert.equal(distinct.status, 'OK')

  const duplicate = routeMethods({
    ...input,
    profile: {
      ...onlyTrajectoryWeights(input.profile),
      candidateMethodIds: ['method'],
      minEffectiveDatasets: 1,
      minCriticalCoverage: 0.5,
    },
    datasets,
    methods,
    observations: [...observations, { ...observations[0] }],
  })
  assert.equal(duplicate.status, 'REFUSED')
  if (duplicate.status === 'REFUSED') assert.match(duplicate.evidenceGaps.join('\n'), /duplicate canonical observation/)
})

test('aggregates valid multiple runs without weighting coverage or effective datasets by run count', () => {
  const input = executableRegistryInput()
  const profile = {
    ...onlyTrajectoryWeights(input.profile),
    minEffectiveDatasets: 1,
    minCriticalCoverage: 1,
  }
  const original = input.observations.find((observation) => (
    observation.datasetId === 'synthetic_branch_time'
    && observation.methodId === 'graph_contrastive'
    && observation.metricId === 'trajectory_directionality'
  ))!
  const secondRun = {
    ...original,
    provenance: { ...original.provenance, runConfigId: 'fixture-secondary' },
  }
  const baseline = routeMethods({ ...input, profile })
  const appended = routeMethods({ ...input, profile, observations: [...input.observations, secondRun] })
  const prepended = routeMethods({ ...input, profile, observations: [secondRun, ...input.observations] })

  assert.deepEqual(appended, prepended)
  assert.equal(baseline.status, 'OK')
  assert.equal(appended.status, 'OK')
  if (baseline.status !== 'OK' || appended.status !== 'OK') return
  const baselineRecommendation = baseline.recommendations.find(({ methodId }) => methodId === 'graph_contrastive')!
  const multiRunRecommendation = appended.recommendations.find(({ methodId }) => methodId === 'graph_contrastive')!
  assert.equal(multiRunRecommendation.criticalCoverage, 1)
  assert.equal(multiRunRecommendation.effectiveDatasets, baselineRecommendation.effectiveDatasets)
  assert.deepEqual(
    multiRunRecommendation.evidenceLinks
      .filter(({ datasetId, metricId }) => datasetId === original.datasetId && metricId === original.metricId)
      .map(({ runConfigId }) => runConfigId),
    ['fixture-default', 'fixture-secondary'],
  )
})

test('rejects a second run whose provenance method version does not match the canonical method', () => {
  const input = executableRegistryInput()
  const original = input.observations.find((observation) => (
    observation.methodId === 'graph_contrastive'
    && observation.metricId === 'trajectory_directionality'
  ))!
  const outcome = routeMethods({
    ...input,
    profile: onlyTrajectoryWeights(input.profile),
    observations: [...input.observations, {
      ...original,
      provenance: { ...original.provenance, runConfigId: 'fixture-secondary', methodVersion: 'wrong-version' },
    }],
  })

  assert.equal(outcome.status, 'REFUSED')
  if (outcome.status === 'REFUSED') assert.match(outcome.evidenceGaps.join('\n'), /method version mismatch/)
})

test('rejects all-zero context feature weights during Router option validation', () => {
  const outcome = routeMethods(executableRegistryInput(), {
    contextFeatureWeights: { modality: 0, scale: 0, topology: 0, priors: 0, perturbation: 0 },
  })

  assert.equal(outcome.status, 'REFUSED')
  if (outcome.status === 'REFUSED') {
    assert.deepEqual(outcome.evidenceGaps, ['contextFeatureWeights option weights must have a positive total'])
  }
})
