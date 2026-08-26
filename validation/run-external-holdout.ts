import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadRouterCatalog } from './src/load-catalog.ts'

export const EXTERNAL_HOLDOUT_DATASET_ID = 'gse280270_ucb_tpo'

export interface ExternalHoldoutCatalog {
  datasets: ReadonlyArray<{ id: string; aliases?: readonly string[] }>
  observations: ReadonlyArray<{ datasetId: string }>
}

export interface ExternalHoldoutResult {
  evaluable: false
  reason: 'holdout_evidence_missing'
  datasetId: typeof EXTERNAL_HOLDOUT_DATASET_ID
}

function hasHoldoutEvidence(catalog: ExternalHoldoutCatalog): boolean {
  return catalog.datasets.some((dataset) => (
    dataset.id === EXTERNAL_HOLDOUT_DATASET_ID || (dataset.aliases ?? []).includes(EXTERNAL_HOLDOUT_DATASET_ID)
  )) || catalog.observations.some((row) => row.datasetId === EXTERNAL_HOLDOUT_DATASET_ID)
}

function inventsScore(proposed: Record<string, unknown>): boolean {
  if (proposed.evaluable === true) return true
  if (typeof proposed.score === 'number') return true
  if (typeof proposed.normalizedRegret === 'number') return true
  if (Object.hasOwn(proposed, 'regretDelta')) return true
  if (Object.hasOwn(proposed, 'methodId')) return true
  const invented = proposed.observations
  return Array.isArray(invented) && invented.length > 0
}

export function sealedExternalHoldout(
  catalog: ExternalHoldoutCatalog,
  proposed?: Record<string, unknown>,
): ExternalHoldoutResult {
  if (proposed && inventsScore(proposed)) {
    throw new Error('cannot invent an external holdout score without evidence')
  }
  if (hasHoldoutEvidence(catalog)) {
    throw new Error('gse280270_ucb_tpo must stay absent from the sealed catalog')
  }
  return {
    evaluable: false,
    reason: 'holdout_evidence_missing',
    datasetId: EXTERNAL_HOLDOUT_DATASET_ID,
  }
}

export async function runExternalHoldout(): Promise<ExternalHoldoutResult> {
  const catalog = await loadRouterCatalog()
  const result = sealedExternalHoldout({
    datasets: catalog.datasets,
    observations: catalog.observations,
  })
  const directory = resolve(import.meta.dirname, 'results')
  await mkdir(directory, { recursive: true })
  await writeFile(resolve(directory, 'external-holdout.json'), `${JSON.stringify(result, null, 2)}\n`)
  return result
}

const entry = process.argv[1]
if (entry && fileURLToPath(import.meta.url) === resolve(entry)) {
  await runExternalHoldout()
}
