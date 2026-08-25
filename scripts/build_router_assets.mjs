import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { canonicalJson, releaseEvidenceDigest, sha256Hex } from '../app/core/router/release-digest.ts'

export const ROUTER_VERSION = 'router-core-v1'

export async function buildRouterAssets(outputDirectory, sourceDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../data/router')) {
  const read = async (name) => JSON.parse(await readFile(resolve(sourceDirectory, name), 'utf8'))
  const datasets = sortById(await read('datasets.json'))
  const methods = sortById(await read('methods.json'))
  const metrics = sortById(await read('metrics.json'))
  const templates = sortById(await read('config-templates.json'), 'methodId')
  const profiles = sortById(await read('task-profiles.json'))
  const observations = sortObservations(await read('observations.synthetic.json'))
  const meta = await read('release.json')
  const configDigest = sha256Hex(canonicalJson({ methods, templates }))
  const evidenceDigest = releaseEvidenceDigest({ datasets, methods, metrics, observations }, meta, configDigest)
  const release = { ...meta, configDigest, evidenceDigest, routerVersion: ROUTER_VERSION }
  await mkdir(outputDirectory, { recursive: true })
  const files = {
    'catalog.json': { datasets, methods, metrics, templates },
    'profiles.json': profiles,
    'release.json': release,
  }
  for (const group of ['latent_geometry', 'continuity', 'trajectory', 'stability', 'biology', 'resources']) {
    const metricIds = new Set(metrics.filter((metric) => metric.group === group).map((metric) => metric.id))
    files[`observations-${group}.json`] = observations.filter((observation) => metricIds.has(observation.metricId))
  }
  const written = []
  for (const [name, value] of Object.entries(files)) {
    await writeFile(resolve(outputDirectory, name), `${JSON.stringify(value)}\n`)
    written.push(name)
  }
  return written.sort()
}

function sortById(values, key = 'id') {
  return [...values].sort((left, right) => (left[key] < right[key] ? -1 : left[key] > right[key] ? 1 : 0))
}

function sortObservations(values) {
  return [...values].sort((left, right) =>
    left.datasetId < right.datasetId ? -1 : left.datasetId > right.datasetId ? 1
      : left.methodId < right.methodId ? -1 : left.methodId > right.methodId ? 1
        : left.metricId < right.metricId ? -1 : left.metricId > right.metricId ? 1 : 0)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await buildRouterAssets(resolve(dirname(fileURLToPath(import.meta.url)), '../public/router-data'))
}
