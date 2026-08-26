import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { canonicalJson, releaseEvidenceDigest, sha256Hex } from '../../app/core/router/release-digest.ts'
import type {
  BenchmarkObservation,
  DatasetContext,
  EvidenceRelease,
  MethodCapability,
  MetricDefinition,
  RouterInput,
  TaskProfile,
} from '../../app/core/router/types.ts'

const routerDataDirectory = resolve(import.meta.dirname, '../../data/router')

export interface RouterCatalog {
  datasets: DatasetContext[]
  methods: MethodCapability[]
  metrics: MetricDefinition[]
  templates: unknown[]
  profiles: TaskProfile[]
  observations: BenchmarkObservation[]
  release: EvidenceRelease
}

export interface ReleaseBundle {
  datasets: DatasetContext[]
  methods: MethodCapability[]
  metrics: MetricDefinition[]
  observations: BenchmarkObservation[]
  templates: unknown[]
}

export type ReleaseMeta = Pick<EvidenceRelease, 'id' | 'synthetic' | 'description'>

function sortById<T>(values: readonly T[], key: keyof T & string = 'id' as keyof T & string): T[] {
  return [...values].sort((left, right) => {
    const leftKey = String(left[key])
    const rightKey = String(right[key])
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0
  })
}

function sortObservations(values: readonly BenchmarkObservation[]): BenchmarkObservation[] {
  return [...values].sort((left, right) =>
    left.datasetId < right.datasetId ? -1 : left.datasetId > right.datasetId ? 1
      : left.methodId < right.methodId ? -1 : left.methodId > right.methodId ? 1
        : left.metricId < right.metricId ? -1 : left.metricId > right.metricId ? 1 : 0)
}

async function readJson<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(resolve(routerDataDirectory, name), 'utf8')) as T
}

export function bindRelease(bundle: ReleaseBundle, meta: ReleaseMeta): EvidenceRelease {
  const releaseMeta = { id: meta.id, synthetic: meta.synthetic, description: meta.description }
  const configDigest = sha256Hex(canonicalJson({ methods: bundle.methods, templates: bundle.templates }))
  const evidenceDigest = releaseEvidenceDigest(
    {
      datasets: bundle.datasets,
      methods: bundle.methods,
      metrics: bundle.metrics,
      observations: bundle.observations,
    },
    releaseMeta,
    configDigest,
  )
  return { ...releaseMeta, configDigest, evidenceDigest }
}

export async function loadRouterCatalog(): Promise<RouterCatalog> {
  const datasets = sortById(await readJson<DatasetContext[]>('datasets.json'))
  const methods = sortById(await readJson<MethodCapability[]>('methods.json'))
  const metrics = sortById(await readJson<MetricDefinition[]>('metrics.json'))
  const templates = sortById(await readJson<Array<{ methodId: string }>>('config-templates.json'), 'methodId')
  const profiles = sortById(await readJson<TaskProfile[]>('task-profiles.json'))
  const observations = sortObservations(await readJson<BenchmarkObservation[]>('observations.synthetic.json'))
  const meta = await readJson<ReleaseMeta>('release.json')
  return {
    datasets,
    methods,
    metrics,
    templates,
    profiles,
    observations,
    release: bindRelease({ datasets, methods, metrics, observations, templates }, meta),
  }
}

export function buildRouterInput(profile: TaskProfile, catalog: RouterCatalog): RouterInput {
  return {
    profile,
    datasets: catalog.datasets,
    methods: catalog.methods,
    metrics: catalog.metrics,
    observations: catalog.observations,
    routerVersion: 'router-core-v1',
    release: catalog.release,
  }
}
